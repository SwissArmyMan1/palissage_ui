import { CircleCheck, CircleX, ExternalLink, LoaderCircle, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';
import { txUrl } from '@/chain/config';
import { STAGE_COPY, type TxState } from '@/chain/tx';

/**
 * One rendering for every write stage, so a reserve, a verification and a
 * withdrawal all report the same way.
 *
 * A confirmed write never claims the screen is up to date — it says the read is
 * repeating. A reverted write is never auto-retried. The technical detail sits
 * behind a disclosure, for support.
 */
export function TxStatus({ tx, className }: { tx: TxState; className?: string }) {
  if (tx.stage === 'idle') return null;

  const copy = STAGE_COPY[tx.stage];
  const tone =
    tx.stage === 'confirmed'
      ? 'success'
      : tx.stage === 'rejected' || tx.stage === 'reverted'
        ? 'danger'
        : tx.stage === 'unknown'
          ? 'warning'
          : 'info';

  const Icon =
    tone === 'success'
      ? CircleCheck
      : tone === 'danger'
        ? CircleX
        : tone === 'warning'
          ? TriangleAlert
          : LoaderCircle;

  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex gap-3 rounded-lg border p-4 text-body-sm',
        tone === 'success' && 'border-success/25 bg-success-subtle text-success',
        tone === 'danger' && 'border-danger/25 bg-danger-subtle text-danger',
        tone === 'warning' && 'border-warning/25 bg-warning-subtle text-warning',
        tone === 'info' && 'border-info/25 bg-info-subtle text-info',
        className,
      )}
    >
      <Icon
        aria-hidden
        className={cn('mt-0.5 size-4 shrink-0', Icon === LoaderCircle && 'animate-spin motion-reduce:animate-none')}
        strokeWidth={1.75}
      />
      <div className="min-w-0 space-y-2">
        <p className="font-semibold">{copy.title}</p>
        {tx.error ? <p>{tx.error.message}</p> : copy.body ? <p>{copy.body}</p> : null}

        {tx.hash ? (
          <a
            href={txUrl(tx.hash)}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 font-medium underline underline-offset-4"
          >
            View the transaction on Basescan
            <ExternalLink aria-hidden className="size-3.5" strokeWidth={1.75} />
          </a>
        ) : null}

        {tx.error?.detail ? (
          <details className="mt-1">
            <summary className="cursor-pointer text-caption uppercase tracking-[0.04em]">
              Technical detail
            </summary>
            <p className="t-mono mt-2 break-all opacity-90">{tx.error.detail}</p>
          </details>
        ) : null}
      </div>
    </div>
  );
}
