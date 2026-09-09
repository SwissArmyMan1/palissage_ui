import { CircleCheck, CircleX, Info, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';

type CalloutTone = 'info' | 'warning' | 'danger' | 'success';

const TONES: Record<CalloutTone, { wrap: string; Icon: typeof Info }> = {
  info: { wrap: 'bg-info-subtle text-info border-info/25', Icon: Info },
  warning: { wrap: 'bg-warning-subtle text-warning border-warning/25', Icon: TriangleAlert },
  danger: { wrap: 'bg-danger-subtle text-danger border-danger/25', Icon: CircleX },
  success: { wrap: 'bg-success-subtle text-success border-success/25', Icon: CircleCheck },
};

/**
 * The standing explainers — deposit versus ownership, escrow, irreversibility.
 * These carry information the reader must not miss, so they are never a tooltip.
 */
export function Callout({
  tone = 'info',
  title,
  children,
  className,
  role,
}: {
  tone?: CalloutTone;
  title?: string;
  children: React.ReactNode;
  className?: string;
  role?: 'alert' | 'status';
}) {
  const { wrap, Icon } = TONES[tone];
  return (
    <div role={role} className={cn('flex gap-3 rounded-lg border p-4 text-body-sm', wrap, className)}>
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
      <div className="min-w-0 space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className="[&_a]:underline [&_a]:underline-offset-2">{children}</div>
      </div>
    </div>
  );
}
