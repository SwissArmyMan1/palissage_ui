import { useCallback, useSyncExternalStore } from 'react';

/**
 * Viewport queries are for structural change only — see doc 06 §1.
 *
 * `useSyncExternalStore` rather than state plus an effect: a media query *is*
 * an external store, and reading it this way avoids the resync render that a
 * `setState` inside an effect causes.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Below 640 px a modal dialog becomes a bottom sheet. */
export const useIsCompact = () => useMediaQuery('(max-width: 639px)');
/** Below 1024 px the persistent sidebar becomes a drawer, then a tab bar. */
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');
