import { useLocale } from '@/lib/i18n/context';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

/**
 * Cursor pagination. The interface never claims a total it has not read — with
 * a capped read the count reads `50+`, never a guess (doc 00 §4).
 */
export function Pagination({
  shown,
  hasNext,
  hasPrevious,
  onNext,
  onPrevious,
  noun = 'lots',
  className,
}: {
  shown: number;
  hasNext: boolean;
  hasPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
  noun?: string;
  className?: string;
}) {
  const { t } = useLocale();
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-4', className)}>
      <p className="text-body-sm text-ink-secondary" aria-live="polite">
        {hasNext || hasPrevious
          ? t('Showing {count} {noun}', { count: shown, noun: t(noun) })
          : t('Showing all {count} {noun}', { count: shown, noun: t(noun) })}
      </p>
      {hasNext || hasPrevious ? (
        <div className="flex gap-3">
          <Button kind="secondary" size="sm" disabled={!hasPrevious} onClick={onPrevious}>
            <ChevronLeft aria-hidden className="size-4" strokeWidth={1.75} />
            {t('Previous')}
          </Button>
          <Button kind="secondary" size="sm" disabled={!hasNext} onClick={onNext}>
            {t('Next 50')}
            <ArrowRight aria-hidden className="size-4" strokeWidth={1.75} />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
