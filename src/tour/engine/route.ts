import type { TourId, TourStep } from './types';

/** Which tour belongs to the screen the reader is on. */
export function tourForPath(pathname: string): TourId | null {
  if (pathname.startsWith('/app/winery')) return 'winery';
  if (pathname.startsWith('/app/shop')) return 'shop';
  if (pathname.startsWith('/app/admin')) return 'admin';
  if (pathname.startsWith('/app/collector')) return 'collector';
  if (pathname === '/app' || pathname.startsWith('/app/testnet') || pathname === '/demo') {
    return 'entry';
  }
  return null;
}

/**
 * The screen a step belongs on.
 *
 * Most steps carry no `route` of their own: the step before them navigated, and
 * they simply continue on the same screen. That is fine walking forwards and
 * wrong every other way — a deep link into the middle of a tour, or a resumed
 * run, would otherwise leave the reader on whatever page they happened to open
 * while the card described a different one. Walking back to the last step that
 * named a route answers it for every entry point.
 */
export interface StepRoute {
  path: string;
  match: 'exact' | 'prefix';
  /** False for a parameterised screen the engine cannot construct a path to. */
  navigable: boolean;
}

export function routeForStep(
  steps: readonly TourStep[],
  index: number,
): StepRoute | undefined {
  const own = steps[Math.min(index, steps.length - 1)];
  if (own?.routeScope) return { path: own.routeScope, match: 'prefix', navigable: false };

  for (let i = Math.min(index, steps.length - 1); i >= 0; i -= 1) {
    const step = steps[i];
    if (step?.routeScope) return { path: step.routeScope, match: 'prefix', navigable: false };
    if (step?.route) {
      return { path: step.route, match: step.routeMatch ?? 'prefix', navigable: true };
    }
  }
  return undefined;
}

/**
 * Is the reader still on the screen this step belongs to?
 *
 * Segment-prefixed, not exact. `/app/admin/lots` and `/app/admin/lots/4` are
 * the same screen with a row opened — treating them as different paused the
 * tour the moment a step asked the reader to open a record. The segment check
 * is what stops `/app/winery` from also matching `/app/wineryX`.
 */
export function onRoute(
  pathname: string,
  route: string,
  match: 'exact' | 'prefix' = 'prefix',
): boolean {
  if (pathname === route) return true;
  if (match === 'exact') return false;
  return pathname.startsWith(route.endsWith('/') ? route : `${route}/`);
}
