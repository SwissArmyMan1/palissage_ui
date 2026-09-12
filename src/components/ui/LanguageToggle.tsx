import { cn } from '@/lib/cn';
import { useLocale, type Locale } from '@/lib/i18n/context';

export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();
  return (
    <div
      role="group"
      aria-label={t('Language')}
      className={cn('items-center gap-1 text-body-sm', className ?? 'flex')}
    >
      {(['en', 'fr'] as const).map((value: Locale, index) => (
        <span key={value} className="inline-flex items-center gap-1">
          {index ? (
            <span aria-hidden className="text-ink-secondary">
              /
            </span>
          ) : null}
          <button
            type="button"
            lang={value}
            aria-label={value === 'en' ? 'English' : 'Français'}
            aria-pressed={locale === value}
            onClick={() => setLocale(value)}
            className={cn(
              'min-h-9 min-w-8 rounded-sm px-1 transition-colors hover:text-accent',
              locale === value
                ? 'font-semibold text-accent underline decoration-1 underline-offset-4'
                : 'text-ink-secondary',
            )}
          >
            {value.toUpperCase()}
          </button>
        </span>
      ))}
    </div>
  );
}
