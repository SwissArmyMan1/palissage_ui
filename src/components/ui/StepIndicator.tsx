import { CircleCheck } from 'lucide-react';
import { cn } from '@/lib/cn';

/** `Multi-step flow` header. Each step is a URL where the flow is a wizard. */
export function StepIndicator({
  steps,
  current,
  className,
}: {
  steps: readonly string[];
  current: number;
  className?: string;
}) {
  return (
    <ol className={cn('flex flex-wrap items-center gap-x-4 gap-y-2', className)}>
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={step} className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  'grid size-6 place-items-center rounded-full border text-caption font-semibold tabular-nums',
                  done && 'border-success bg-success text-ink-onaccent',
                  active && 'border-accent bg-accent text-ink-onaccent',
                  !done && !active && 'border-edge-strong text-ink-secondary',
                )}
              >
                {done ? <CircleCheck className="size-4" strokeWidth={2} /> : index + 1}
              </span>
              <span
                className={cn(
                  'text-body-sm',
                  active ? 'font-semibold text-ink' : done ? 'text-ink' : 'text-ink-secondary',
                )}
              >
                {step}
                <span className="sr-only">
                  {done ? ' — done' : active ? ' — current step' : ' — not started'}
                </span>
              </span>
            </span>
            {index < steps.length - 1 ? (
              <span aria-hidden className="hidden h-px w-10 bg-edge-strong sm:block" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
