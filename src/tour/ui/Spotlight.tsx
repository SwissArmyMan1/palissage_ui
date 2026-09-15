import { useEffect, useRef, useState } from 'react';
import { autoUpdate } from '@floating-ui/react-dom';

/**
 * The scrim with a hole in it.
 *
 * Four shields rather than one dimmed layer, because pointer events cannot be
 * punched through CSS: the shields both darken the page and block it, and the
 * anchor between them stays operable — which is the whole point of a step that
 * asks the reader to press something.
 *
 * `autoUpdate` is floating-ui's: it covers scroll, resize, ancestor scroll and
 * element resize. A hand-rolled scroll listener is the classic way this drifts.
 *
 * `animationFrame` is on, and it is not a nicety. The default watchers miss an
 * anchor that *moves* without being scrolled or resized — a late image above it
 * loading, a skeleton being replaced by real rows, a read landing and growing a
 * table. The hole then sits where the control used to be, the shields cover the
 * control itself, and the step becomes unpressable: the reader clicks the thing
 * the tour is pointing at and nothing happens. One element polled per frame,
 * only while a step is on screen, is the right trade for that.
 */
export interface Hole {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
}

const OFFSET = 5;

export function Spotlight({
  anchor,
  act,
  blocking,
}: {
  anchor: HTMLElement | null;
  act: boolean;
  /**
   * False on a step the reader has to work through — a wizard, a form, a
   * quantity field. Blocking the page there would make the instruction
   * impossible to follow, which is the `Coach mark` entry's own veto:
   * never use it for anything the user is in the middle of doing.
   */
  blocking: boolean;
}) {
  const ringRef = useRef<HTMLDivElement | null>(null);
  const [hole, setHole] = useState<Hole | null>(null);

  useEffect(() => {
    const ring = ringRef.current;
    if (!anchor || !ring) return;
    const measure = () => {
      const rect = anchor.getBoundingClientRect();
      /**
       * A detached node measures as all zeroes, and a hole of zero size at the
       * origin drew the ring as a dot in the top-left corner of the screen —
       * the visible symptom of a screen replacing the element mid-step. Keep
       * the last good hole instead: the runner is already resolving the
       * replacement, and the ring travels to it from where it was.
       */
      if (!anchor.isConnected || rect.width < 1 || rect.height < 1) return;
      const style = window.getComputedStyle(anchor);
      const radius = parseFloat(style.borderTopLeftRadius) || 8;
      setHole({
        x: Math.max(0, rect.left - OFFSET),
        y: Math.max(0, rect.top - OFFSET),
        width: rect.width + OFFSET * 2,
        height: rect.height + OFFSET * 2,
        radius: radius + OFFSET,
      });
    };
    measure();
    return autoUpdate(anchor, ring, measure, { animationFrame: true });
  }, [anchor]);

  // The previous step's hole is deliberately not cleared: it is the position
  // the ring travels *from* when the next anchor resolves.
  const active = anchor !== null && hole !== null;

  const vars = hole
    ? ({
        '--tour-hx': `${hole.x}px`,
        '--tour-hy': `${hole.y}px`,
        '--tour-hw': `${hole.width}px`,
        '--tour-hh': `${hole.height}px`,
        '--tour-hr': `${hole.radius}px`,
      } as React.CSSProperties)
    : undefined;

  // With no anchor the step still dims the page — it just has nothing to ring.
  const h = active && hole ? hole : { x: 0, y: 0, width: 0, height: 0, radius: 0 };

  return (
    <div className="tour-layer" style={vars} aria-hidden>
      <div
        className="tour-shield"
        data-entering="true"
        data-passive={!blocking || undefined}
        style={{ top: 0, left: 0, right: 0, height: h.y }}
      />
      <div
        className="tour-shield"
        data-passive={!blocking || undefined}
        style={{ top: h.y + h.height, left: 0, right: 0, bottom: 0 }}
      />
      <div
        className="tour-shield"
        data-passive={!blocking || undefined}
        style={{ top: h.y, left: 0, width: h.x, height: h.height }}
      />
      <div
        className="tour-shield"
        data-passive={!blocking || undefined}
        style={{ top: h.y, left: h.x + h.width, right: 0, height: h.height }}
      />
      <div
        ref={ringRef}
        hidden={!active}
        className="tour-ring"
        data-act={(active && act) || undefined}
      />
    </div>
  );
}
