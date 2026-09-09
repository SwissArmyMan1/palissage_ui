import { useParams } from 'react-router-dom';
import { Plate } from '@/components/ui/Plate';
import { Callout } from '@/components/ui/Callout';
import { SkeletonCardGrid } from '@/components/ui/Skeleton';
import { LotCard } from '@/components/patterns/LotCard';
import { producerBySlug } from '@/lib/content/producers';
import { lotIdsOfProducer } from '@/lib/content/lots';
import { useLots, useOffers, useProtocol } from '@/chain/lens';
import { primaryOffer } from '@/chain/select';
import { PAYMENT_TOKEN } from '@/chain/config';
import { NotFound } from './NotFound';

/** PUB-05. One producer and their lots. */
export default function Producer() {
  const { slug } = useParams();
  const producer = producerBySlug(slug);
  const lots = useLots();
  const offers = useOffers();
  const protocol = useProtocol();

  if (!producer) return <NotFound what={`the producer “${slug ?? ''}”`} />;

  const ids = new Set(lotIdsOfProducer(producer.slug).map(String));
  const theirs = lots.items.filter((lot) => ids.has(String(lot.id)));
  const decimals = protocol.data?.paymentDecimals ?? PAYMENT_TOKEN.decimals;

  return (
    <>
      <section className="bg-page py-12">
        <div className="shell">
          <Plate
            asset={producer.hero}
            alt={producer.name}
            ratio="16 / 7"
            sizes="(min-width: 1024px) 1100px, 92vw"
          />
          <div className="mt-8 max-w-reading">
            <p className="text-body-sm text-ink-secondary">
              {producer.place} · {producer.appellation}
              {producer.organic ? ' · certified organic' : ''}
            </p>
            <h1 className="mt-2 t-h1">{producer.name}</h1>
            <p className="mt-6 text-body text-ink-secondary">{producer.story}</p>
            <Callout tone="info" className="mt-6">
              {producer.relationship}
            </Callout>
          </div>
        </div>
      </section>

      <section className="bg-surface py-16" aria-labelledby="producer-lots">
        <div className="shell reveal">
          <h2 id="producer-lots" className="t-h1">
            Lots from this producer
          </h2>
          {lots.isLoading ? (
            <div className="mt-12">
              <SkeletonCardGrid count={3} />
            </div>
          ) : theirs.length === 0 ? (
            <p className="mt-6 text-body text-ink-secondary">
              No lot from this producer is published on Base Sepolia right now.
            </p>
          ) : (
            <div className="reveal-stagger mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {theirs.map((lot) => (
                <LotCard
                  key={String(lot.id)}
                  lot={lot}
                  offer={primaryOffer(offers.items, lot.id)}
                  paymentDecimals={decimals}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
