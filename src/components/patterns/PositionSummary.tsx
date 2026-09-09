import { formatCount } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { PositionView } from '@/chain/types';

/**
 * `balance / frozen / transferable` are three numbers and must stay three
 * numbers. Collapsing them into one is a correctness bug, not a layout choice
 * (doc 03).
 */
export function PositionSummary({
  position,
  className,
}: {
  position: PositionView;
  className?: string;
}) {
  const rows = [
    { label: 'Bottles you hold', value: position.balance, hint: 'Minted to this wallet' },
    { label: 'Frozen', value: position.frozen, hint: 'Owned, but not transferable right now' },
    {
      label: 'Transferable',
      value: position.transferable,
      hint: 'What you can list or send today',
    },
  ];

  return (
    <dl className={cn('grid gap-4 [container-type:inline-size] sm:grid-cols-3', className)}>
      {rows.map((row) => (
        <div key={row.label} className="card p-4">
          <dt className="t-caption text-ink-secondary">{row.label}</dt>
          <dd className="mt-2 t-metric text-2xl">{formatCount(row.value)}</dd>
          <dd className="mt-1 text-body-sm text-ink-secondary">{row.hint}</dd>
        </div>
      ))}
    </dl>
  );
}
