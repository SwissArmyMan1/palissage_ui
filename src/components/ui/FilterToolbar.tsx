import { useLocale } from '@/lib/i18n/context';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Search, chips, result count, clear. Filters are a popover on desktop and a
 * bottom sheet on mobile — the trigger carries the active count as a badge.
 *
 * Under 12 items the filter rail is hidden and only sort is offered; that is the
 * launch state and the caller decides (doc 03).
 */
export function FilterToolbar({
  search,
  onSearch,
  chips,
  onClear,
  count,
  countNoun = 'lots',
  onOpenFilters,
  activeCount = 0,
  showFilters = true,
  className,
}: {
  search: string;
  onSearch: (value: string) => void;
  chips?: readonly { id: string; label: string; onRemove: () => void }[];
  onClear?: () => void;
  count: number;
  countNoun?: string;
  onOpenFilters?: () => void;
  activeCount?: number;
  showFilters?: boolean;
  className?: string;
}) {
  const { t } = useLocale();
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-secondary"
            strokeWidth={1.75}
          />
          <label htmlFor="catalogue-search" className="sr-only">
            {t('Search lots and producers')}
          </label>
          <input
            id="catalogue-search"
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={t('Search lots and producers')}
            className="min-h-[42px] w-full rounded-md border border-edge-field bg-surface pl-9 pr-3 text-body-sm transition-colors duration-fast ease-out hover:border-ink-secondary"
          />
        </div>

        {showFilters && onOpenFilters ? (
          <button
            type="button"
            onClick={onOpenFilters}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-md border border-edge-strong bg-surface px-3 text-body-sm transition-colors duration-fast ease-out hover:bg-surface-sunken"
          >
            <SlidersHorizontal aria-hidden className="size-4" strokeWidth={1.75} />
            {t('Filters')}
            {activeCount > 0 ? (
              <span className="rounded-full bg-accent px-1.5 text-caption font-semibold text-ink-onaccent">
                {activeCount}
              </span>
            ) : null}
          </button>
        ) : null}

        <p className="ml-auto text-body-sm text-ink-secondary" aria-live="polite">
          {count} {t(countNoun)}
        </p>
      </div>

      {chips && chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <span
              key={chip.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent-subtle px-3 py-1 text-body-sm text-accent"
            >
              {t(chip.label)}
              <button
                type="button"
                onClick={chip.onRemove}
                aria-label={t('Remove filter {label}', { label: chip.label })}
                className="grid size-5 place-items-center rounded-full hover:bg-accent/15"
              >
                <X aria-hidden className="size-3" strokeWidth={2} />
              </button>
            </span>
          ))}
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="text-body-sm font-medium text-ink-secondary underline underline-offset-4 hover:text-ink"
            >
              {t('Clear filters')}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
