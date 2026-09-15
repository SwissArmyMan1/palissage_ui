import type { TourAction, TourState } from './types';

/**
 * The whole tour, as a reducer. No React, no DOM, no timers — so the step graph
 * is testable without a browser, and a bug in the sequence is a failing unit
 * test rather than something you find by clicking.
 *
 * The step count lives in the state rather than being handed in per call: the
 * visible steps depend on the mode, the mode only changes by starting again,
 * and a reducer that reads a ref is a reducer that is not pure.
 */
export const initialTourState: TourState = {
  status: 'idle',
  tourId: null,
  stepIndex: 0,
  stepCount: 0,
  furthest: 0,
  mode: 'sim',
  startedAt: null,
};

export function reduceTour(state: TourState, action: TourAction): TourState {
  const stepCount = action.type === 'start' ? action.stepCount : state.stepCount;

  switch (action.type) {
    case 'start': {
      const index = clamp(action.stepIndex ?? 0, stepCount);
      return {
        status: 'running',
        tourId: action.tourId,
        mode: action.mode,
        stepCount,
        stepIndex: index,
        furthest: index,
        startedAt: Date.now(),
      };
    }

    case 'next': {
      if (state.status !== 'running') return state;
      const next = state.stepIndex + 1;
      if (next >= stepCount) return { ...state, status: 'completed', furthest: stepCount - 1 };
      return { ...state, stepIndex: next, furthest: Math.max(state.furthest, next) };
    }

    case 'back':
      if (state.status !== 'running' && state.status !== 'paused') return state;
      return { ...state, status: 'running', stepIndex: Math.max(0, state.stepIndex - 1) };

    case 'goto': {
      if (state.tourId === null) return state;
      const index = clamp(action.index, stepCount);
      return {
        ...state,
        status: 'running',
        stepIndex: index,
        furthest: Math.max(state.furthest, index),
      };
    }

    /**
     * Leaving the step's route pauses rather than navigating back. Yanking a
     * reader to where the script wants them is the thing that makes a tour feel
     * like a cage.
     */
    case 'pause':
      return state.status === 'running' ? { ...state, status: 'paused' } : state;

    case 'resume':
      return state.status === 'paused' ? { ...state, status: 'running' } : state;

    case 'complete':
      return state.status === 'idle' ? state : { ...state, status: 'completed' };

    case 'exit':
      return { ...initialTourState, mode: state.mode };

    default:
      return state;
  }
}

function clamp(index: number, count: number): number {
  if (count <= 0) return 0;
  return Math.min(Math.max(index, 0), count - 1);
}

export function isActive(state: TourState): boolean {
  return state.status === 'running' || state.status === 'paused';
}
