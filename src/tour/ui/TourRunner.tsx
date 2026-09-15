import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useLocale } from '@/lib/i18n/context';
import { useIsCompact } from '@/lib/media';
import { prefersReducedMotion } from '@/lib/motion';
import { Button } from '@/components/ui/Button';
import { onSandboxEvent } from '@/sandbox/events';
import { useTour } from '../context';
import { scrollAnchorIntoView, waitForAnchor } from '../engine/anchor';
import { closeDrawer } from '../engine/shell';
import { targetSelector } from '../engine/targets';
import { CoachMark } from './CoachMark';
import { CompletionCard } from './CompletionCard';
import { Spotlight } from './Spotlight';

/**
 * The running tour: resolve the anchor, get it on screen, arm whatever ends the
 * step, and draw the two pieces of chrome.
 *
 * Every failure here degrades rather than stops. An anchor that never appears
 * leaves an un-anchored card the reader can still read and skip; a step whose
 * event never fires still has Back and Exit.
 */
/**
 * How long a waiting step may look stuck before it offers a way past itself.
 * Long enough not to compete with the instruction, short enough that a reader
 * who has genuinely hit a wall is not left staring at it.
 */
const STALL_GRACE_MS = 10_000;

export default function TourRunner() {
  const { state, definition, steps, step, next, back, exit, resume } = useTour();
  const { t } = useLocale();
  const compact = useIsCompact();
  const location = useLocation();
  // Keyed by step id, so a resolved anchor can never leak into the next step.
  const [resolved, setResolved] = useState<{ stepId: string; el: HTMLElement | null } | null>(null);
  const entryPath = useRef(location.pathname);
  /**
   * A step advances once **per visit**. Two rules can fire for the same step —
   * a route change and the press on the anchor that caused it — and without
   * this the tour would skip the step after the one the reader completed.
   * Keyed to the visit and not to the step id, because pressing Back returns to
   * a step that has already been completed once and must be completable again.
   */
  const advanced = useRef<string | null>(null);
  /**
   * Which step the rules below are allowed to complete.
   *
   * Every rule can fire late — a timer, a sandbox event, a polling predicate —
   * and a late call belongs to the step that armed it, not to the one on
   * screen. Without this check a deferred advance from the previous step skips
   * the next one, which is how pressing Back could land two steps forward.
   */
  const currentStepId = useRef<string | null>(null);
  /** Set when a waiting step has no way left to satisfy itself. */
  const [stalledFor, setStalledFor] = useState<string | null>(null);

  // On a phone a step may point somewhere else, say something else, and end
  // differently — see `TourStep.mobile`.
  const override = compact ? step?.mobile : undefined;
  const anchorId = step ? (override?.anchor ?? step.anchor) : null;
  const advance = step ? (override?.advance ?? step.advance) : null;
  const body = step ? (override?.body ?? step.body) : '';
  const anchor = resolved && step && resolved.stepId === step.id ? resolved.el : null;
  const searching = Boolean(step) && anchorId !== 'center' && resolved?.stepId !== step?.id;
  const waiting = Boolean(advance && advance.kind !== 'next');
  const stalled = Boolean(step && stalledFor === step.id);
  /**
   * A waiting step says what it is waiting for, and the two kinds are not the
   * same. `click` and `route` wait for the reader. `event` and `predicate` wait
   * for the world — a write to land, an operator to look at a lot — and telling
   * the reader to press the highlighted control on one of those is a lie: the
   * ring is around a region, there is nothing in it to press, and a reader who
   * tries and fails concludes the tour is broken.
   */
  const waitLabel =
    step?.waitLabel ??
    (advance && (advance.kind === 'event' || advance.kind === 'predicate')
      ? 'Waiting for this to happen'
      : 'Press the highlighted control');

  const advanceOnce = useCallback(
    (stepId: string) => {
      if (currentStepId.current !== stepId) return;
      if (advanced.current === stepId) return;
      advanced.current = stepId;
      next();
    },
    [next],
  );

  /* ---- resolve the anchor, then bring it into view --------------------- */
  useEffect(() => {
    if (!step || !anchorId || state.status !== 'running') return;
    // Closed first, every time: a drawer opened for one step covers the tab bar
    // the next one points at. Only a step that anchors inside it asks it back.
    closeDrawer();
    step.onEnter?.();

    const stepId = step.id;
    if (anchorId === 'center') {
      // Nothing to point at: record the resolution so `searching` clears.
      queueMicrotask(() => setResolved({ stepId, el: null }));
      return;
    }

    const controller = new AbortController();
    const selector = targetSelector(anchorId);
    let current: HTMLElement | null = null;
    let looking = false;

    const resolve = (first: boolean) => {
      if (looking) return;
      looking = true;
      void waitForAnchor(selector, controller.signal).then((node) => {
        looking = false;
        if (controller.signal.aborted) return;
        current = node;
        setResolved({ stepId, el: node });
        // Only the first resolution scrolls. A replacement is the screen's own
        // doing — the wizard moving to its next pane scrolls itself to the top —
        // and yanking the reader back down to the anchor would fight them.
        if (node && first) {
          scrollAnchorIntoView(node, compact ? 0.32 : 0.5, prefersReducedMotion());
        }
      });
    };

    resolve(true);

    /**
     * A screen can replace the element the step points at without changing
     * route. The create-lot wizard keys its pane on the wizard step, so moving
     * from Wine to Quantity tears out the very node the tour is holding — and
     * the wizard step lives in the query string, which this effect does not
     * watch. The tour was then ringing a detached node: `getBoundingClientRect`
     * on one returns zeroes, so the ring collapsed to a dot in the top-left
     * corner and the sheet, which refuses to measure against a detached anchor,
     * stayed parked over the page. Watch for it leaving and resolve again.
     */
    const watcher = new MutationObserver(() => {
      if (controller.signal.aborted) return;
      if (current && !current.isConnected) {
        current = null;
        resolve(false);
      }
    });
    watcher.observe(document.body, { childList: true, subtree: true });

    return () => {
      controller.abort();
      watcher.disconnect();
    };
    // `location.pathname` is a dependency on purpose: a step can span a list and
    // the record it opens, and the control it points at only exists on one of
    // them. Without this the anchor was resolved once, on the wrong screen.
  }, [step, anchorId, compact, state.status, location.pathname]);

  useEffect(() => {
    entryPath.current = location.pathname;
    advanced.current = null;
    currentStepId.current = step?.id ?? null;
    // Only when the step changes: the entry path is what a route rule compares
    // against, and the once-guard belongs to this visit. Declared before the
    // rules below so it is reset before any of them can fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id]);

  /* ---- what ends the step --------------------------------------------- */
  useEffect(() => {
    if (!step || !advance || state.status !== 'running') return;
    const rule = advance;

    const stepId = step.id;

    /**
     * `click` and `route` both end on the reader pressing the ringed control,
     * so both listen for it. A route rule cannot rely on the navigation alone:
     * pressing a nav link for the page you are already on changes nothing, and
     * the step would then wait for an event that can never arrive. That is what
     * dead-ended the tour after Back.
     */
    if (rule.kind === 'click' || rule.kind === 'route') {
      if (!anchor) return;
      // The delay lets the press do its own work — navigate, open a drawer —
      // before the tour moves on. It is cleared on cleanup: a pending advance
      // that outlives its step would skip the next one.
      let timer = 0;
      const onClick = () => {
        timer = window.setTimeout(() => advanceOnce(stepId), 150);
      };
      anchor.addEventListener('click', onClick, { once: true });
      return () => {
        window.clearTimeout(timer);
        anchor.removeEventListener('click', onClick);
      };
    }

    if (rule.kind === 'event') {
      return onSandboxEvent((event) => {
        if (event.name === rule.event) advanceOnce(stepId);
      });
    }

    if (rule.kind === 'predicate') {
      const timer = window.setInterval(() => {
        if (rule.check()) advanceOnce(stepId);
      }, rule.pollMs ?? 400);
      return () => window.clearInterval(timer);
    }
  }, [step, advance, anchor, advanceOnce, state.status]);

  // A route rule is checked on render rather than in a listener, because the
  // router is the source of truth and it already re-renders on every change.
  useEffect(() => {
    if (!step || advance?.kind !== 'route' || state.status !== 'running') return;
    const target = advance.path;
    const matches = advance.exact
      ? location.pathname === target
      : location.pathname.startsWith(target);
    if (matches && location.pathname !== entryPath.current) advanceOnce(step.id);
  }, [location.pathname, step, advance, advanceOnce, state.status]);

  /**
   * A waiting step must always have a way out.
   *
   * Two cases produce one that does not: a route rule whose condition is
   * already true when the step begins (press Back and you are still on the
   * page the step asked you to open), and an event rule for something that has
   * already happened and will not happen twice. Both are reachable with Back,
   * which is a normal thing to press.
   *
   * The first is offered a way forward immediately, because the reader has in
   * fact done the thing. Anything else waits out a grace period first, so the
   * escape hatch never competes with the instruction.
   */
  useEffect(() => {
    if (!step || !waiting || state.status !== 'running') return;
    const stepId = step.id;
    const rule = advance;
    if (!rule) return;
    /**
     * Two ways to know a step cannot complete itself. The reader is behind the
     * furthest point this run reached, so they pressed Back onto something they
     * already did — an event rule for a write that has happened will not fire
     * twice. Or it is a route rule and the location already matches, so the
     * change it waits for cannot occur.
     */
    const revisiting = state.stepIndex < state.furthest;
    const alreadySatisfied =
      rule.kind === 'route' &&
      location.pathname === entryPath.current &&
      (rule.exact ? location.pathname === rule.path : location.pathname.startsWith(rule.path));
    const timer = window.setTimeout(
      () => setStalledFor(stepId),
      revisiting || alreadySatisfied ? 0 : (step.stallAfterMs ?? STALL_GRACE_MS),
    );
    return () => window.clearTimeout(timer);
    // Deliberately keyed to the step, not to every navigation: the entry path is
    // what decides this, and it is fixed for the life of the step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id, advance, waiting, state.status, state.stepIndex, state.furthest]);

  /* ---- keyboard -------------------------------------------------------- */
  useEffect(() => {
    if (state.status === 'idle') return;
    const onKey = (event: KeyboardEvent) => {
      // A native dialog owns Escape first; the browser closes it for us.
      if (event.key === 'Escape') {
        if (document.querySelector('dialog[open]')) return;
        event.preventDefault();
        exit();
        return;
      }
      if (event.target instanceof HTMLElement) {
        const tag = event.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target.isContentEditable) return;
      }
      if (event.key === 'ArrowRight' && (!waiting || stalled)) next();
      if (event.key === 'ArrowLeft') back();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [state.status, waiting, stalled, next, back, exit]);

  if (!definition || !step) return null;

  if (state.status === 'completed') {
    return <CompletionCard completion={definition.completion} onClose={exit} />;
  }

  if (state.status === 'paused') {
    return (
      <div
        role="dialog"
        aria-label={t('Tour paused')}
        className="fixed inset-x-4 bottom-4 z-[var(--z-tour-card)] mx-auto max-w-sm rounded-lg border border-edge-subtle bg-surface-overlay p-4 shadow-2 sm:inset-x-auto sm:right-6"
      >
        <p className="text-body-sm text-ink">
          {t('You left the tour at step {current}.', { current: state.stepIndex + 1 })}
        </p>
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={resume}>
            {t('Back to the step')}
          </Button>
          <Button size="sm" kind="ghost" onClick={exit}>
            {t('Exit the tour')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {step.spotlight === 'none' ? null : (
        <Spotlight anchor={anchor} act={waiting} blocking={step.spotlight !== 'passive'} />
      )}
      <CoachMark
        key={step.id}
        step={step}
        body={body}
        index={state.stepIndex}
        total={steps.length}
        anchor={anchor}
        compact={compact}
        waiting={waiting && !searching}
        waitLabel={waitLabel}
        stalled={stalled}
        onNext={next}
        onBack={back}
        onExit={exit}
      />
      {/* Announced once per step, and only where focus did not already carry the
          text: on an act step the anchor is aria-describedby the same body. */}
      {!waiting ? (
        <div aria-live="polite" className="sr-only">
          {t('Step {current} of {total}. {body}', {
            current: state.stepIndex + 1,
            total: steps.length,
            body: t(body),
          })}
        </div>
      ) : null}
    </>
  );
}
