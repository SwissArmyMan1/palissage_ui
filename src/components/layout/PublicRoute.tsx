import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const positions = new Map<string, number>();

/** Animate the existing outlet without remounting providers, wallets or forms. */
export function PublicRoute({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const previousPath = useRef<string | null>(null);
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    const previous = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    return () => {
      history.scrollRestoration = previous;
    };
  }, []);

  useLayoutEffect(() => {
    const main = ref.current;
    const changed =
      previousPath.current !== null &&
      previousPath.current !== location.pathname;
    previousPath.current = location.pathname;
    let animation: Animation | undefined;
    let resizeObserver: ResizeObserver | undefined;

    if (main && changed) {
      main.focus({ preventScroll: true });
      const destination = location.hash
        ? document.getElementById(location.hash.slice(1))
        : null;
      if (destination) destination.scrollIntoView({ behavior: 'instant' });
      else {
        const top =
          navigationType === 'POP' ? (positions.get(location.key) ?? 0) : 0;
        const restore = () => {
          window.scrollTo({ top, behavior: 'instant' });
          if (Math.abs(window.scrollY - top) < 2) resizeObserver?.disconnect();
        };
        restore();
        // A lazy route may initially be shorter than its saved position.
        if (top > window.scrollY + 2 && typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(restore);
          resizeObserver.observe(main);
        }
      }

      const query = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (!query.matches && typeof main.animate === 'function') {
        animation = main.animate(
          [
            { opacity: 0.35, transform: 'translateY(12px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ],
          { duration: 380, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        );
      }
    }

    const stopMotion = () => animation?.cancel();
    // Capture while this page is still present. Effect cleanup runs after DOM
    // replacement, when a shorter destination may already clamp scrollY.
    const rememberPosition = () => {
      // A Suspense fallback can clamp the old page after history changes but
      // before React cleans up this listener. Do not save that clamped value.
      if ((history.state?.key ?? 'default') === location.key) {
        positions.set(location.key, window.scrollY);
      }
    };
    const stopRestoring = () => resizeObserver?.disconnect();
    window.addEventListener('wheel', stopRestoring, { passive: true });
    window.addEventListener('touchstart', stopRestoring, { passive: true });
    window.addEventListener('keydown', stopRestoring);
    window.addEventListener('scroll', rememberPosition, { passive: true });
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    query.addEventListener('change', stopMotion);
    return () => {
      window.removeEventListener('scroll', rememberPosition);
      window.removeEventListener('wheel', stopRestoring);
      window.removeEventListener('touchstart', stopRestoring);
      window.removeEventListener('keydown', stopRestoring);
      resizeObserver?.disconnect();
      // Bound the cache during long browsing sessions.
      if (positions.size > 80) positions.delete(positions.keys().next().value!);
      query.removeEventListener('change', stopMotion);
      animation?.cancel();
    };
  }, [location.key, location.pathname, location.hash, navigationType]);

  return (
    <main
      ref={ref}
      id="main"
      tabIndex={-1}
      className="public-route outline-none"
    >
      {children}
    </main>
  );
}
