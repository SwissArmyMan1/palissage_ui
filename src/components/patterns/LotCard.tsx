import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { formatCount, formatMoney } from '@/lib/format';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Plate } from '@/components/ui/Plate';
import { lotContent, lotProducer } from '@/lib/content/lots';
import type { LotView, OfferView } from '@/chain/types';

/**
 * `Responsive card grid` member. Driven by its container, not the viewport, so
 * one card serves a 3-up marketing grid, a 2-up sidebar slot and a full-width
 * mobile list without three variants (doc 06 §1).
 *
 * On touch the whole card is the target; the hover lift exists only where
 * hovering is real.
 */
export function LotCard({
  lot,
  offer,
  paymentDecimals,
  className,
}: {
  lot: LotView;
  offer?: OfferView;
  paymentDecimals: number;
  className?: string;
}) {
  const content = lotContent(lot.id);
  const producer = lotProducer(lot.id);
  const soldOut = offer ? offer.phase === 2 || offer.available === 0 : false;
  const enPrimeur = offer?.kind === 1;

  return (
    <article className={cn('[container-type:inline-size]', className)}>
      <Link
        to={`/lots/${lot.id}`}
        className="card hoverable group block h-full overflow-hidden shadow-1"
      >
        <Plate
          asset={content?.image ?? null}
          alt={`${lot.name} — ${producer.name}`}
          ratio="4 / 3"
          className="rounded-none"
          sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 92vw"
        fit="contain"
        />

        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {enPrimeur ? (
              <StatusBadge tone="info">En Primeur</StatusBadge>
            ) : soldOut ? (
              <StatusBadge tone="neutral">Sold out</StatusBadge>
            ) : lot.status === 1 ? (
              <StatusBadge tone="success">Verified</StatusBadge>
            ) : (
              <StatusBadge tone="neutral">Draft</StatusBadge>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-body-sm text-ink-secondary">{producer.name}</p>
            <h2 className="t-h2 text-[clamp(1.125rem,0.9rem+0.9cqi,1.5rem)]">{lot.name}</h2>
            <p className="text-body-sm text-ink-secondary">
              {[content?.appellation ?? lot.region, content?.grapes].filter(Boolean).join(' · ')}
            </p>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3 border-t border-edge-subtle pt-3">
            <div>
              <p className={cn('t-metric text-2xl', soldOut && 'text-ink-secondary')}>
                {offer ? formatMoney(offer.pricePerBottle, paymentDecimals) : '—'}
              </p>
              <p className="text-body-sm text-ink-secondary">
                per bottle · {formatCount(lot.bottleSizeMl)} ml
              </p>
            </div>
            <p className="text-body-sm text-ink-secondary tabular-nums">
              {soldOut
                ? 'Sold out'
                : offer
                  ? `${formatCount(offer.available)} of ${formatCount(lot.totalBottles)} available`
                  : 'No open offer'}
            </p>
          </div>
        </div>
      </Link>
    </article>
  );
}
