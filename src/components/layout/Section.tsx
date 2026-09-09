import { cn } from '@/lib/cn';

/**
 * Marketing section rhythm. Sections alternate between the limestone page and
 * the card surface, which is what gives the public pages their structure
 * without a card around every block.
 *
 * `reveal` is the ambient one-shot entrance: 16 px and a fade, 350 ms, scroll
 * driven. It is never applied to the hero, whose headline is the LCP element.
 */
export function Section({
  tone = 'page',
  reveal = true,
  className,
  children,
  labelledBy,
  id,
}: {
  tone?: 'page' | 'surface' | 'sunken';
  reveal?: boolean;
  className?: string;
  children: React.ReactNode;
  labelledBy?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn(
        'py-16 md:py-24',
        tone === 'surface' && 'bg-surface',
        tone === 'sunken' && 'bg-surface-sunken',
        className,
      )}
    >
      <div className={cn('shell', reveal && 'reveal')}>{children}</div>
    </section>
  );
}

export function SectionHead({
  title,
  lede,
  id,
  className,
}: {
  title: string;
  lede?: string;
  id?: string;
  className?: string;
}) {
  return (
    <header className={cn('max-w-reading', className)}>
      <h2 id={id} className="t-h1">
        {title}
      </h2>
      {lede ? <p className="mt-4 text-body text-ink-secondary">{lede}</p> : null}
    </header>
  );
}
