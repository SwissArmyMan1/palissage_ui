import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAccount, useReadContracts } from 'wagmi';
import { LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTiles } from '@/components/ui/Skeleton';
import { StatTile } from '@/components/ui/StatTile';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CabinetPage, PageHeader } from '@/components/layout/PageHeader';
import { ConnectPrompt } from '@/components/layout/ConnectPrompt';
import {
  useLotsOfWinery,
  useOffersOfWinery,
  useProtocol,
  useRedemptionsOfWinery,
} from '@/chain/lens';
import { palissageLensAbi } from '@/chain/abis';
import { CONTRACTS, PAYMENT_TOKEN } from '@/chain/config';
import { formatCount, formatMoney } from '@/lib/format';
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

  const settlements = useReadContracts({
    contracts: offers.items.map((offer) => ({
      address: CONTRACTS.palissageLens,
      abi: palissageLensAbi,
      functionName: 'settlement' as const,
      args: [offer.id] as const,
    })),
    query: { enabled: offers.items.length > 0, refetchInterval: 12_000 },
  });

  const withdrawable = useMemo(
    () =>
      (settlements.data ?? []).reduce(
        (sum, entry) => sum + ((entry?.result as SettlementView | undefined)?.withdrawable ?? 0n),
        0n,
      ),
    [settlements.data],
  );

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

  const firstRun = !lots.isLoading && lots.items.length === 0;

  return (
    <CabinetPage>
      <PageHeader
        title="Overview"
        action={<LinkButton to="/app/winery/lots/new">Create a lot</LinkButton>}
      />

      <div className="mt-8 space-y-8">
        {lots.isLoading ? (
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
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              <StatTile
                label="Withdrawable now"
                value={formatMoney(withdrawable, decimals)}
                footnote={`${milestoneCounts.released} of ${milestoneCounts.total} milestones confirmed`}
                action={
                  withdrawable > 0n ? (
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
                <ul className="mt-4 divide-y divide-edge-subtle">
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

            <p className="text-body-sm text-ink-secondary">
              Offers and allocations live on each lot.{' '}
              <Link to="/app/winery/lots" className="text-accent underline underline-offset-4">
                See all your lots
              </Link>
              .
            </p>
          </>
        )}
      </div>
    </CabinetPage>
  );
}
