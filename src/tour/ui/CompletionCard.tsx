import { useNavigate } from 'react-router-dom';
import { CircleCheck } from 'lucide-react';
import { useLocale } from '@/lib/i18n/context';
import { Button } from '@/components/ui/Button';
import type { TourCompletion } from '../engine/types';

/**
 * The end of a tour names what the reader now knows and offers exactly one
 * next action — the real version of what they just rehearsed. A bare "Done"
 * with a confetti burst would be the moment the product stops teaching.
 */
export function CompletionCard({
  completion,
  onClose,
}: {
  completion: TourCompletion;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-[var(--z-tour-card)] grid place-items-center p-4">
      <div className="scrim absolute inset-0" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-completion-title"
        className="dialog-panel relative w-full max-w-md p-6"
      >
        <span className="inline-flex items-center gap-2 rounded-full bg-success-subtle px-3 py-1 text-caption normal-case tracking-normal text-ink">
          <CircleCheck aria-hidden className="size-3.5 text-success" strokeWidth={2} />
          {t('Tour complete')}
        </span>

        <h2 id="tour-completion-title" className="mt-4 t-h3">
          {t(completion.title)}
        </h2>

        <ul className="mt-4 space-y-2">
          {completion.learned.map((line) => (
            <li key={line} className="flex gap-3 text-body-sm text-ink-secondary">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
              <span>{t(line)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
          <Button kind="secondary" onClick={onClose} className="sm:w-auto">
            {t('Close')}
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              onClose();
              navigate(completion.next.to);
            }}
          >
            {t(completion.next.label)}
          </Button>
        </div>
      </div>
    </div>
  );
}
