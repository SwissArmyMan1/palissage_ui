import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button, LinkButton } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { Plate } from '@/components/ui/Plate';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton, LoadingRegion } from '@/components/ui/Skeleton';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { AddressValue, ExplorerLink } from '@/components/ui/Mono';
import { TrellisLifecycle } from '@/components/patterns/TrellisLifecycle';
import { EvidencePanel } from '@/components/patterns/EvidencePanel';
import { useLot, useOffersOfLot, useProtocol } from '@/chain/lens';
import { isPayable, primaryOffer } from '@/chain/select';
import { PAYMENT_TOKEN, tokenUrl } from '@/chain/config';
import { lotContent, lotProducer } from '@/lib/content/lots';
import {
  formatBps,
  formatCount,
  formatDeadline,
  formatMoney,
} from '@/lib/format';
import { lotState, offerPhase, productionStage, PRODUCTION_STAGES } from '@/lib/enums';
import { NotFound } from './NotFound';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'offers', label: 'Offers' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'production', label: 'Production' },
  { id: 'activity', label: 'Activity' },
] as const;

/**
 * PUB-03. `Detail pane / record view` — one object's full state, deep-linkable.
 *
 * An unknown lot id renders SYS-01 with the id echoed. It never falls back to
 * the first lot.
 */
