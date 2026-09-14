import { useEffect } from 'react';

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const sceneSelector = '.hero-composition, .terroir-interlude, .audience-art';

/** Match the editorial CSS timelines in browsers without native support.
 * One passive listener schedules one frame; layout reads precede style writes.
 * Nothing runs continuously, and no React state or scroll position is changed.
 */
export function usePublicScrollMotion(): void {
  useEffect(() => {
    const site = document.querySelector<HTMLElement>('.public-site');
    if (!site) return;
    const native = typeof CSS !== 'undefined' &&
      CSS.supports('animation-timeline: view()') &&
      CSS.supports('animation-timeline: scroll(root)') &&
      CSS.supports('animation-range: exit 0% exit 100%');
    if (native) return;

    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let dispose = () => {};

    const configure = () => {
      dispose();
      if (preference.matches) return;

      let frame = 0;
      let scenes: HTMLElement[] = [];
      const styled = new Set<HTMLElement>();

      const update = () => {
        frame = 0;
        const height = window.innerHeight;
        const range = document.documentElement.scrollHeight - height;
        const reading = range > 0 ? clamp(window.scrollY / range) : 0;
        const intro = clamp(window.scrollY / Math.max(1, height * 0.8));
        const values = scenes.map((node) => {
          const rect = node.getBoundingClientRect();
          // Hero: exit 0–100%. Other illustrations: entry 0%–exit 100%.
          const progress = node.matches('.hero-composition')
            ? clamp(-rect.top / Math.max(1, rect.height))
            : clamp((height - rect.top) / Math.max(1, height + rect.height));
          return { node, progress };
        });

        site.style.setProperty('--reading-progress', String(reading));
        site.style.setProperty('--intro-progress', String(intro));
        for (const { node, progress } of values) {
          node.style.setProperty('--scroll-progress', String(progress));
          styled.add(node);
        }
      };
      const schedule = () => {
        if (!frame) frame = window.requestAnimationFrame(update);
      };
      const scan = () => {
        scenes = Array.from(site.querySelectorAll<HTMLElement>(sceneSelector));
        // Drop detached routes instead of retaining their DOM for the session.
        for (const node of styled) {
          if (!site.contains(node)) {
            node.style.removeProperty('--scroll-progress');
            styled.delete(node);
          }
        }
        schedule();
      };

      site.dataset.scrollMotion = 'fallback';
      scan();
      const mutations = new MutationObserver(scan);
      mutations.observe(site, { childList: true, subtree: true });
      const resize = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
      resize?.observe(site);
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule, { passive: true });
      window.addEventListener('pageshow', schedule);

      dispose = () => {
        window.cancelAnimationFrame(frame);
        mutations.disconnect();
        resize?.disconnect();
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
        window.removeEventListener('pageshow', schedule);
        delete site.dataset.scrollMotion;
        site.style.removeProperty('--reading-progress');
        site.style.removeProperty('--intro-progress');
        styled.forEach((node) => node.style.removeProperty('--scroll-progress'));
      };
    };

    configure();
    preference.addEventListener('change', configure);
    return () => {
      preference.removeEventListener('change', configure);
      dispose();
    };
  }, []);
}
