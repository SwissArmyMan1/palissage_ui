import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { LotThumb } from '@/components/ui/LotThumb';
import type { ActivityItem } from './activity';

export function ActivityFeed({
  items,
  limit = 6,
  className,
}: {
  items: readonly ActivityItem[];
  limit?: number;
  className?: string;
}) {
  const shown = items.slice(0, limit);

  if (shown.length === 0) {
    return (
      <p className={cn('text-body-sm text-ink-secondary', className)}>
        Nothing has been recorded against this wallet yet.
      </p>
    );
  }

  return (
    <ul className={cn('enter-stagger divide-y divide-edge-subtle', className)}>
      {shown.map((item) => (
        <li key={item.id}>
          {/* One column, not four: this list lives in a 340 px aside, and a
              money column there truncated every title to "600 bot…". */}
          <Link to={item.to} className="row-hover flex items-start gap-3 py-3 pr-2">
            <LotThumb lotId={item.lotId} size={36} />
            <span className="min-w-0 flex-1">
              <span className="block text-body-sm">{item.title}</span>
              <span className="block text-body-sm text-ink-secondary">
                {item.meta}
                {item.amount ? <> · <span className="tabular-nums">{item.amount}</span></> : null}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
