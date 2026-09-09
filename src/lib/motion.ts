import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Motion support helpers.
 *
 * There is no `scroll` event handler anywhere in this codebase (doc 06 section 4).
 * Scroll-linked movement is CSS `animation-timeline: view()` / `scroll()`, which runs
 * on the compositor. Where a browser lacks it, an IntersectionObserver adds a class
 * once — an observer, not a scroll listener.
 */

export function supportsScrollTimeline(): boolean {
  return typeof CSS !== 'undefined' && CSS.supports?.('animation-timeline', 'view()') === true;
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Fallback for `.reveal` / `.reveal-stagger` / `.vine-animated` in browsers without
 * scroll-driven animation. Mounted once by the app; re-scans on navigation.
 * Content is never gated on the animation firing: if there is no observer, every
 * candidate is marked visible immediately.
 */
export function useRevealFallback(): void {
  const location = useLocation();

  useEffect(() => {
    if (supportsScrollTimeline()) return;

    const selector = '.reveal, .reveal-stagger, .vine-animated';
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));

    if (typeof IntersectionObserver === 'undefined') {
      nodes.forEach((node) => node.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    );

    nodes.forEach((node) => {
      if (node.classList.contains('is-visible')) return;
      observer.observe(node);
    });

    return () => observer.disconnect();
  }, [location.pathname, location.search]);
}

/**
 * The public nav condenses past a sentinel placed at the top of the document.
 * IntersectionObserver, so scrolling costs nothing.
 */
export function useNavCondense(): { sentinelRef: React.RefObject<HTMLDivElement | null>; condensed: boolean } {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [condensed, setCondensed] = useState(false);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setCondensed(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { sentinelRef, condensed };
}

/**
 * Counts up to `target` once, on first view. Never on refetch — the ref latch is
 * deliberate. Under reduced motion the final value is returned immediately.
 */
export function useCountUp(target: number, durationMs = 600): {
  ref: React.RefObject<HTMLSpanElement | null>;
  value: number;
} {
  const ref = useRef<HTMLSpanElement | null>(null);
  const hasRun = useRef(false);
  // The final value is the initial value wherever the count-up must not run,
  // so no state is set from inside the effect for those cases.
  const immediate = prefersReducedMotion() || typeof IntersectionObserver === 'undefined';
  const [value, setValue] = useState(() => (immediate ? target : 0));

  useEffect(() => {
    if (hasRun.current || immediate) return;
    const node = ref.current;
    if (!node) return;

    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasRun.current) return;
        hasRun.current = true;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min((now - start) / durationMs, 1);
          // --ease-out, sampled: 1 - (1 - t)^3 is close enough for a counter.
          const eased = 1 - Math.pow(1 - t, 3);
          setValue(target * eased);
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [target, durationMs, immediate]);

  return { ref, value };
}
