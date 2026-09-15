import { Suspense, lazy, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { RoleKey } from '@/chain/roles';
import { beginSimulation, endSimulation, sandboxActive } from '@/sandbox';
import { TourContext, type TourContextValue } from './context';
import { onRoute, routeForStep, tourForPath } from './engine/route';
import { initialTourState, reduceTour } from './engine/machine';
import {
  forgetRun,
  hasCompleted,
  loadRuns,
  readDeepLink,
  saveRun,
} from './engine/persistence';
import {
  visibleSteps,
  type TourDefinition,
  type TourId,
  type TourMode,
  type TourStep,
} from './engine/types';

const TourRunner = lazy(() => import('./ui/TourRunner'));
const TourLauncher = lazy(() => import('./ui/TourLauncher'));

/**
 * Nothing but this provider and a button ship in the initial bundle. The
 * engine, the card, the spotlight and every step definition are dynamic
 * imports, loaded the moment a reader asks for a tour and not before.
 */
const DEFINITIONS: Record<TourId, () => Promise<{ default: TourDefinition }>> = {
  entry: () => import('./tours/entry.tour'),
  winery: () => import('./tours/winery.tour'),
  shop: () => import('./tours/shop.tour'),
  admin: () => import('./tours/admin.tour'),
  collector: () => import('./tours/collector.tour'),
};

const ROLE_OF: Record<TourId, RoleKey | null> = {
  entry: null,
  winery: 'winery',
  shop: 'shop',
  admin: 'admin',
  collector: 'collector',
};

export function TourProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [definition, setDefinition] = useState<TourDefinition | null>(null);
  const [launcherRole, setLauncherRole] = useState<RoleKey | null | 'closed'>('closed');
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const deepLinkHandled = useRef(false);
  /** The route this tour asked for and is still waiting to land on. */
  const pendingRoute = useRef<string | null>(null);

  const [state, rawDispatch] = useReducer(reduceTour, initialTourState);

  const steps = useMemo<TourStep[]>(
    () => (definition ? visibleSteps(definition, state.mode) : []),
    [definition, state.mode],
  );

  const step = state.tourId && state.status !== 'idle' ? (steps[state.stepIndex] ?? null) : null;
  // Memoised so the effects below can depend on it directly: `routeForStep`
  // builds a fresh object, and an inline call would re-arm them every render.
  const stepRoute = useMemo(
    () => (step ? routeForStep(steps, state.stepIndex) : undefined),
    [step, steps, state.stepIndex],
  );

  const start = useCallback((tourId: TourId, mode: TourMode, stepId?: string) => {
    void (async () => {
      const loaded = (await DEFINITIONS[tourId]()).default;
      const role = ROLE_OF[tourId] ?? 'winery';
      if (mode === 'sim' && !sandboxActive()) await beginSimulation(role);
      const list = visibleSteps(loaded, mode);
      setDefinition(loaded);
      const index = stepId ? Math.max(0, list.findIndex((entry) => entry.id === stepId)) : 0;
      rawDispatch({ type: 'start', tourId, mode, stepCount: list.length, stepIndex: index });
      setLauncherRole('closed');
    })();
  }, []);

  const exit = useCallback(() => {
    if (state.tourId) forgetRun(state.tourId);
    rawDispatch({ type: 'exit' });
    setDefinition(null);
    if (sandboxActive()) void endSimulation();
  }, [state.tourId]);

  const next = useCallback(() => rawDispatch({ type: 'next' }), []);
  const back = useCallback(() => rawDispatch({ type: 'back' }), []);
  const resume = useCallback(() => rawDispatch({ type: 'resume' }), []);

  /* ---- persistence ---------------------------------------------------- */
  useEffect(() => {
    if (!state.tourId || state.status === 'idle') return;
    saveRun(state, steps[state.stepIndex]?.id ?? '');
  }, [state, steps]);

  /* ---- the tour's own route ------------------------------------------- */
  useEffect(() => {
    if (state.status !== 'running' || !stepRoute) return;
    if (onRoute(location.pathname, stepRoute.path, stepRoute.match)) {
      pendingRoute.current = null;
      return;
    }
    // A scoped step names where it lives, not somewhere to go.
    if (!stepRoute.navigable) return;
    pendingRoute.current = stepRoute.path;
    navigate(stepRoute.path);
    // The step owns the navigation on entry only; leaving is the reader's.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id, state.status, stepRoute]);

  /**
   * Leaving the step's route pauses rather than navigating back. `BrowserRouter`
   * is not a data router, so `useBlocker` does not exist here — and yanking a
   * reader to where the script wants them is what makes a tour feel like a cage.
   *
   * `pendingRoute` is what separates "the reader walked away" from "the tour's
   * own navigation has not landed yet". Cabinet routes are lazy chunks, and
   * React Router keeps the committed location on the old path until the chunk
   * resolves — so without this the tour paused itself a few hundred
   * milliseconds after asking to move, every single time.
   */
  useEffect(() => {
    if (state.status !== 'running' || !stepRoute) return;
    if (onRoute(location.pathname, stepRoute.path, stepRoute.match)) {
      pendingRoute.current = null;
      return;
    }
    if (pendingRoute.current === stepRoute.path) return;
    const timer = window.setTimeout(() => rawDispatch({ type: 'pause' }), 400);
    return () => window.clearTimeout(timer);
  }, [location.pathname, state.status, stepRoute]);

  /* ---- deep link: ?tour=winery&step=publish-offer ---------------------- */
  useEffect(() => {
    if (deepLinkHandled.current) return;
    deepLinkHandled.current = true;
    const link = readDeepLink(window.location.search);
    // `bootSimulationFromUrl` has already seeded the world for this link; the
    // `sandboxActive` check inside `start` is what stops it being reseeded.
    if (link) start(link.tourId, 'sim', link.stepId);
  }, [start]);

  const offered = tourForPath(location.pathname);

  const value = useMemo<TourContextValue>(
    () => ({
      state,
      definition,
      steps,
      step,
      offered,
      showBeacon:
        offered !== null &&
        state.status === 'idle' &&
        !dismissed[offered] &&
        !hasCompleted(offered) &&
        !loadRuns()[offered],
      start,
      next,
      back,
      resume,
      exit,
      openLauncher: (role) => setLauncherRole(role ?? null),
      closeLauncher: () => setLauncherRole('closed'),
      dismissOffer: () => {
        if (offered) setDismissed((d) => ({ ...d, [offered]: true }));
      },
    }),
    [state, definition, steps, step, offered, dismissed, start, next, back, resume, exit],
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      <Suspense fallback={null}>
        {state.status !== 'idle' && definition ? <TourRunner /> : null}
        {launcherRole !== 'closed' ? <TourLauncher role={launcherRole} /> : null}
      </Suspense>
    </TourContext.Provider>
  );
}
