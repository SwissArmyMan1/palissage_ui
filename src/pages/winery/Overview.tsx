import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTiles } from '@/components/ui/Skeleton';
import { StatTile } from '@/components/ui/StatTile';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CabinetPage, PageHeader } from '@/components/layout/PageHeader';
import { ConnectPrompt } from '@/components/layout/ConnectPrompt';
import { useAllocationsOfOffers, useLotsOfWinery, useOffersOfWinery, useProtocol, useRedemptionsOfWinery, useSettlements } from '@/chain/lens';

import { LotThumb } from '@/components/ui/LotThumb';
import { ActivityFeed } from '@/components/patterns/ActivityFeed';
import { buildActivity } from '@/components/patterns/activity';
import { offerPhase } from '@/lib/enums';
import { tokenMeta } from '@/chain/tokens';

import { PAYMENT_TOKEN } from '@/chain/config';
import { formatBps, formatCount, formatMoney } from '@/lib/format';
import { nextProductionStage, productionStage } from '@/lib/enums';
import type { SettlementView } from '@/chain/types';

/**
 * WIN-01. `Stat tile row` then a "what needs you" `Dense list`.
 *
 * All three tiles are actionable, which is the condition the stat-tile entry
 * puts on using them at all: money you can take out, lots blocking a sale, and
 * money buyers still owe.
 */
