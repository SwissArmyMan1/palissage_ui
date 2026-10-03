import { useFormat } from '@/lib/i18n/useFormat';
import { useLocale } from '@/lib/i18n/context';
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
import { lotContent, lotImage, lotProducer } from '@/lib/content/lots';
import { formatCount } from '@/lib/format';
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
  const { t } = useLocale();
  const { formatBps, formatDeadline, formatMoney } = useFormat();
  const { lotId } = useParams();
  const [tab, setTab] = useState<string>('overview');

  const parsed = /^\d+$/.test(lotId ?? '') ? BigInt(lotId!) : undefined;
  const { lot, exists, isLoading, isError } = useLot(parsed);
  const offers = useOffersOfLot(parsed);
  const protocol = useProtocol();

  if (parsed === undefined || (!isLoading && !isError && !exists)) {
    return <NotFound what={t('lot {id}', { id: lotId ?? '' })} />;
  }

  if (isLoading || !lot) {
    return (
      <div className="shell py-12">
        <LoadingRegion label={t('Loading the lot…')}>
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
          { label: t(content?.appellation ?? lot.region), to: '/lots' },
          { label: lot.name },
        ]}
      />

      <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={state.tone}>{t(state.label)}</StatusBadge>
            {offer ? (
              <StatusBadge tone={offer.kind === 1 ? 'info' : 'neutral'}>
                {offer.kind === 1 ? t('En Primeur') : t('Current release')}
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
              t(content?.appellation ?? lot.region),
              lot.grapes || content?.grapes || undefined,
              content?.alcohol,
              `${formatCount(lot.bottleSizeMl)} ml`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>

          <Plate
            asset={lotImage(lot.id)}
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
                    {t(content.note)}{' '}
                    <span className="text-body-sm">
                      {t('(Producer-supplied description. Not recorded on the selected network.)')}
                    </span>
                  </p>
                ) : null}

                <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  <Row label={t('Bottles in this lot')} value={formatCount(lot.totalBottles)} />
                  <Row label={t('Minted so far')} value={formatCount(lot.mintedBottles)} />
                  <Row label={t('In circulation')} value={formatCount(lot.circulating)} />
                  <Row label={t('Delivered and burned')} value={formatCount(lot.redeemedBottles)} />
                  <Row label={t('Committed to offers')} value={formatCount(lot.offeredBottles)} />
                  <Row label={t('Producer royalty on resale')} value={formatBps(lot.royaltyBps)} />
                  <Row label={t('Vintage')} value={String(lot.vintage)} />
                  <Row
                    label={t('Export eligibility')}
                    value={
                      lot.exportAllowed ? 'Marked as export eligible' : 'Not marked for export'
                    }
                  />
                </dl>

                <Callout tone="info" title={t('What this record is')}>
                  {t(
                    'The lot, its bottle count and its verification are on the selected network. The description, photograph and grape blend are supplied by the producer and held off-chain.',
                  )}
                </Callout>
              </div>
            </TabPanel>

            <TabPanel id="offers" active={tab === 'offers'}>
              <h2 className="t-h3">{t('Offers on this lot')}</h2>
              {offers.items.filter(isPayable).length === 0 ? (
                <p className="mt-4 text-body-sm text-ink-secondary">
                  {t('No offer is open on this lot in {symbol} right now.', { symbol })}
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-edge-subtle">
                  {offers.items.filter(isPayable).map((row) => {
                    const phase = offerPhase(row.phase);
                    return (
                      <li key={String(row.id)} className="flex flex-wrap items-center gap-4 py-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-body font-medium">
                            {t('Offer #')}
                            {String(row.id)} ·{' '}
                            {row.kind === 1 ? t('En Primeur') : t('Current release')}
                          </p>
                          <p className="text-body-sm text-ink-secondary tabular-nums">
                            {formatMoney(row.pricePerBottle, decimals)} {t(' per bottle ·')}{' '}
                            {formatCount(row.available)} {t(' of ')}
                            {formatCount(row.quantity)} {t(' left')}
                            {row.depositBps > 0
                              ? t(' · {percent} deposit', { percent: formatBps(row.depositBps) })
                              : ''}
                          </p>
                        </div>
                        <StatusBadge tone={phase.tone}>{t(phase.label)}</StatusBadge>
                        {row.phase === 1 ? (
                          <LinkButton to={`/app/shop/reserve/${row.id}`} size="sm">
                            {t('Reserve bottles')}
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
              <h2 className="t-h3">{t('Production')}</h2>
              <div className="mt-6">
                <TrellisLifecycle
                  stage={lot.production}
                  variant="static"
                  label={t('Production stage of {name}', { name: lot.name })}
                />
              </div>
              <p className="mt-6 max-w-reading text-body-sm text-ink-secondary">
                {readyForDelivery
                  ? t(
                      'This lot is marked ready for delivery, so a holder can request physical delivery of their bottles.',
                    )
                  : t(
                      'This lot is at {stage}. Delivery opens when the producer marks the lot ready for delivery. Production moves forward only.',
                      { stage: t(stage).toLowerCase() },
                    )}
              </p>
            </TabPanel>

            <TabPanel id="activity" active={tab === 'activity'}>
              <h2 className="t-h3">{t('Activity')}</h2>
              <p className="mt-4 max-w-reading text-body-sm text-ink-secondary">
                {t(
                  'This interface reads current state, not an event history — it does not run an indexer, so it will not show you a timeline it has not verified. The token’s full transfer and mint history is on the selected network.',
                )}
              </p>
              <div className="mt-6 space-y-3">
                <Row label={t('Token id')} value={`#${String(lot.id)}`} />
                <Row
                  label={t('Producer wallet')}
                  value={<AddressValue address={lot.winery} label={t('producer wallet')} />}
                />
                <a
                  href={tokenUrl(lot.id)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-block text-body-sm font-medium text-accent underline underline-offset-4"
                >
                  {t('See every transfer of this lot on the block explorer')}
                </a>
              </div>
            </TabPanel>
          </div>

          {/* Producer, at the foot of the record */}
          <aside className="mt-16 card p-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <Plate asset={producer.hero} alt="" ratio="1 / 1" className="w-28 shrink-0" />
              <div className="min-w-0 flex-1 space-y-3">
                <h2 className="t-h3">{producer.name}</h2>
                <p className="text-body-sm text-ink-secondary">{t(producer.story)}</p>
                <p className="text-body-sm text-ink-secondary">{t(producer.relationship)}</p>
                <LinkButton to={`/producers/${producer.slug}`} kind="secondary" size="sm">
                  {t('See the producer')}
                </LinkButton>
              </div>
            </div>
          </aside>
        </div>

        {/* ---- Terms rail ------------------------------------------------- */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6 shadow-1">
            <p className="t-caption text-ink-secondary">{t('Price per bottle')}</p>
            <p className="mt-2 t-metric text-[2.25rem]">
              {offer ? formatMoney(offer.pricePerBottle, decimals) : '—'}
            </p>
            <p className="mt-1 text-body-sm text-ink-secondary">
              {formatCount(lot.bottleSizeMl)} {t(' ml · whole bottles only')}
            </p>

            <dl className="mt-6 space-y-4 border-t border-edge-subtle pt-6">
              <Row
                label={t('Available')}
                value={
                  offer
                    ? t('{available} of {total} bottles', {
                        available: formatCount(offer.available),
                        total: formatCount(lot.totalBottles),
                      })
                    : '—'
                }
              />
              <Row
                label={offer && offer.phase === 0 ? t('Offer opens') : t('Offer closes')}
                value={
                  offer ? formatDeadline(offer.phase === 0 ? offer.startTime : offer.endTime) : '—'
                }
              />
              <Row
                label={t('Payment')}
                value={
                  offer
                    ? offer.depositBps > 0
                      ? t('Full payment, or {percent} deposit', {
                          percent: formatBps(offer.depositBps),
                        })
                      : 'Full payment at reservation'
                    : '—'
                }
              />
              <Row label={t('Settled in')} value={symbol} />
              <Row label={t('Producer royalty on resale')} value={formatBps(lot.royaltyBps)} />
              <Row
                label={t('Delivery')}
                value={readyForDelivery ? 'Available now' : 'Opens at Ready for delivery'}
              />
            </dl>

            {offer && offer.phase === 1 ? (
              <LinkButton to={`/app/shop/reserve/${offer.id}`} fullWidth className="mt-6">
                {t('Reserve bottles')}
              </LinkButton>
            ) : (
              <Button fullWidth disabled className="mt-6">
                {offer ? t(offerPhase(offer.phase).label) : t('No open offer')}
              </Button>
            )}

            <p className="mt-4 text-body-sm text-ink-secondary">
              {t(
                'Reserving requires a wallet qualified as a B2B buyer. Shipping, duties and taxes are not included.',
              )}
            </p>
            <ExplorerLink address={lot.winery} className="mt-4">
              {t('Producer wallet on the selected network')}
            </ExplorerLink>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  const { t } = useLocale();
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <dt className="text-body-sm text-ink-secondary">{label}</dt>
      <dd className="text-body-sm font-medium tabular-nums">
        {typeof value === 'string' ? t(value) : value}
      </dd>
    </div>
  );
}