export default function LotDetail() {
  const { lotId } = useParams();
  const [tab, setTab] = useState<string>('overview');

  const parsed = /^\d+$/.test(lotId ?? '') ? BigInt(lotId!) : undefined;
  const { lot, exists, isLoading, isError } = useLot(parsed);
  const offers = useOffersOfLot(parsed);
  const protocol = useProtocol();

  if (parsed === undefined || (!isLoading && !isError && !exists)) {
    return <NotFound what={`lot ${lotId ?? ''}`} />;
  }

  if (isLoading || !lot) {
    return (
      <div className="shell py-12">
        <LoadingRegion label="Loading the lot…">
          <div className="grid gap-12 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-12 w-96" />
              <Skeleton className="aspect-[4/3] w-full" />
            </div>
            <Skeleton className="h-72 w-full" />
          </div>
        </LoadingRegion>
      </div>
    );
  }

  const content = lotContent(lot.id);
  const producer = lotProducer(lot.id);
  const decimals = protocol.data?.paymentDecimals ?? PAYMENT_TOKEN.decimals;
  const symbol = protocol.data?.paymentSymbol ?? PAYMENT_TOKEN.symbol;
  const offer = primaryOffer(offers.items, lot.id);
  const state = lotState(lot.status);
  const stage = productionStage(lot.production);
  const readyForDelivery = lot.production === PRODUCTION_STAGES.length - 1;

  return (
    <div className="shell py-8 md:py-12">
      <Breadcrumb
        trail={[
          { label: 'Lots', to: '/lots' },
          { label: content?.appellation ?? lot.region, to: '/lots' },
          { label: lot.name },
        ]}
      />

      <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
            {offer ? (
              <StatusBadge tone={offer.kind === 1 ? 'info' : 'neutral'}>
                {offer.kind === 1 ? 'En Primeur' : 'Current release'}
              </StatusBadge>
            ) : null}
          </div>

          <p className="mt-4 text-body-sm text-ink-secondary">
            <Link to={`/producers/${producer.slug}`} className="hover:text-ink">
              {producer.name}
            </Link>
          </p>
          <h1 className="mt-2 t-h1">{lot.name}</h1>
          <p className="mt-3 text-body text-ink-secondary">
            {[
              content?.appellation ?? lot.region,
              content?.grapes || lot.grapes || undefined,
              content?.alcohol,
              `${formatCount(lot.bottleSizeMl)} ml`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>

          <Plate
            asset={content?.image ?? null}
            alt={`${lot.name} — ${producer.name}`}
            ratio="4 / 3"
            className="mt-8"
            sizes="(min-width: 1024px) 720px, 92vw"
          />

          <Tabs tabs={TABS} value={tab} onChange={setTab} className="mt-12" />

          <div className="mt-8 space-y-12">
            <TabPanel id="overview" active={tab === 'overview'}>
              <div className="space-y-8">
                {content?.note ? (
                  <p className="max-w-reading text-body text-ink-secondary">
                    {content.note}{' '}
                    <span className="text-body-sm">
                      (Producer-supplied description. Not recorded on Base.)
                    </span>
                  </p>
                ) : null}

                <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  <Row label="Bottles in this lot" value={formatCount(lot.totalBottles)} />
                  <Row label="Minted so far" value={formatCount(lot.mintedBottles)} />
                  <Row label="In circulation" value={formatCount(lot.circulating)} />
                  <Row label="Delivered and burned" value={formatCount(lot.redeemedBottles)} />
                  <Row label="Committed to offers" value={formatCount(lot.offeredBottles)} />
                  <Row label="Producer royalty on resale" value={formatBps(lot.royaltyBps)} />
                  <Row label="Vintage" value={String(lot.vintage)} />
                  <Row
                    label="Export eligibility"
                    value={lot.exportAllowed ? 'Marked as export eligible' : 'Not marked for export'}
                  />
                </dl>

                <Callout tone="info" title="What this record is">
                  The lot, its bottle count and its verification are on Base. The description,
                  photograph and grape blend are supplied by the producer and held off-chain.
                </Callout>
              </div>
            </TabPanel>

            <TabPanel id="offers" active={tab === 'offers'}>
              <h2 className="t-h3">Offers on this lot</h2>
              {offers.items.filter(isPayable).length === 0 ? (
                <p className="mt-4 text-body-sm text-ink-secondary">
                  No offer is open on this lot in {symbol} right now.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-edge-subtle">
                  {offers.items.filter(isPayable).map((row) => {
                    const phase = offerPhase(row.phase);
                    return (
                      <li key={String(row.id)} className="flex flex-wrap items-center gap-4 py-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-body font-medium">
                            Offer #{String(row.id)} · {row.kind === 1 ? 'En Primeur' : 'Current release'}
                          </p>
                          <p className="text-body-sm text-ink-secondary tabular-nums">
                            {formatMoney(row.pricePerBottle, decimals)} per bottle ·{' '}
                            {formatCount(row.available)} of {formatCount(row.quantity)} left
                            {row.depositBps > 0 ? ` · ${formatBps(row.depositBps)} deposit` : ''}
                          </p>
                        </div>
                        <StatusBadge tone={phase.tone}>{phase.label}</StatusBadge>
                        {row.phase === 1 ? (
                          <LinkButton to={`/app/shop/reserve/${row.id}`} size="sm">
                            Reserve bottles
                          </LinkButton>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </TabPanel>

            <TabPanel id="evidence" active={tab === 'evidence'}>
              <EvidencePanel lot={lot} />
            </TabPanel>

            <TabPanel id="production" active={tab === 'production'}>
              <h2 className="t-h3">Production</h2>
              <div className="mt-6">
                <TrellisLifecycle
                  stage={lot.production}
                  variant="static"
                  label={`Production stage of ${lot.name}`}
                />
              </div>
              <p className="mt-6 max-w-reading text-body-sm text-ink-secondary">
                {readyForDelivery
                  ? 'This lot is marked ready for delivery, so a holder can request physical delivery of their bottles.'
                  : `This lot is at ${stage.toLowerCase()}. Delivery opens when the producer marks the lot ready for delivery. Production moves forward only.`}
              </p>
            </TabPanel>

            <TabPanel id="activity" active={tab === 'activity'}>
              <h2 className="t-h3">Activity</h2>
              <p className="mt-4 max-w-reading text-body-sm text-ink-secondary">
                This interface reads current state, not an event history — it does not run an
                indexer, so it will not show you a timeline it has not verified. The token’s full
                transfer and mint history is on Base.
              </p>
              <div className="mt-6 space-y-3">
                <Row label="Token id" value={`#${String(lot.id)}`} />
                <Row label="Producer wallet" value={<AddressValue address={lot.winery} label="producer wallet" />} />
                <a
                  href={tokenUrl(lot.id)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-block text-body-sm font-medium text-accent underline underline-offset-4"
                >
                  See every transfer of this lot on Basescan
                </a>
              </div>
            </TabPanel>
          </div>

          {/* Producer, at the foot of the record */}
          <aside className="mt-16 card p-6">
            <div className="flex flex-wrap gap-6">
              <Plate asset={producer.hero} alt="" ratio="1 / 1" className="w-28 shrink-0" />
              <div className="min-w-0 flex-1 space-y-3">
                <h2 className="t-h3">{producer.name}</h2>
                <p className="text-body-sm text-ink-secondary">{producer.story}</p>
                <p className="text-body-sm text-ink-secondary">{producer.relationship}</p>
                <LinkButton to={`/producers/${producer.slug}`} kind="secondary" size="sm">
                  See the producer
                </LinkButton>
              </div>
            </div>
          </aside>
        </div>

        {/* ---- Terms rail ------------------------------------------------- */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6 shadow-1">
            <p className="t-caption text-ink-secondary">Price per bottle</p>
            <p className="mt-2 t-metric text-[2.25rem]">
              {offer ? formatMoney(offer.pricePerBottle, decimals) : '—'}
            </p>
            <p className="mt-1 text-body-sm text-ink-secondary">
              {formatCount(lot.bottleSizeMl)} ml · whole bottles only
            </p>

            <dl className="mt-6 space-y-4 border-t border-edge-subtle pt-6">
              <Row
                label="Available"
                value={
                  offer
                    ? `${formatCount(offer.available)} of ${formatCount(lot.totalBottles)} bottles`
                    : '—'
                }
              />
              <Row
                label={offer && offer.phase === 0 ? 'Offer opens' : 'Offer closes'}
                value={offer ? formatDeadline(offer.phase === 0 ? offer.startTime : offer.endTime) : '—'}
              />
              <Row
                label="Payment"
                value={
                  offer
                    ? offer.depositBps > 0
                      ? `Full payment, or ${formatBps(offer.depositBps)} deposit`
                      : 'Full payment at reservation'
                    : '—'
                }
              />
              <Row label="Settled in" value={symbol} />
              <Row label="Producer royalty on resale" value={formatBps(lot.royaltyBps)} />
              <Row
                label="Delivery"
                value={readyForDelivery ? 'Available now' : 'Opens at Ready for delivery'}
              />
            </dl>

            {offer && offer.phase === 1 ? (
              <LinkButton to={`/app/shop/reserve/${offer.id}`} fullWidth className="mt-6">
                Reserve bottles
              </LinkButton>
            ) : (
              <Button fullWidth disabled className="mt-6">
                {offer ? offerPhase(offer.phase).label : 'No open offer'}
              </Button>
            )}

            <p className="mt-4 text-body-sm text-ink-secondary">
              Reserving requires a wallet qualified as a B2B buyer. Shipping, duties and taxes are
              not included.
            </p>
            <ExplorerLink address={lot.winery} className="mt-4">
              Producer wallet on Base
            </ExplorerLink>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <dt className="text-body-sm text-ink-secondary">{label}</dt>
      <dd className="text-body-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}
