import type { TourId, TourMode, TourState, TourStatus } from './types';

/**
 * A reader who reloads mid-tour should come back to the step they were on. A
 * reader who finished one three weeks ago should not be offered it again.
 */

const KEY = 'palissage.tour.v1';
const RESUME_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface StoredRun {
  tourId: TourId;
  stepId: string;
  stepIndex: number;
  mode: TourMode;
  status: TourStatus;
  updatedAt: number;
}

type Store = Record<string, StoredRun>;

function read(): Store {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    // A blocked or full localStorage must not stop the tour running.
    return {};
  }
}

function write(store: Store): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

export function saveRun(state: TourState, stepId: string): void {
  if (!state.tourId) return;
  const store = read();
  store[state.tourId] = {
    tourId: state.tourId,
    stepId,
    stepIndex: state.stepIndex,
    mode: state.mode,
    status: state.status,
    updatedAt: Date.now(),
  };
  write(store);
}

export function loadRuns(): Store {
  return read();
}

/** The one run worth offering to resume, if any. */
export function resumableRun(): StoredRun | null {
  const runs = Object.values(read())
    .filter((run) => run.status === 'running' || run.status === 'paused')
    .filter((run) => Date.now() - run.updatedAt < RESUME_WINDOW_MS)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  return runs[0] ?? null;
}

export function hasCompleted(tourId: TourId): boolean {
  return read()[tourId]?.status === 'completed';
}

export function forgetRun(tourId: TourId): void {
  const store = read();
  delete store[tourId];
  write(store);
}

/** `?tour=winery&step=publish-offer` — used by the docs and the demo page. */
export function readDeepLink(search: string): { tourId: TourId; stepId?: string } | null {
  const params = new URLSearchParams(search);
  const tourId = params.get('tour');
  if (!tourId) return null;
  const known: TourId[] = ['entry', 'winery', 'shop', 'admin', 'collector'];
  if (!known.includes(tourId as TourId)) return null;
  return { tourId: tourId as TourId, stepId: params.get('step') ?? undefined };
}
