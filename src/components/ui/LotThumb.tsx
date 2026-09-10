import { cn } from '@/lib/cn';
import { isPublishable } from '@/lib/content/assets';
import { lotContent } from '@/lib/content/lots';

/**
 * A small lot photograph for cabinet rows and lists.
 *
 * The cabinets used to carry no imagery at all, which made them read as a
 * spreadsheet next to the public pages. This is the smallest thing that fixes
 * that without touching the density: the plate keeps its footprint whether or
 * not the file may be published, so no row changes height when rights change.
 */
export function LotThumb({
  lotId,
  size = 40,
  className,
}: {
  lotId: bigint | number | string;
  size?: number;
  className?: string;
}) {
  const asset = lotContent(lotId)?.image ?? null;
  const publishable = isPublishable(asset ?? undefined);

  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-sunken',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {publishable && asset ? (
        <img
          src={asset.src}
          alt=""
          width={asset.width}
          height={asset.height}
          loading="lazy"
          decoding="async"
          className="size-full object-contain p-1"
        />
      ) : (
        <svg viewBox="0 0 24 24" className="size-1/2 text-ink-secondary/50" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M8 3h8v5a4 4 0 0 1-1.2 2.8L14 12v9H10v-9l-.8-1.2A4 4 0 0 1 8 8V3Z" />
        </svg>
      )}
    </span>
  );
}
