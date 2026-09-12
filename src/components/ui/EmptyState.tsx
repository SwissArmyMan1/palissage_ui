import { useLocale } from '@/lib/i18n/context';
import { cn } from '@/lib/cn';
import { LinkButton } from './Button';

/**
 * Two variants with different jobs: first-run teaches what the collection is
 * for; filtered-to-zero offers an escape. Never a blank region, never a bare
 * "No data" (doc 03).
 */
export function EmptyState({
  variant = 'first-run',
  title,
  body,
  action,
  onClear,
  clearLabel = 'Clear filters',
  children,
  className,
}: {
  variant?: 'first-run' | 'filtered' | 'success';
  title: string;
  body?: string;
  action?: { label: string; to: string };
  onClear?: () => void;
  clearLabel?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { t } = useLocale();
  return (
    <div
      className={cn(
        'rounded-xl border border-dashed border-edge-strong px-6 py-12 text-center',
        variant === 'success' && 'border-solid border-edge-subtle bg-surface',
        className,
      )}
    >
      {/* An empty state is a region heading directly under the page h1. */}
      <h2 className={cn('t-h3', variant === 'success' && 'text-ink-secondary')}>{title}</h2>
      {body ? (
        <p className="mx-auto mt-2 max-w-reading text-body-sm text-ink-secondary">{body}</p>
      ) : null}
      {children ? <div className="mt-4">{children}</div> : null}
      {(action || onClear) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {action ? (
            <LinkButton to={action.to} kind={variant === 'filtered' ? 'secondary' : 'primary'}>
              {t(action.label)}
            </LinkButton>
          ) : null}
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="text-body-sm font-medium text-accent underline decoration-transparent underline-offset-4 transition-colors duration-fast ease-out hover:decoration-current"
            >
              {t(clearLabel)}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
