import { useEffect, useRef } from 'react';
import { CircleCheck } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { TxStatus } from './TxStatus';
import type { TxState } from '@/chain/tx';

/**
 * SYS-03 `Action review`.
 *
 * Approve and execute are two steps inside **one** dialog, never two dialogs —
 * the `Modal dialog` entry's own veto. The reader sees the object, the amount
 * and the consequence before anything is sent, and the confirm button is never
 * auto-focused.
 */
export interface ReviewStep {
  id: string;
  /** Verb phrase naming the outcome — never "Submit" or "Continue". */
  label: string;
  /** Why this step exists, one line. */
  note?: string;
  /** False once the chain says the step is already satisfied. */
  required: boolean;
  run: () => void;
  tx: TxState;
}

export function ActionReview({
  open,
  onClose,
  title,
  object,
  consequence,
  steps,
  summary,
  onDone,
  destructive = false,
  blocked,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  object: React.ReactNode;
  consequence: React.ReactNode;
  steps: readonly ReviewStep[];
  summary?: React.ReactNode;
  onDone?: () => void;
  destructive?: boolean;
  /** A reason the action cannot proceed at all; disables every step. */
  blocked?: string;
}) {
  const pending = steps.filter((step) => step.required);
  const activeStep = pending.find((step) => step.tx.stage !== 'confirmed') ?? pending[0];
  const allDone = pending.length === 0 || pending.every((step) => step.tx.stage === 'confirmed');
  // A latch, not state: `onDone` navigates, and it must fire exactly once.
  const announced = useRef(false);

  useEffect(() => {
    if (!open) {
      announced.current = false;
      return;
    }
    if (allDone && !announced.current) {
      announced.current = true;
      onDone?.();
    }
  }, [allDone, open, onDone]);

  const multi = pending.length > 1;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={multi ? `This sends ${pending.length} transactions, one after the other.` : undefined}
      footer={
        <>
          <Button kind="secondary" onClick={onClose}>
            {allDone ? 'Close' : 'Cancel'}
          </Button>
          {!allDone && activeStep ? (
            <Button
              kind={destructive ? 'danger' : 'primary'}
              pending={activeStep.tx.busy}
              disabled={Boolean(blocked)}
              onClick={activeStep.run}
            >
              {activeStep.label}
            </Button>
          ) : null}
        </>
      }
    >
      <div className="space-y-6">
        <div className="rounded-lg bg-surface-sunken p-4">{object}</div>

        {summary ? <div>{summary}</div> : null}

        <div className="space-y-2">
          <p className="t-caption text-ink-secondary">What this does</p>
          <div className="text-body-sm text-ink-secondary">{consequence}</div>
        </div>

        {multi ? (
          <ol className="space-y-3">
            {pending.map((step, index) => {
              const done = step.tx.stage === 'confirmed';
              const active = step.id === activeStep?.id;
              return (
                <li key={step.id} className="flex gap-3">
                  <span
                    aria-hidden
                    className={cn(
                      'mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border text-caption font-semibold',
                      done
                        ? 'border-success bg-success text-ink-onaccent'
                        : active
                          ? 'border-accent text-accent'
                          : 'border-edge-strong text-ink-secondary',
                    )}
                  >
                    {done ? <CircleCheck className="size-4" strokeWidth={2} /> : index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className={cn('text-body-sm', active && 'font-semibold')}>{step.label}</p>
                    {step.note ? (
                      <p className="text-body-sm text-ink-secondary">{step.note}</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        ) : null}

        {blocked ? (
          <p role="alert" className="rounded-lg border border-danger/25 bg-danger-subtle p-4 text-body-sm text-danger">
            {blocked}
          </p>
        ) : null}

        {steps.map((step) => (
          <TxStatus key={step.id} tx={step.tx} />
        ))}
      </div>
    </Dialog>
  );
}
