import { cn } from '@/lib/cn';
import { VineyardStrip } from '@/components/ui/VineyardStrip';

/** The app-cabinet page header: title, one line of purpose, and one action. */
export function PageHeader({
  title,
  lede,
  action,
  className,
}: {
  title: string;
  lede?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h1 className="t-h1">{title}</h1>
        {lede ? <p className="mt-3 max-w-reading text-body-sm text-ink-secondary">{lede}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

/** Standard padding for every cabinet screen. */
export function CabinetPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <VineyardStrip className="mb-8" />
      {children}
    </div>
  );
}
