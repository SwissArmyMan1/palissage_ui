import { formatTokenAmount, type TokenMeta } from '@/chain/tokens';
import { cn } from '@/lib/cn';
import { formatBps, formatCount, formatDeadline } from '@/lib/format';

/**
 * Quantity x price, due now, remaining, fee, royalty, and what is excluded.
 * The fee is always shown before the reader commits, and shipping, duties and
 * taxes are named as excluded rather than left to be discovered.
 */
export interface FeeLine {
  label: React.ReactNode;
  value: React.ReactNode;
  emphasis?: boolean;
  muted?: boolean;
}

export function FeeBreakdown({
  lines,
  footnotes,
  className,
}: {
  lines: readonly FeeLine[];
  footnotes?: readonly React.ReactNode[];
  className?: string;
}) {
  return (
    <div className={cn('space-y-4', className)}>
      <dl className="space-y-3">
        {lines.map((line, index) => (
          <div
            key={index}
            className={cn(
              'flex items-baseline justify-between gap-4',
              line.emphasis && 'border-t border-edge-subtle pt-3',
            )}
          >
            <dt className={cn('text-body-sm', line.muted ? 'text-ink-secondary' : 'text-ink')}>
              {line.label}
            </dt>
            <dd
              className={cn(
                'shrink-0 tabular-nums',
                line.emphasis ? 't-metric text-xl' : 'text-body-sm',
                line.muted && 'text-ink-secondary',
              )}
            >
              {line.value}
            </dd>
          </div>
        ))}
      </dl>
      {footnotes?.length ? (
        <div className="space-y-2 border-t border-edge-subtle pt-4">
          {footnotes.map((note, index) => (
            <p key={index} className="text-body-sm text-ink-secondary">
              {note}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** The reserve summary, assembled from the offer's own terms. */
export function reserveLines(input: {
  quantity: number;
  pricePerBottle: bigint;
  meta: TokenMeta;
  depositBps: number;
  total: bigint;
  dueNow: bigint;
  balance: bigint;
  fullPaymentDeadline: bigint;
  feeBps: number;
  fee: bigint;
}): FeeLine[] {
  const lines: FeeLine[] = [
    {
      label: `${formatCount(input.quantity)} bottles × ${formatTokenAmount(input.pricePerBottle, input.meta)}`,
      value: formatTokenAmount(input.total, input.meta),
    },
  ];

  if (input.depositBps > 0) {
    lines.push({
      label: `${formatBps(input.depositBps)} deposit — due now`,
      value: formatTokenAmount(input.dueNow, input.meta),
      emphasis: true,
    });
    lines.push({
      label: `Balance — due ${formatDeadline(input.fullPaymentDeadline)}`,
      value: formatTokenAmount(input.balance, input.meta),
    });
  } else {
    lines.push({
      label: 'Due now, in full',
      value: formatTokenAmount(input.dueNow, input.meta),
      emphasis: true,
    });
  }

  lines.push({
    label: `Protocol fee ${formatBps(input.feeBps)} (from producer proceeds)`,
    value: formatTokenAmount(input.fee, input.meta),
    muted: true,
  });

  return lines;
}
