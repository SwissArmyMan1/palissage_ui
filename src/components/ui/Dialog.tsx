import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useIsCompact } from '@/lib/media';

/**
 * One overlay component. Below 640 px it presents as a bottom sheet; above, as a
 * centred dialog (doc 06 §2). Both use a native `<dialog>` so focus is trapped,
 * the background is inert, Escape closes and the top layer is the browser's.
 *
 * Focus moves in on open regardless of animation state — the animation never
 * delays focus. A destructive action is never auto-focused, so focus lands on
 * the dialog heading instead of the first button.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'md' | 'lg';
  labelledBy?: string;
}) {
  const ref = useRef<HTMLDialogElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const compact = useIsCompact();
  const [exiting, setExiting] = useState(false);

  const close = useCallback(() => {
    setExiting(true);
    window.setTimeout(() => {
      setExiting(false);
      onClose();
    }, 200);
  }, [onClose]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) {
      node.showModal();
      // Scroll lock without a layout shift; scrollbar-gutter keeps the width.
      document.documentElement.style.overflow = 'hidden';
      headingRef.current?.focus();
    }
    if (!open && node.open) {
      node.close();
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy ?? 'dialog-title'}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === ref.current) close();
      }}
      className={cn(
        'm-0 max-h-none max-w-none border-0 bg-transparent p-0 text-ink backdrop:bg-[oklch(0.13_0_0/0.44)]',
        compact
          ? 'mt-auto h-auto w-full self-end'
          : 'inset-0 grid h-full w-full place-items-center p-6',
      )}
    >
      <div
        data-exiting={exiting || undefined}
        className={cn(
          compact ? 'sheet-panel w-full' : 'dialog-panel w-full',
          !compact && (size === 'lg' ? 'max-w-3xl' : 'max-w-xl'),
        )}
      >
        {compact ? (
          <div className="flex justify-center pt-3" aria-hidden>
            <span className="h-1 w-10 rounded-full bg-edge-strong" />
          </div>
        ) : null}

        <div className="flex items-start justify-between gap-4 p-6 pb-4">
          <div className="min-w-0 space-y-1">
            <h2
              id={labelledBy ?? 'dialog-title'}
              ref={headingRef}
              tabIndex={-1}
              className="t-h3 outline-none"
            >
              {title}
            </h2>
            {description ? <p className="text-body-sm text-ink-secondary">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="-m-2 grid size-9 shrink-0 place-items-center rounded-md text-ink-secondary transition-colors duration-fast ease-out hover:bg-surface-sunken hover:text-ink"
          >
            <X aria-hidden className="size-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="max-h-[min(70vh,640px)] overflow-y-auto px-6 pb-2">{children}</div>

        {footer ? (
          <div className="flex flex-col-reverse gap-3 border-t border-edge-subtle p-6 sm:flex-row sm:justify-end">
            {footer}
          </div>
        ) : (
          <div className="h-6" />
        )}
      </div>
    </dialog>
  );
}
