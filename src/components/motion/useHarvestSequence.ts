import { useEffect, type RefObject } from 'react';

const LAST_FRAME = 275;
// The vineyard (including its baked crossfade) fills chapter 01. Harvest starts
// at source time 2s; the remaining six seconds carry chapters 02 and 03.
const INTRO_END = 143;
const clamp = (n: number) => Math.max(0, Math.min(1, n));

/** A frame is a scroll position, never a time. No playback loop or scroll interception. */
export function useHarvestSequence(
  rootRef: RefObject<HTMLDivElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
) {
  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { alpha: false });
    if (!root || !canvas || !context) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const size = matchMedia('(max-width: 700px)').matches ? 'small' : 'wide';
    const cache = new Map<number, HTMLImageElement>();
    const pending = new Set<number>();
    const failed = new Set<number>();
    let queue: number[] = [];
    let disposed = false;
    let near = false;
    let raf = 0;
    let target = 0;
    let painted = -1;
    let direction = 1;
    let width = 0;
    let height = 0;

    const draw = () => {
      const img = cache.get(target);
      if (!img || disposed || reduced.matches || connection?.saveData) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);
      root.dataset.motion = 'scroll';
      if (painted === target && width === w && height === h) return;
      if (width !== w || height !== h) {
        canvas.width = width = w;
        canvas.height = height = h;
      }
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      context.drawImage(img, (w - img.naturalWidth * scale) / 2,
        (h - img.naturalHeight * scale) / 2, img.naturalWidth * scale, img.naturalHeight * scale);
      painted = target;
      root.dataset.frame = String(target);
    };

    const pump = () => {
      if (disposed || !near || reduced.matches || connection?.saveData) return;
      while (pending.size < 4 && queue.length) {
        const index = queue.shift()!;
        if (cache.has(index) || pending.has(index) || failed.has(index)) continue;
        pending.add(index);
        const img = new Image();
        img.decoding = 'async';
        img.src = `/media/harvest/${size}/${String(index).padStart(3, '0')}.webp?v=2`;
        void img.decode().then(() => {
          if (disposed) return;
          cache.set(index, img);
          // Keep decoded memory bounded, including after fast jumps or direction changes.
          if (cache.size > 32) {
            const farthest = [...cache.keys()].sort((a, b) => Math.abs(b - target) - Math.abs(a - target))[0];
            cache.delete(farthest);
          }
          if (index === target) draw();
        }).catch(() => {
          failed.add(index);
          if (index === target) root.dataset.motion = 'poster';
        }).finally(() => {
          pending.delete(index);
          pump();
        });
      }
    };

    const update = () => {
      raf = 0;
      if (disposed) return;
      const rect = root.getBoundingClientRect();
      const stage = canvas.getBoundingClientRect();
      const progress = clamp((56 - rect.top) / Math.max(1, rect.height - stage.height));
      root.style.setProperty('--harvest-progress', String(progress));
      const intro = 1 - clamp((progress - .27) / .09);
      const outro = clamp((progress - .64) / .1);
      root.style.setProperty('--harvest-intro', String(intro));
      root.style.setProperty('--harvest-middle', String(1 - intro - outro));
      root.style.setProperty('--harvest-outro', String(outro));
      root.dataset.chapter = String(Math.min(2, Math.floor(progress * 3)));
      if (reduced.matches || connection?.saveData) {
        root.dataset.motion = 'poster';
        return;
      }
      const next = Math.round(progress <= 1 / 3
        ? progress * 3 * INTRO_END
        : INTRO_END + (progress - 1 / 3) * 1.5 * (LAST_FRAME - INTRO_END));
      if (next !== target) direction = next > target ? 1 : -1;
      target = next;
      root.dataset.targetFrame = String(target);
      if (!near) return;
      draw();
      // Replace stale work after a jump. Prioritise the exact requested frame.
      queue = [target];
      for (let offset = 1; offset <= 12; offset++) {
        queue.push(target + offset * direction);
        if (offset <= 3) queue.push(target - offset * direction);
      }
      queue = queue.filter((n) => n >= 0 && n <= LAST_FRAME);
      pump();
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => {
      near = entry.isIntersecting;
      if (!near) queue = [];
      schedule();
    }, { rootMargin: '600px' });
    if (observer) observer.observe(root);
    else near = true;
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    resize?.observe(root);
    resize?.observe(canvas);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('pageshow', schedule);
    reduced.addEventListener('change', schedule);
    schedule();
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      resize?.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('pageshow', schedule);
      reduced.removeEventListener('change', schedule);
      queue = [];
      cache.clear();
    };
  }, [rootRef, canvasRef]);
}
