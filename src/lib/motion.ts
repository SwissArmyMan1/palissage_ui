import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';

/** Decorative parallax uses native scroll timelines; section reveals run once. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

const motionQuery = '(prefers-reduced-motion: reduce)';
function subscribeMotion(callback: () => void) {
  const query = window.matchMedia(motionQuery);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}

/** Late lazy routes and fetched cards are observed too. The baseline is visible;
 * only offscreen nodes with an attached observer receive the entrance state. */
export function useRevealFallback(): void {
  const location = useLocation();

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const selector = '.reveal, .reveal-stagger > *, .vine-animated';
    const observed = new Set<Element>();
    const query = window.matchMedia(motionQuery);
    const show = (node: Element) => {
      node.classList.add('is-visible');
      node.classList.remove('reveal-ready');
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            show(entry.target);
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -32px 0px', threshold: 0 },
    );

    const scan = () => {
      document.querySelectorAll<HTMLElement>(selector).forEach((node) => {
        if (observed.has(node) || node.closest('.app-shell')) return;
        observed.add(node);
        const rect = node.getBoundingClientRect();
        if (query.matches || rect.top < window.innerHeight - 32) show(node);
        else {
          node.classList.add('reveal-ready');
          observer.observe(node);
        }
      });
    };
    scan();
    const mutations = new MutationObserver(scan);
    mutations.observe(document.getElementById('root') ?? document.body, {
      childList: true,
      subtree: true,
    });
    const revealAll = () => {
      if (query.matches) {
        observed.forEach(show);
        observer.disconnect();
      }
    };
    const revealFocused = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return;
      observed.forEach((node) => {
        if (node.contains(event.target as Node)) {
          show(node);
          observer.unobserve(node);
        }
      });
    };
    query.addEventListener('change', revealAll);
    document.addEventListener('focusin', revealFocused);
    return () => {
      mutations.disconnect();
      observer.disconnect();
      query.removeEventListener('change', revealAll);
      document.removeEventListener('focusin', revealFocused);
      observed.forEach(show);
    };
  }, [location.pathname]);
}

/**
 * The public nav condenses past a sentinel placed at the top of the document.
 * IntersectionObserver, so scrolling costs nothing.
 */
export function useNavCondense(): {
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  condensed: boolean;
} {
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
export function useCountUp(
  target: number,
  durationMs = 600,
): {
  ref: React.RefObject<HTMLSpanElement | null>;
  value: number;
} {
  const ref = useRef<HTMLSpanElement | null>(null);
  const hasRun = useRef(prefersReducedMotion());
  // The final value is the initial value wherever the count-up must not run,
  // so no state is set from inside the effect for those cases.
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    prefersReducedMotion,
    () => true,
  );
  const immediate =
    reducedMotion || typeof IntersectionObserver === 'undefined';
  const [value, setValue] = useState(() => (immediate ? target : 0));

  useEffect(() => {
    const query = window.matchMedia(motionQuery);
    const finish = () => {
      if (query.matches) {
        hasRun.current = true;
        setValue(target);
      }
    };
    query.addEventListener('change', finish);
    return () => query.removeEventListener('change', finish);
  }, [target]);

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

  return { ref, value: immediate ? target : value };
}
