import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { arrow, autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/react-dom';
import type { Placement as FloatingPlacement } from '@floating-ui/react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useLocale } from '@/lib/i18n/context';
import { Button } from '@/components/ui/Button';
import { openDialogAncestor } from '../engine/anchor';
import type { TourStep } from '../engine/types';
import { TourProgress } from './TourProgress';

/**
 * `Coach mark (guided tour step)`.
 *
 * Two placement details decide whether this works at all:
 *
 * 1. The card renders in the **top layer** (`popover="manual"`), so no ancestor
 *    stacking context and no `overflow: hidden` can clip it — and no z-index
 *    war is needed with the app shell.
 * 2. Except when its anchor is inside an open modal `<dialog>`. A modal dialog
 *    makes everything outside it inert, top layer included, so the card is
 *    portalled *into* the dialog instead. Those are the `ActionReview` screens —
 *    reserve, verify, close a lot — which is where the tour matters most.
 *
 * `flip` before `shift`, and the card never overlaps the anchor: a card that
 * covers the control it is describing fails WCAG 2.2 SC 2.4.11, which is the
 * failure this pattern is famous for.
 */
/**
 * The bottom sheet, lifted clear of the control it points at.
 *
 * The bottom of a phone is where the tab bar lives, so a step pointing at one
 * was drawing its ring underneath its own card: the control could not be seen,
 * let alone pressed, and the tour stopped dead there.
 *
 * It re-measures after each move, because the figure depends on the card's own
 * height and moving the card changes it — while `autoUpdate` only watches the
 * anchor. Without that second pass the first measurement, taken while the
 * anchor was still being scrolled into view, was the one that stuck.
 */
function placeSheet(card: HTMLElement, anchor: HTMLElement | null): void {
  if (!anchor) {
    card.style.bottom = '';
    return;
  }
  const apply = () => {
    if (!card.isConnected || !anchor.isConnected) return;
    const rect = anchor.getBoundingClientRect();
    const height = card.getBoundingClientRect().height;
    const free = window.innerHeight - height;
    // A region taller than about a third of the screen cannot be cleared:
    // lifting would only cover its start instead of its end.
    const liftable = rect.height <= window.innerHeight * 0.35;
    const overlaps = rect.bottom > free;
    const lift = Math.max(0, Math.min(window.innerHeight - rect.top + 12, free - 12));
    const next = liftable && overlaps ? `${Math.round(lift)}px` : '';
    if (next === card.style.bottom) return;
    card.style.bottom = next;
    requestAnimationFrame(apply);
  };
  apply();
}

export function CoachMark({
  step,
  body,
  index,
  total,
  anchor,
  compact,
  waiting,
  stalled,
  onNext,
  onBack,
  onExit,
}: {
  step: TourStep;
  /** The effective body: a step can say something else on a phone. */
  body: string;
  index: number;
  total: number;
  anchor: HTMLElement | null;
  compact: boolean;
  /** True while the step waits for the reader to do the thing themselves. */
  waiting: boolean;
  /**
   * True once a waiting step can no longer satisfy itself — the condition was
   * already true when the step began, or the grace period expired. The hint
   * becomes a real control, because a step with no way forward is a trap.
   */
  stalled: boolean;
  onNext: () => void;
  onBack: () => void;
  onExit: () => void;
}) {
  const { t } = useLocale();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const arrowRef = useRef<HTMLSpanElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const titleId = `tour-step-title-${step.id}`;
  const bodyId = `tour-step-body-${step.id}`;

  /**
   * An anchor inside an open modal dialog cannot be reached from the top layer,
   * so the card portals into the dialog instead. This reads the DOM during
   * render, deliberately: where the card mounts has to be known before it
   * mounts, and resolving it in an effect would render it in the wrong place
   * first and move it after.
   */
  const container = useMemo(
    () => (anchor ? openDialogAncestor(anchor) : null),
    [anchor],
  );

  // Top layer, unless this card lives inside a dialog.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card || container) return;
    if (!card.matches(':popover-open')) {
      try {
        card.showPopover();
      } catch {
        // A browser without the Popover API still renders the card; it just
        // sits at --z-tour-card instead of in the top layer.
        card.style.zIndex = 'var(--z-tour-card)';
      }
    }
    return () => {
      if (card.matches(':popover-open')) card.hidePopover();
    };
  }, [container, step.id]);

  const position = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    if (compact) {
      card.style.top = '';
      card.style.left = '';
      placeSheet(card, anchor);
      return;
    }

    if (!anchor) {
      const rect = card.getBoundingClientRect();
      card.style.left = `${Math.max(16, (window.innerWidth - rect.width) / 2)}px`;
      card.style.top = `${Math.max(16, (window.innerHeight - rect.height) / 2)}px`;
      return;
    }
    void computePosition(anchor, card, {
      placement: (step.placement && step.placement !== 'center'
        ? step.placement
        : 'bottom-start') as FloatingPlacement,
      strategy: 'fixed',
      middleware: [
        offset(14),
        flip({ padding: 16 }),
        /**
         * `crossAxis` is not optional here. Several anchors are whole regions —
         * a wizard column, a table — that are taller than the viewport, and
         * anchoring to the bottom edge of one puts the card off screen where
         * `flip` has nowhere better to go. Cross-axis shifting pulls it back
         * into view instead of leaving it somewhere nobody can reach.
         */
        shift({ padding: 16, crossAxis: true }),
        arrowRef.current ? arrow({ element: arrowRef.current, padding: 12 }) : undefined,
      ].filter(Boolean),
    }).then(({ x, y, placement, middlewareData }) => {
      card.style.left = `${x}px`;
      card.style.top = `${y}px`;
      const point = arrowRef.current;
      const data = middlewareData.arrow;
      if (!point || !data) return;
      const side = placement.split('-')[0];
      const opposite = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }[side] ?? 'top';
      point.style.left = data.x != null ? `${data.x}px` : '';
      point.style.top = data.y != null ? `${data.y}px` : '';
      point.style.right = '';
      point.style.bottom = '';
      point.style[opposite as 'top'] = '-6px';
      point.style.clipPath =
        opposite === 'top'
          ? 'polygon(0 0, 100% 0, 100% 100%)'
          : opposite === 'bottom'
            ? 'polygon(0 0, 100% 100%, 0 100%)'
            : opposite === 'left'
              ? 'polygon(0 0, 0 100%, 100% 100%)'
              : 'polygon(0 0, 100% 0, 0 100%)';
    });
  }, [anchor, compact, step.placement]);

  useEffect(() => {
    position();
    const card = cardRef.current;
    if (!anchor || !card) return;
    /**
     * Tracked on a phone too. The sheet's clearance is measured against the
     * anchor, and the anchor is still being scrolled into view when the step
     * opens — computing it once left the card parked over the very control it
     * was pointing at, for the life of the step.
     *
     * Same reason as the spotlight otherwise: an anchor can move without
     * scrolling or resizing, and a card left behind points at nothing.
     */
    return autoUpdate(anchor, card, position, { animationFrame: true });
  }, [anchor, compact, position]);

  // Focus goes to the card on a step the reader advances, and to the anchor on
  // a step the reader performs — so a screen-reader user hears the instruction
  // attached to the control they are about to press.
  useEffect(() => {
    if (waiting && anchor) {
      anchor.setAttribute('aria-describedby', bodyId);
      if (anchor.tabIndex >= 0 || anchor.matches('a, button, input, select, textarea')) {
        anchor.focus({ preventScroll: true });
      }
      return () => anchor.removeAttribute('aria-describedby');
    }
    headingRef.current?.focus({ preventScroll: true });
  }, [waiting, anchor, bodyId, step.id]);

  const card = (
    <div
      ref={cardRef}
      popover={container ? undefined : 'manual'}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      data-sheet={compact || undefined}
      className={cn('tour-card', container && 'z-[var(--z-tour-card)]')}
    >
      {!compact ? <span ref={arrowRef} aria-hidden className="tour-arrow" /> : null}

      {compact ? (
        <div className="flex justify-center pt-3" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-edge-strong" />
        </div>
      ) : null}

      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <TourProgress index={index} total={total} />
          <button
            type="button"
            onClick={onExit}
            aria-label={t('Exit the tour')}
            className="-m-1.5 grid size-8 place-items-center rounded-md text-ink-secondary transition-colors duration-fast ease-out hover:bg-surface-sunken hover:text-ink"
          >
            <X aria-hidden className="size-4" strokeWidth={1.75} />
          </button>
        </div>

        <h2
          id={titleId}
          ref={headingRef}
          tabIndex={-1}
          className="mt-3 text-body font-semibold outline-none"
        >
          {t(step.title)}
        </h2>
        <p id={bodyId} className="mt-1.5 text-body-sm text-ink-secondary">
          {t(body)}
        </p>

        <div className="mt-4 flex items-center gap-2">
          {index > 0 ? (
            <Button kind="secondary" size="sm" onClick={onBack}>
              {t('Back')}
            </Button>
          ) : null}
          {waiting && stalled ? (
            <Button kind="secondary" size="sm" onClick={onNext} className="flex-1">
              {t('Continue')}
            </Button>
          ) : waiting ? (
            <span className="flex min-h-[34px] flex-1 items-center justify-center gap-2 rounded-md bg-accent-subtle px-3 text-body-sm font-medium text-accent">
              <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-accent" />
              {t('Press the highlighted control')}
            </span>
          ) : (
            <Button size="sm" onClick={onNext} className="flex-1" fullWidth={compact}>
              {index + 1 === total ? t('Finish') : t('Next')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return container ? createPortal(card, container) : card;
}
