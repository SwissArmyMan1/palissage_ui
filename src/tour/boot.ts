import type { RoleKey } from '@/chain/roles';
import { startSimulation } from '@/sandbox/store';
import { readDeepLink } from './engine/persistence';
import type { TourId } from './engine/types';

const ROLE_OF: Record<TourId, RoleKey> = {
  entry: 'winery',
  winery: 'winery',
  shop: 'shop',
  admin: 'admin',
  collector: 'collector',
};

/**
 * Starts the simulated world before the first render when the URL asks for a
 * tour.
 *
 * Without this the page mounts, issues its own reads against Base, and only
 * then does the tour's effect switch the simulation on — so a deep-linked demo
 * fires a real request or two before going quiet. Seeding here closes that
 * window, which is what makes "a simulation generates no network traffic" true
 * rather than nearly true.
 */
export function bootSimulationFromUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const link = readDeepLink(window.location.search);
  if (!link) return false;
  startSimulation(ROLE_OF[link.tourId]);
  return true;
}
