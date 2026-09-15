import { useLocale } from '@/lib/i18n/context';

/** Step counter and a bar. The counter is content, not decoration: it is read. */
export function TourProgress({ index, total }: { index: number; total: number }) {
  const { t } = useLocale();
  const pct = total <= 1 ? 1 : (index + 1) / total;

  return (
    <span className="flex items-center gap-2">
      <span className="text-caption normal-case tracking-normal tabular-nums text-ink-secondary">
        {t('{current} of {total}', { current: index + 1, total })}
      </span>
      <span
        aria-hidden
        className="h-[3px] w-20 overflow-hidden rounded-full bg-edge-subtle sm:w-24"
      >
        <span
          className="block h-full origin-left rounded-full bg-accent transition-transform duration-base ease-out"
          style={{ transform: `scaleX(${pct})`, width: '100%' }}
        />
      </span>
    </span>
  );
}
