/**
 * Finding the thing the step points at, and getting it on screen.
 *
 * Two details here are the difference between a tour that works and one that
 * silently points at nothing:
 *
 * 1. An anchor may not exist yet — the route is still loading, the drawer has
 *    not opened, the row has not been read from Base. So the engine waits, with
 *    a cap, and degrades to an un-anchored card rather than dying.
 * 2. On a desktop the app shell's `main` is the scroller, not the document.
 *    `window.scrollTo` moves nothing there; the anchor has to be scrolled
 *    inside its own container.
 */

const WAIT_CAP_MS = 4000;

/**
 * The first **rendered** match, not the first match.
 *
 * The app shell renders its sections twice — once in the desktop sidebar and
 * once in the mobile drawer — so on a phone `querySelector` returned the hidden
 * desktop copy, which has no box. The ring was then drawn as a 10 px sliver at
 * the top of the screen and the step could never be completed.
 */
export function findAnchor(selector: string): HTMLElement | null {
  for (const node of document.querySelectorAll<HTMLElement>(selector)) {
    if (!node.isConnected) continue;
    const rect = node.getBoundingClientRect();
    if (rect.width > 1 && rect.height > 1) return node;
  }
  return null;
}

/**
 * Resolves as soon as the anchor exists, or with null once the cap passes.
 * Never rejects: a missing anchor is a design problem, not an exception.
 */
export function waitForAnchor(
  selector: string,
  signal?: AbortSignal,
  capMs = WAIT_CAP_MS,
): Promise<HTMLElement | null> {
  const immediate = findAnchor(selector);
  if (immediate) return Promise.resolve(immediate);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (node: HTMLElement | null) => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      window.clearInterval(poll);
      window.clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      resolve(node);
    };
    const onAbort = () => finish(null);
    const look = () => {
      const node = findAnchor(selector);
      if (node) finish(node);
    };
    const observer = new MutationObserver(look);
    observer.observe(document.body, { childList: true, subtree: true });
    // An anchor can also become visible with no DOM change at all — a drawer
    // finishing its transition, a `hidden` class dropping — so poll as well.
    const poll = window.setInterval(look, 200);
    const timer = window.setTimeout(() => finish(null), capMs);
    signal?.addEventListener('abort', onAbort);
  });
}

/** The closest ancestor that actually scrolls, or null for the document. */
export function nearestScroller(el: Element): HTMLElement | null {
  let node = el.parentElement;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    const scrolls = /auto|scroll|overlay/.test(style.overflowY);
    if (scrolls && node.scrollHeight > node.clientHeight + 1) return node;
    node = node.parentElement;
  }
  return null;
}

/**
 * Puts the anchor at `fraction` of the way down its scroller. Half on desktop;
 * a third on mobile, where the bottom sheet owns the lower half of the screen
 * and an anchor in the middle would sit underneath it.
 */
export function scrollAnchorIntoView(el: HTMLElement, fraction = 0.5, reduced = false): void {
  const behavior: ScrollBehavior = reduced ? 'auto' : 'smooth';
  const rect = el.getBoundingClientRect();
  const scroller = nearestScroller(el);

  if (!scroller) {
    const target = window.scrollY + rect.top - (window.innerHeight * fraction - rect.height / 2);
    window.scrollTo({ top: Math.max(0, target), behavior });
    return;
  }

  const bounds = scroller.getBoundingClientRect();
  const delta = rect.top - bounds.top - (bounds.height * fraction - rect.height / 2);
  if (Math.abs(delta) < 2) return;
  scroller.scrollTo({ top: Math.max(0, scroller.scrollTop + delta), behavior });
}

/** True while the anchor sits inside a modal `<dialog>` that is open. */
export function openDialogAncestor(el: Element): HTMLDialogElement | null {
  const dialog = el.closest('dialog');
  return dialog instanceof HTMLDialogElement && dialog.open ? dialog : null;
}
