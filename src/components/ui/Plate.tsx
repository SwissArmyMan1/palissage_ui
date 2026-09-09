import { cn } from '@/lib/cn';
import { isPublishable, type ImageAsset } from '@/lib/content/assets';

/**
 * An image slot that respects the rights register.
 *
 * Doc 08 §3: only files marked `granted` may be published. Everything else
 * renders the designed placeholder plate carrying its own caption — which is
 * exactly what the approved Figma frames show, rather than a broken promise.
 *
 * The aspect ratio is always fixed so nothing shifts when the file lands (CLS).
 */
export function Plate({
  asset,
  ratio = '4 / 5',
  className,
  alt,
  priority = false,
  sizes,
  drift = false,
  fit = 'cover',
}: {
  asset: ImageAsset | null | undefined;
  ratio?: string;
  className?: string;
  alt: string;
  /** The LCP image only: eager, high priority, never lazy. */
  priority?: boolean;
  sizes?: string;
  /** Ambient scroll-linked drift, desktop only, <= 3% travel. */
  drift?: boolean;
  /** Packshots are portrait bottles: `contain` keeps the label in frame. */
  fit?: 'cover' | 'contain';
}) {
  const publishable = isPublishable(asset ?? undefined);

  return (
    <div
      className={cn('relative overflow-hidden rounded-xl bg-surface-sunken', className)}
      style={{ aspectRatio: ratio }}
    >
      {publishable && asset ? (
        <img
          src={asset.src}
          alt={alt}
          width={asset.width}
          height={asset.height}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          fetchPriority={priority ? 'high' : 'auto'}
          className={cn(
            'size-full',
            fit === 'contain' ? 'object-contain p-4' : 'object-cover',
            drift && 'hero-drift',
          )}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center p-4 text-center">
          <span className="text-body-sm text-ink-secondary">
            {asset?.caption ?? 'Photograph pending'}
          </span>
        </div>
      )}
    </div>
  );
}