export default function WineryOverview() {
  const { address, isConnected } = useAccount();
  const lots = useLotsOfWinery(address);
  const offers = useOffersOfWinery(address);
  const redemptions = useRedemptionsOfWinery(address);
  const protocol = useProtocol();
  const decimals = protocol.data?.paymentDecimals ?? PAYMENT_TOKEN.decimals;

  const settlements = useSettlements(offers.items.map((offer) => offer.id));

  const allocations = useAllocationsOfOffers(offers.items.map((offer) => offer.id)).items;

  const lotName = useMemo(() => {
    const byId = new Map(lots.items.map((lot) => [String(lot.id), lot.name]));
    return (id: bigint) => byId.get(String(id)) ?? `Lot #${String(id)}`;
  }, [lots.items]);

  const activity = useMemo(
    () =>
      buildActivity({
        allocations,
        redemptions: redemptions.items,
        lotName,
        protocol: protocol.data,
        allocationHref: () => '/app/winery/finance',
        deliveryHref: (id) => `/app/winery/deliveries/${id}`,
      }),
    [allocations, redemptions.items, lotName, protocol.data],
  );

  // What a producer can still act on comes first; the pre-EURC records last.
  const orderedOffers = useMemo(
    () =>
      offers.items
        .map((offer, index) => ({ offer, index }))
        .sort((a, b) => {
          const rank = (o: typeof a.offer) =>
            (tokenMeta(o.paymentToken, protocol.data).settlement ? 0 : 2) + (o.phase === 1 ? 0 : 1);
          const byRank = rank(a.offer) - rank(b.offer);
          return byRank !== 0 ? byRank : Number(b.offer.id - a.offer.id);
        }),
    [offers.items, protocol.data],
  );

  /**
   * Only the settlement asset. The per-offer rows below have been asset-aware
   * since the EURC migration, but this tile was still adding 18-decimal base
   * units to 6-decimal ones and printing the result as euros.
   */
  const { withdrawable, legacyWithdrawable } = useMemo(() => {
    let current = 0n;
    let legacy = 0n;
    for (const entry of settlements.data ?? []) {
      const view = entry?.result as SettlementView | undefined;
      if (!view) continue;
      if (tokenMeta(view.paymentToken, protocol.data).settlement) current += view.withdrawable;
      else legacy += view.withdrawable;
    }
    return { withdrawable: current, legacyWithdrawable: legacy };
  }, [settlements.data, protocol.data]);

  const milestoneCounts = useMemo(() => {
    let released = 0;
    let total = 0;
    for (const entry of settlements.data ?? []) {
      const settlement = entry?.result as SettlementView | undefined;
      for (const milestone of settlement?.milestones ?? []) {
        total += 1;
        if (milestone.released) released += 1;
      }
    }
    return { released, total };
  }, [settlements.data]);

  const drafts = lots.items.filter((lot) => lot.status === 0);
  const advanceable = lots.items.filter((lot) => lot.status === 1 && lot.production < 6);
  const openRedemptions = redemptions.items.filter((redemption) => redemption.state === 0);

  if (!isConnected) {
    return (
      <CabinetPage>
        <PageHeader title="Overview" />
        <ConnectPrompt what="your lots and escrow" className="mt-8" />
      </CabinetPage>
    );
  }

  const firstRun = lots.hasData && lots.items.length === 0;

  return (
    <CabinetPage>
      <PageHeader
        tour="winery-overview-header"
        title="Overview"
        action={<LinkButton to="/app/winery/lots/new">Create a lot</LinkButton>}
      />

      <div className="mt-8 space-y-8">
        {!lots.hasData ? (
          <SkeletonTiles count={3} />
        ) : firstRun ? (
          <EmptyState
            title="Publish your first lot."
            body="A lot is one batch of wine. Describe it, attach your production documents, and an operator verifies it before you can sell."
            action={{ label: 'Create a lot', to: '/app/winery/lots/new' }}
          >
            <ol className="mx-auto max-w-reading space-y-2 text-left text-body-sm text-ink-secondary">
              <li>1. Describe the batch and its bottle count.</li>
              <li>2. An operator verifies it and records your documents’ hash on Base.</li>
              <li>3. Publish an offer, and set the milestones that release the money.</li>
            </ol>
          </EmptyState>
        ) : (
          <>
            <div className="enter-stagger grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              <StatTile
                label="Withdrawable now"
                value={
                  withdrawable === 0n && legacyWithdrawable > 0n
                    ? '—'
                    : formatMoney(withdrawable, decimals)
                }
                footnote={
                  legacyWithdrawable > 0n
                    ? `${milestoneCounts.released} of ${milestoneCounts.total} milestones confirmed · escrow in a retired asset is shown in Finance`
                    : `${milestoneCounts.released} of ${milestoneCounts.total} milestones confirmed`
                }
                action={
                  withdrawable > 0n || legacyWithdrawable > 0n ? (
                    <LinkButton to="/app/winery/finance" kind="secondary" size="sm">
                      Open finance
                    </LinkButton>
                  ) : undefined
                }
              />
              <StatTile
                label="Awaiting verification"
                value={`${drafts.length} ${drafts.length === 1 ? 'lot' : 'lots'}`}
                tone={drafts.length > 0 ? 'warning' : 'default'}
                footnote={
                  drafts.length > 0
                    ? 'A draft cannot be offered for sale until an operator verifies it'
                    : 'Every lot is verified'
                }
              />
              <StatTile
                label="Delivery requests open"
                value={`${openRedemptions.length}`}
                tone={openRedemptions.length > 0 ? 'accent' : 'default'}
                footnote={
                  openRedemptions.length > 0
                    ? 'Bottles are in escrow until you ship and the buyer confirms'
                    : 'Nothing waiting to ship'
                }
                action={
                  openRedemptions.length > 0 ? (
                    <LinkButton to="/app/winery/deliveries" kind="secondary" size="sm">
                      Open deliveries
                    </LinkButton>
                  ) : undefined
                }
              />
            </div>

            <section className="card p-6" aria-labelledby="needs-you">
              <h2 id="needs-you" className="t-h3">
                What needs you
              </h2>

              {drafts.length + advanceable.length + openRedemptions.length === 0 ? (
                <p className="mt-4 text-body-sm text-ink-secondary">
                  Nothing is waiting on you right now.
                </p>
              ) : (
                <ul className="enter-stagger mt-4 divide-y divide-edge-subtle">
                  {drafts.map((lot) => (
                    <li key={`draft-${lot.id}`} className="flex flex-wrap items-center gap-4 py-4">
                      <StatusBadge tone="neutral">Draft</StatusBadge>
                      <div className="min-w-0 flex-1">
                        <p className="text-body">{lot.name} is a draft</p>
                        <p className="text-body-sm text-ink-secondary">
                          Attach the production documents and submit it for verification.
                        </p>
                      </div>
                      <LinkButton to={`/app/winery/lots/${lot.id}`} kind="secondary" size="sm">
                        Open the lot
                      </LinkButton>
                    </li>
                  ))}

                  {advanceable.slice(0, 3).map((lot) => {
                    const next = nextProductionStage(lot.production);
                    return (
                      <li key={`stage-${lot.id}`} className="flex flex-wrap items-center gap-4 py-4">
                        <StatusBadge tone="success">{productionStage(lot.production)}</StatusBadge>
                        <div className="min-w-0 flex-1">
                          <p className="text-body">
                            {lot.name} can advance to {next}
                          </p>
                          <p className="text-body-sm text-ink-secondary">
                            Production moves forward only; the change cannot be undone.
                          </p>
                        </div>
                        <LinkButton to={`/app/winery/lots/${lot.id}`} kind="secondary" size="sm">
                          Open the lot
                        </LinkButton>
                      </li>
                    );
                  })}

                  {openRedemptions.map((redemption) => (
                    <li key={`red-${redemption.id}`} className="flex flex-wrap items-center gap-4 py-4">
                      <StatusBadge tone="warning">Requested</StatusBadge>
                      <div className="min-w-0 flex-1">
                        <p className="text-body">
                          {formatCount(redemption.quantity)} bottles are waiting to ship
                        </p>
                        <p className="text-body-sm text-ink-secondary">
                          Attach the shipment documents, then mark it shipped.
                        </p>
                      </div>
                      <LinkButton
                        to={`/app/winery/deliveries/${redemption.id}`}
                        kind="secondary"
                        size="sm"
                      >
                        Open the request
                      </LinkButton>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
              <section className="card p-6" aria-labelledby="your-offers">
                <h2 id="your-offers" className="t-h3">
                  Your offers
                </h2>
                {offers.items.length === 0 ? (
                  <p className="mt-4 text-body-sm text-ink-secondary">
                    No offer published yet. An offer is what turns a verified lot into something a
                    buyer can reserve.
                  </p>
                ) : (
                  <ul className="enter-stagger mt-4 divide-y divide-edge-subtle">
                    {orderedOffers.map(({ offer, index }) => {
                      const phase = offerPhase(offer.phase);
                      const settlement = settlements.data?.[index]?.result as
                        | SettlementView
                        | undefined;
                      // Each offer is priced in its own token: this deployment
                      // still holds records from before the move to EURC.
                      const meta = tokenMeta(offer.paymentToken, protocol.data);
                      return (
                        <li key={String(offer.id)} className="flex flex-wrap items-center gap-4 py-4">
                          <LotThumb lotId={offer.lotId} size={44} />
                          <div className="min-w-0 flex-1">
                            <p className="text-body font-medium">{lotName(offer.lotId)}</p>
                            <p className="text-body-sm text-ink-secondary tabular-nums">
                              {meta.known ? formatMoney(offer.pricePerBottle, meta.decimals) : '—'} ·{' '}
                              {formatCount(offer.reserved)} of {formatCount(offer.quantity)} reserved
                              {offer.depositBps > 0 ? ` · ${formatBps(offer.depositBps)} deposit` : ''}
                            </p>
                            {meta.settlement ? null : (
                              <p className="text-body-sm text-warning">
                                Priced in {meta.symbol}, which the markets no longer accept.
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-body-sm tabular-nums">
                              {meta.known
                                ? formatMoney(settlement?.settledFunds ?? 0n, meta.decimals)
                                : '—'}
                            </p>
                            <p className="text-body-sm text-ink-secondary">in escrow</p>
                          </div>
                          <StatusBadge tone={phase.tone}>{phase.label}</StatusBadge>
                          <LinkButton
                            to={`/app/winery/offers/${offer.id}`}
                            kind="secondary"
                            size="sm"
                          >
                            Open
                          </LinkButton>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <p className="mt-4 text-body-sm text-ink-secondary">
                  <Link to="/app/winery/lots" className="text-accent underline underline-offset-4">
                    See all your lots
                  </Link>
                </p>
              </section>

              <aside className="card p-6">
                <h2 className="t-h3">Recent</h2>
                <p className="mt-1 text-body-sm text-ink-secondary">
                  From the records themselves, not from an event log.
                </p>
                <ActivityFeed items={activity} className="mt-4" />
              </aside>
            </div>
          </>
        )}
      </div>
    </CabinetPage>
  );
}
