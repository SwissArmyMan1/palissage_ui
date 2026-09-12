import { useFormat } from '@/lib/i18n/useFormat';
import { cn } from '@/lib/cn';
import { useCountUp } from '@/lib/motion';

/**
 * A stat tile states its comparison basis in text, or it is decoration and gets
 * deleted (doc 03). The label is a caption (uppercase, label-only); the value is
 * a display metric; the footnote is body-sm at secondary, never muted.
 */
export function StatTile({
  label,
  value,
  footnote,
  tone = 'default',
  className,
  action,
}: {
  label: string;
  value: React.ReactNode;
  footnote?: React.ReactNode;
  tone?: 'default' | 'accent' | 'warning' | 'danger';
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn('card flex flex-col gap-3 p-6 [container-type:inline-size]', className)}>
      <p className="t-caption text-ink-secondary">{label}</p>
      <p
        className={cn(
          't-metric text-[clamp(1.75rem,1.2rem+1.6vw,2.5rem)]',
          tone === 'accent' && 'text-accent',
          tone === 'warning' && 'text-warning',
          tone === 'danger' && 'text-danger',
        )}
      >
        {value}
      </p>
      {footnote ? <p className="text-body-sm text-ink-secondary">{footnote}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

/** Counts up once, on first view. Never on refetch — marketing pages only. */
export function CountUpMoney({
  target,
  fractionDigits = 0,
}: {
  target: number;
  fractionDigits?: number;
}) {
  const { formatMoneyNumber } = useFormat();
  const { ref, value } = useCountUp(target);
  return (
    <span ref={ref} className="t-num">
      <span aria-hidden="true">{formatMoneyNumber(value, fractionDigits)}</span>
      <span className="sr-only">{formatMoneyNumber(target, fractionDigits)}</span>
    </span>
  );
}
