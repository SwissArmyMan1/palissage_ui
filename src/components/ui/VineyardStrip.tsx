import { ASSETS, type ImageAsset } from '@/lib/content/assets';
import { cn } from '@/lib/cn';
import { Plate } from './Plate';

/** Decorative photography, kept separate from text and operational controls. */
export function VineyardStrip({
  asset = ASSETS.vineyardPanorama,
  className,
}: {
  asset?: ImageAsset;
  className?: string;
}) {
  return (
    <div aria-hidden="true">
      <Plate
        asset={asset}
        alt=""
        ratio="8 / 1"
        sizes="(min-width: 1024px) 1100px, 100vw"
        className={cn('h-20 w-full md:h-24', className)}
      />
    </div>
  );
}
