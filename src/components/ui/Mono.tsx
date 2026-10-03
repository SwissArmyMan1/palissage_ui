import { useLocale } from '@/lib/i18n/context';
import { useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/cn';
import { truncateAddress, truncateHash } from '@/lib/format';
import { addressUrl } from '@/chain/config';

/** JetBrains Mono is for hashes, addresses and ids only. Never for prose. */
export function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('t-mono', className)}>{children}</span>;
}

export function CopyValue({
  value,
  display,
  label,
  className,
}: {
  value: string;
  display?: string;
  label: string;
  className?: string;
}) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Mono className="text-ink-secondary">{display ?? value}</Mono>
      <button
        type="button"
        aria-label={
          copied ? t('{label} copied', { label: t(label) }) : t('Copy {label}', { label: t(label) })
        }
        title={value}
        onClick={() => {
          void navigator.clipboard?.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }}
        className="grid size-6 place-items-center rounded-sm text-ink-secondary transition-colors duration-fast ease-out hover:text-ink"
      >
        {copied ? (
          <Check aria-hidden className="size-3.5" strokeWidth={1.75} />
        ) : (
          <Copy aria-hidden className="size-3.5" strokeWidth={1.75} />
        )}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? t('{label} copied to the clipboard', { label: t(label) }) : ''}
      </span>
    </span>
  );
}

export function AddressValue({ address, label = 'address' }: { address: string; label?: string }) {
  return <CopyValue value={address} display={truncateAddress(address)} label={label} />;
}

export function HashValue({ hash, label = 'hash' }: { hash: string; label?: string }) {
  return <CopyValue value={hash} display={truncateHash(hash)} label={label} />;
}

/** Leaves the site: always marked, never opened silently. */
export function ExplorerLink({
  address,
  children,
  className,
}: {
  address: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { t } = useLocale();
  return (
    <a
      href={addressUrl(address)}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        'inline-flex items-center gap-1 text-body-sm font-medium text-accent underline decoration-transparent underline-offset-4 transition-colors duration-fast ease-out hover:decoration-current',
        className,
      )}
    >
      {children ?? t('View on the selected network')}
      <ExternalLink aria-hidden className="size-3.5" strokeWidth={1.75} />
      <span className="sr-only"> {t(' (opens the block explorer in a new tab)')}</span>
    </a>
  );
}
