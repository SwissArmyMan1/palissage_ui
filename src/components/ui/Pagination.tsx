import { ArrowRight, ChevronLeft } from 'lucide-react';
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
}: {
  shown: number;
  hasNext: boolean;
  hasPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
  noun?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="text-body-sm text-ink-secondary" aria-live="polite">
        {hasNext || hasPrevious
          ? `Showing ${shown} ${noun}`
          : `Showing all ${shown} ${noun}`}
      </p>
      {hasNext || hasPrevious ? (
        <div className="flex gap-3">
          <Button kind="secondary" size="sm" disabled={!hasPrevious} onClick={onPrevious}>
            <ChevronLeft aria-hidden className="size-4" strokeWidth={1.75} />
            Previous
          </Button>
          <Button kind="secondary" size="sm" disabled={!hasNext} onClick={onNext}>
            Next 50
            <ArrowRight aria-hidden className="size-4" strokeWidth={1.75} />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
