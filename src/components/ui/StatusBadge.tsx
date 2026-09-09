import { CircleCheck, CircleMinus, CircleX, Clock, Info, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Tone } from '@/lib/enums';

/**
 * Icon plus text, always. Colour is never the only signal (WCAG 1.4.1) — which
 * matters here because the accent and the danger colour are both reds.
 */
const TONES: Record<Tone, { className: string; Icon: typeof CircleCheck }> = {
  success: { className: 'bg-success-subtle text-success', Icon: CircleCheck },
  warning: { className: 'bg-warning-subtle text-warning', Icon: Clock },
  danger: { className: 'bg-danger-subtle text-danger', Icon: CircleX },
  info: { className: 'bg-info-subtle text-info', Icon: Info },
  neutral: { className: 'bg-surface-sunken text-ink-secondary', Icon: CircleMinus },
  accent: { className: 'bg-accent-subtle text-accent', Icon: TriangleAlert },
};

export function StatusBadge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  const { className: toneClass, Icon } = TONES[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-body-sm font-medium',
        toneClass,
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5 shrink-0" strokeWidth={1.75} />
      {children}
    </span>
  );
}
