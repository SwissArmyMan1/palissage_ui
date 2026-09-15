import { createContext, useContext } from 'react';
import { initialTourState } from './engine/machine';
import type { RoleKey } from '@/chain/roles';
import type {
  TourDefinition,
  TourId,
  TourMode,
  TourState,
  TourStep,
} from './engine/types';

export interface TourContextValue {
  state: TourState;
  definition: TourDefinition | null;
  steps: TourStep[];
  step: TourStep | null;
  /** The tour that fits the route the reader is on, whether or not it has run. */
  offered: TourId | null;
  /** False once the reader has started or dismissed every tour on offer. */
  showBeacon: boolean;
  start: (tourId: TourId, mode: TourMode, stepId?: string) => void;
  next: () => void;
  back: () => void;
  resume: () => void;
  exit: () => void;
  openLauncher: (role?: RoleKey | null) => void;
  closeLauncher: () => void;
  dismissOffer: () => void;
}

const noop = () => {};

export const TourContext = createContext<TourContextValue>({
  state: initialTourState,
  definition: null,
  steps: [],
  step: null,
  offered: null,
  showBeacon: false,
  start: noop,
  next: noop,
  back: noop,
  resume: noop,
  exit: noop,
  openLauncher: noop,
  closeLauncher: noop,
  dismissOffer: noop,
});

export function useTour(): TourContextValue {
  return useContext(TourContext);
}
