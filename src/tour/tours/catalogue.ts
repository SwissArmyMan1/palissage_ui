import type { RoleKey } from '@/chain/roles';
import type { TourId } from '../engine/types';

/**
 * What the launcher lists, without importing a single step.
 *
 * The definitions are the heavy part and they load only once a tour starts —
 * so this table exists to keep the launcher's cost to a few hundred bytes.
 * `steps` is the number the reader is promised; a definition that drifts from
 * it is caught by `scripts/check-tour-targets.mjs`.
 */
export interface TourSummary {
  id: TourId;
  role: RoleKey | null;
  title: string;
  purpose: string;
  steps: number;
  /** Where the tour starts, so the launcher can send the reader there. */
  route: string;
}

export const CATALOGUE: TourSummary[] = [
  {
    id: 'entry',
    role: null,
    title: 'Getting in',
    purpose: 'What a role is, and what the three readiness checks actually mean.',
    steps: 4,
    route: '/app',
  },
  {
    id: 'winery',
    role: 'winery',
    title: 'Winery',
    purpose: 'Create a lot, watch an operator verify it, publish an offer.',
    steps: 8,
    route: '/app/winery',
  },
  {
    id: 'shop',
    role: 'shop',
    title: 'Shop',
    purpose: 'Reserve an allocation, settle it, take delivery.',
    steps: 7,
    route: '/app/shop',
  },
  {
    id: 'admin',
    role: 'admin',
    title: 'Operations',
    purpose: 'Verify a lot, release a milestone, follow a redemption.',
    steps: 6,
    route: '/app/admin',
  },
  {
    id: 'collector',
    role: 'collector',
    title: 'Collector',
    purpose: 'Read what you hold, and what a collector deliberately cannot do.',
    steps: 4,
    route: '/app/collector',
  },
];

export function summaryOf(id: TourId): TourSummary {
  return CATALOGUE.find((entry) => entry.id === id) ?? CATALOGUE[0];
}
