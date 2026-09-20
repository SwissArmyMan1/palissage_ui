import { useEffect, type RefObject } from 'react';

const LAST_FRAME = 137;
// The vineyard (including its baked crossfade) fills chapter 01. Harvest starts
// at source time 2s; the remaining six seconds carry chapters 02 and 03.
const INTRO_END = 71;
const SOURCE = { wide: { width: 1152, height: 648, resident: 16 }, small: { width: 640, height: 360, resident: 28 } };
const THRIFTY = ['slow-2g', '2g', '3g'];
const REQUESTS = 6;
const clamp = (n: number) => Math.max(0, Math.min(1, n));

/** Coarse first, then finer: every scroll position has a frame within a few indices
 * long before the whole sequence has arrived, and the gaps close as it does. A slow
 * line stops at the half-sequence tier rather than spending the rest of its budget. */
const downloadOrder = (finest: number) => {
  const seen = new Set<number>();
  const order: number[] = [];
  for (const stride of [16, 8, 4, 2, 1]) {
    if (stride < finest) break;
    for (let index = 0; index <= LAST_FRAME; index += stride) {
      if (seen.has(index)) continue;
      seen.add(index);
      order.push(index);
    }
  }
  if (!seen.has(LAST_FRAME)) order.push(LAST_FRAME);
  return order;
};

