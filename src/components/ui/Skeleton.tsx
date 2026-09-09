import { cn } from '@/lib/cn';

/**
 * Geometry-matched loaders. Skeletons are aria-hidden with one polite message
 * for the region — not dozens of announced boxes (doc 05 §2).
 */
export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div aria-hidden className={cn('skeleton', className)} style={style} />;
}

export function LoadingRegion({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="sr-only" role="status">
        {label}
      </p>
      {children}
    </div>
  );
}

export function SkeletonCardGrid({ count = 6 }: { count?: number }) {
  return (
    <LoadingRegion label="Loading lots…">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="card overflow-hidden">
            <Skeleton className="aspect-[4/3] rounded-none" />
            <div className="space-y-3 p-4">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function SkeletonRows({ count = 5, label = 'Loading rows…' }: { count?: number; label?: string }) {
  return (
    <LoadingRegion label={label}>
      <div className="divide-y divide-edge-subtle">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="flex items-center gap-4 py-4">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function SkeletonTiles({ count = 3 }: { count?: number }) {
  return (
    <LoadingRegion label="Loading figures…">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="card p-6">
            <Skeleton className="h-3 w-28" />
            {/* Reserves the maximum expected value width so tiles never resize. */}
            <Skeleton className="mt-3 h-10 w-40" />
            <Skeleton className="mt-3 h-3 w-32" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}
