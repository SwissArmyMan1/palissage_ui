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
  /** What counts as being on this step's screen. */
  path: string;
  match: 'exact' | 'prefix';
  /**
   * Where to send a reader who is somewhere else.
   *
   * Not always the same as `path`: a scoped step lives on a parameterised
   * screen the engine cannot construct a path to, so it sends the reader to
   * the last screen that *is* addressable and lets them open the record
   * themselves. Undefined when there is nowhere sensible to go.
   */
  navigateTo?: string;
}

export function routeForStep(
  steps: readonly TourStep[],
  index: number,
): StepRoute | undefined {
  const at = Math.min(index, steps.length - 1);

  // The nearest addressable screen at or before this step.
  let navigateTo: string | undefined;
  for (let i = at; i >= 0; i -= 1) {
    if (steps[i]?.route) {
      navigateTo = steps[i].route;
      break;
    }
  }

  const own = steps[at];
  if (own?.routeScope) return { path: own.routeScope, match: 'prefix', navigateTo };

  for (let i = at; i >= 0; i -= 1) {
    const step = steps[i];
    if (step?.routeScope) return { path: step.routeScope, match: 'prefix', navigateTo };
    if (step?.route) {
      return { path: step.route, match: step.routeMatch ?? 'prefix', navigateTo };
    }
  }
  return undefined;
}

export function onRoute(
  pathname: string,
  route: string,
  match: 'exact' | 'prefix' = 'prefix',
): boolean {
  if (pathname === route) return true;
  if (match === 'exact') return false;
  return pathname.startsWith(route.endsWith('/') ? route : `${route}/`);
}