/** A frame is a scroll position, never a time. No playback loop or scroll interception.
 * The scroll frame itself only reads layout once and writes compositor properties: bytes
 * are fetched in the background, decoding happens off the main thread, and the nearest
 * frame already held is drawn while the exact one arrives. */
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
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const size = matchMedia('(max-width: 700px)').matches ? 'small' : 'wide';
    const source = SOURCE[size];
    const shades = {
      '--harvest-intro': root.querySelector<HTMLElement>('.harvest-shade-right'),
      '--harvest-middle': root.querySelector<HTMLElement>('.harvest-shade-left'),
      '--harvest-outro': root.querySelector<HTMLElement>('.harvest-shade-center'),
      '--harvest-progress': root.querySelector<HTMLElement>('.harvest-track > span'),
    };
    const written = new Map<string, number>();
    const blobs = new Map<number, Blob>();
    const bitmaps = new Map<number, ImageBitmap>();
    const requested = new Set<number>();
    const decoding = new Set<number>();
    const failed = new Set<number>();
    const order = downloadOrder(THRIFTY.includes(connection?.effectiveType ?? '') ? 2 : 1);
    let cursor = 0;
    let misses = 0;
    let disposed = false;
    let near = false;
    let raf = 0;
    let target = 0;
    let painted = -1;
    let direction = 1;
    let stageHeight = 0;
    let width = 0;
    let height = 0;

    const still = () => reduced.matches || Boolean(connection?.saveData);

    /** Never allocate more canvas pixels than the frames can fill. */
    const measure = (boxWidth: number, boxHeight: number) => {
      stageHeight = boxHeight;
      if (!boxWidth || !boxHeight) return;
      const cover = Math.max(boxWidth / source.width, boxHeight / source.height);
      const scale = Math.min(devicePixelRatio || 1, Math.max(1, 1 / cover));
      const next = { width: Math.round(boxWidth * scale), height: Math.round(boxHeight * scale) };
      if (next.width === width && next.height === height) return;
      canvas.width = width = next.width;
      canvas.height = height = next.height;
      painted = -1; // Resizing the backing store clears it.
    };

    const nearest = () => {
      if (bitmaps.has(target)) return target;
      let best = -1;
      for (const index of bitmaps.keys()) {
        if (best < 0 || Math.abs(index - target) < Math.abs(best - target)) best = index;
      }
      return best;
    };

    const draw = () => {
      if (disposed || still() || !width) return;
      const index = nearest();
      if (index < 0) return;
      if (index !== painted) {
        const frame = bitmaps.get(index)!;
        const scale = Math.max(width / frame.width, height / frame.height);
        context.drawImage(frame, (width - frame.width * scale) / 2, (height - frame.height * scale) / 2,
          frame.width * scale, frame.height * scale);
        painted = index;
        root.dataset.frame = String(index);
      }
      // The canvas holds a real frame even when this pass had nothing new to paint,
      // so the poster stays retired after a motion preference goes back and forth.
      if (root.dataset.motion !== 'scroll') root.dataset.motion = 'scroll';
    };

    /** Keep decoded memory bounded; the compressed bytes stay, so this never refetches. */
    const evict = () => {
      while (bitmaps.size > source.resident) {
        let victim = -1;
        for (const index of bitmaps.keys()) {
          if (index === target) continue;
          if (victim < 0 || Math.abs(index - target) > Math.abs(victim - target)) victim = index;
        }
        if (victim < 0) return;
        bitmaps.get(victim)!.close();
        bitmaps.delete(victim);
      }
    };

    const decode = (index: number) => {
      if (disposed || index < 0 || index > LAST_FRAME) return;
      if (bitmaps.has(index) || decoding.has(index)) return;
      const bytes = blobs.get(index);
      if (!bytes) return;
      decoding.add(index);
      createImageBitmap(bytes).then((frame) => {
        decoding.delete(index);
        if (disposed || !near) {
          frame.close();
          return;
        }
        bitmaps.set(index, frame);
        evict();
        if (painted < 0 || Math.abs(index - target) < Math.abs(painted - target)) draw();
      }).catch(() => {
        decoding.delete(index);
        failed.add(index);
      });
    };

    const request = (index: number) => {
      requested.add(index);
      const init = { priority: index === target ? 'high' : 'low' } as RequestInit;
      fetch(`/media/harvest/${size}/${String(index).padStart(3, '0')}.webp?v=3`, init)
        .then((response) => {
          if (!response.ok) throw new Error(String(response.status));
          return response.blob();
        })
        .then((bytes) => {
          if (disposed) return;
          misses = 0;
          blobs.set(index, bytes);
          decode(index);
        })
        .catch(() => {
          failed.add(index);
          misses += 1;
          if (painted < 0) root.dataset.motion = 'poster';
        })
        .finally(() => {
          requested.delete(index);
          pump();
        });
    };

    const wanted = () => {
      if (!blobs.has(target) && !requested.has(target) && !failed.has(target)) return target;
      while (cursor < order.length) {
        const index = order[cursor];
        if (!blobs.has(index) && !requested.has(index) && !failed.has(index)) return index;
        cursor += 1;
      }
      return -1;
    };

    const pump = () => {
      if (disposed || !near || still() || misses >= 8) return;
      while (requested.size < REQUESTS) {
        const index = wanted();
        if (index < 0) return;
        request(index);
      }
    };

    const write = (name: keyof typeof shades, value: number) => {
      const node = shades[name];
      if (!node || Math.abs(value - (written.get(name) ?? Number.NaN)) < 0.002) return;
      written.set(name, value);
      node.style.setProperty(name, value.toFixed(4));
    };

    const update = () => {
      raf = 0;
      if (disposed) return;
      const rect = root.getBoundingClientRect(); // The only layout read of the frame.
      const progress = clamp((56 - rect.top) / Math.max(1, rect.height - stageHeight));
      const intro = 1 - clamp((progress - .27) / .09);
      const outro = clamp((progress - .64) / .1);
      write('--harvest-progress', progress);
      write('--harvest-intro', intro);
      write('--harvest-middle', 1 - intro - outro);
      write('--harvest-outro', outro);
      const chapter = String(Math.min(2, Math.floor(progress * 3)));
      if (root.dataset.chapter !== chapter) root.dataset.chapter = chapter;
      if (still()) {
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
      decode(target);
      decode(target + direction);
      decode(target + direction * 2);
      pump();
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const release = () => {
      for (const frame of bitmaps.values()) frame.close();
      bitmaps.clear();
      painted = -1;
    };

    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => {
      near = entry.isIntersecting;
      root.dataset.near = String(near);
      if (near) pump();
      else release(); // The compressed frames stay; only decoded memory is handed back.
      schedule();
    }, { rootMargin: '1400px' });
    if (observer) observer.observe(root);
    else near = true;
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target !== canvas) continue;
        measure(entry.contentRect.width, entry.contentRect.height);
      }
      schedule();
    });
    const box = canvas.getBoundingClientRect();
    measure(box.width, box.height);
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
      release();
      blobs.clear();
    };
  }, [rootRef, canvasRef]);
}
