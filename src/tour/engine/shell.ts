/**
 * The one thing a step needs from the app shell.
 *
 * Below `lg` the sidebar is a drawer, so a step that points at a sidebar item
 * has to open it first. The shell subscribes; the step asks. A definition
 * reaching into the shell's state any other way would couple every tour to the
 * layout.
 */
type Listener = () => void;

const listeners = new Set<Listener>();

export function onDrawerRequest(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function requestDrawer(): void {
  for (const listener of [...listeners]) listener();
}

/** Only below the `lg` breakpoint is there a drawer to open. */
export function requestDrawerIfCompact(): void {
  if (typeof window !== 'undefined' && !window.matchMedia('(min-width: 1024px)').matches) {
    requestDrawer();
  }
}
