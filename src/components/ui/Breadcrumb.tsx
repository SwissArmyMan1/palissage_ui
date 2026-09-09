import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

export function Breadcrumb({
  trail,
  className,
}: {
  trail: readonly { label: string; to?: string }[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={cn('text-body-sm text-ink-secondary', className)}>
      <ol className="flex flex-wrap items-center gap-2">
        {trail.map((crumb, index) => {
          const last = index === trail.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="flex items-center gap-2">
              {crumb.to && !last ? (
                <Link
                  to={crumb.to}
                  className="underline decoration-transparent underline-offset-4 transition-colors duration-fast ease-out hover:text-ink hover:decoration-current"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} className={last ? 'text-ink' : undefined}>
                  {crumb.label}
                </span>
              )}
              {last ? null : <span aria-hidden>/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
