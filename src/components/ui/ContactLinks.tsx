import { useLocale } from '@/lib/i18n/context';
import { useId, useRef, useState } from 'react';
import { ArrowUpRight, Mail } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { cn } from '@/lib/cn';
import { CONTACTS, WEBMAIL_LINKS } from '@/lib/content/contacts';

/** Mobile OSes own the app chooser; desktop visitors can choose webmail. */
function usesMobileMailHandler() {
  return (
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  );
}

export function EmailLink({ className }: { className?: string }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLAnchorElement>(null);
  const titleId = useId();
  const close = () => {
    setOpen(false);
    // Wait for the native modal to leave the top layer; its background is inert.
    requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true }));
  };

  return (
    <>
      <a
        ref={trigger}
        href={CONTACTS.mailto}
        className={cn(
          'contact-email inline-flex min-h-11 items-center gap-3 text-accent underline-offset-4 hover:underline',
          className,
        )}
        onClick={(event) => {
          if (
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            event.altKey ||
            usesMobileMailHandler()
          )
            return;
          event.preventDefault();
          setOpen(true);
        }}
      >
        <Mail aria-hidden className="size-5 shrink-0" strokeWidth={1.5} />
        <span>{CONTACTS.email}</span>
      </a>
      <Dialog
        open={open}
        onClose={close}
        title={t('Write to Palissage')}
        labelledBy={titleId}
        description={t('Choose your email service to write a message.')}
      >
        <p className="mb-5 break-all text-body-sm text-ink-secondary">
          {t('To: ')}
          {CONTACTS.email}
        </p>
        <div className="space-y-2">
          {WEBMAIL_LINKS.map((service) => (
            <a
              key={service.label}
              href={service.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 items-center justify-between gap-4 rounded-md border border-edge-subtle px-4 py-3 text-body-sm hover:bg-surface-sunken"
            >
              <span>
                {t(service.label)}
                <span className="sr-only"> {t(' (opens in a new tab)')}</span>
              </span>
              <ArrowUpRight aria-hidden className="size-4" />
            </a>
          ))}
          <a
            href={CONTACTS.mailto}
            onClick={close}
            className="flex min-h-12 items-center gap-3 rounded-md border border-edge-subtle px-4 py-3 text-body-sm hover:bg-surface-sunken"
          >
            <Mail aria-hidden className="size-4" />
            {t('Open my email app')}
          </a>
        </div>
        <p className="mt-4 text-body-sm text-ink-secondary">
          {t('You may need to sign in to your email service.')}
        </p>
      </Dialog>
    </>
  );
}

export function XLink({
  showHandle = false,
  className,
}: {
  showHandle?: boolean;
  className?: string;
}) {
  const { t } = useLocale();
  return (
    <a
      href={CONTACTS.xUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('Palissage on X (opens in a new tab)')}
      className={cn(
        'inline-flex min-h-11 min-w-11 items-center justify-center gap-3 rounded-full border border-edge-strong px-3 text-ink transition-colors hover:bg-surface',
        className,
      )}
    >
      <svg aria-hidden="true" focusable="false" viewBox="0 0 19 19" className="size-5 shrink-0">
        <use href="/icons.svg#x-icon" />
      </svg>
      {showHandle ? <span>{CONTACTS.xHandle}</span> : null}
    </a>
  );
}
