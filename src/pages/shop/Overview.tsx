import { useMemo } from 'react';
import { useAccount } from 'wagmi';
import { LinkButton } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTiles } from '@/components/ui/Skeleton';
import { StatTile } from '@/components/ui/StatTile';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LotThumb } from '@/components/ui/LotThumb';
import { CabinetPage, PageHeader } from '@/components/layout/PageHeader';
import { ConnectPrompt } from '@/components/layout/ConnectPrompt';
import { ActivityFeed } from '@/components/patterns/ActivityFeed';
import { buildActivity } from '@/components/patterns/activity';
import {
  useAllocationsOfBuyer,
  useLots,
  usePositions,
  useProtocol,
  useRedemptionsOfBuyer,
} from '@/chain/lens';
import { PAYMENT_TOKEN } from '@/chain/config';
import { formatCount, formatDeadline, formatMoney } from '@/lib/format';
import { allocationState } from '@/lib/enums';

/**
 * SHO-01. What needs paying, what is arriving, what can be listed.
 *
 * Every figure is read from the Lens. Where v1's dashboard printed a total and
 * a month-on-month delta, both invented, this shows the three numbers the
 * contracts can actually answer for one wallet.
 */
export default function ShopOverview() {
  const { address, isConnected } = useAccount();
  const allocations = useAllocationsOfBuyer(address);
  const redemptions = useRedemptionsOfBuyer(address);
  const lots = useLots();
  const protocol = useProtocol();

  const ids = useMemo(() => lots.items.map((lot) => lot.id), [lots.items]);
  const positions = usePositions(address, ids);
  const decimals = protocol.data?.paymentDecimals ?? PAYMENT_TOKEN.decimals;

  const lotName = useMemo(() => {
    const byId = new Map(lots.items.map((lot) => [String(lot.id), lot.name]));
    return (id: bigint) => byId.get(String(id)) ?? `Lot #${String(id)}`;
  }, [lots.items]);

  const outstanding = allocations.items
    .filter((a) => a.state === 0)
    .reduce((sum, a) => sum + a.remaining, 0n);
  const held = positions.items.reduce((sum, p) => sum + p.balance, 0n);
  const transferable = positions.items.reduce((sum, p) => sum + p.transferable, 0n);
  const openDeliveries = redemptions.items.filter((r) => r.state === 0 || r.state === 1);
  const awaitingConfirm = redemptions.items.filter((r) => r.state === 1);
  const duePayments = allocations.items.filter((a) => a.state === 0 && a.remaining > 0n);

  const activity = useMemo(
    () =>
      buildActivity({
        allocations: allocations.items,
        redemptions: redemptions.items,
        lotName,
        protocol: protocol.data,
        allocationHref: (id) => `/app/shop/allocations/${id}`,
        deliveryHref: () => '/app/shop/deliveries',
      }),
    [allocations.items, redemptions.items, lotName, protocol.data],
  );

  if (!isConnected) {
    return (
      <CabinetPage>
        <PageHeader title="Overview" />
        <ConnectPrompt what="what you owe and what you hold" className="mt-8" />
      </CabinetPage>
    );
  }

  const hasData = allocations.hasData && lots.hasData;
  const nothingYet = hasData && allocations.items.length === 0 && held === 0n;

  return (
    <CabinetPage>
      <PageHeader
        title="Overview"
        action={<LinkButton to="/app/shop/market">Browse the market</LinkButton>}
      />

      <div className="mt-8 space-y-8">
        {!hasData ? (
          <SkeletonTiles count={3} />
        ) : nothingYet ? (
          <EmptyState
            title="You have not reserved anything yet."
            body="Reserve an allocation and it appears here with what you owe and when. Bottles arrive in your portfolio once an allocation is paid in full."
            action={{ label: 'Browse the market', to: '/app/shop/market' }}
          />
        ) : (
          <>
            <div className="enter-stagger grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              <StatTile
                label="Outstanding balance"
                value={formatMoney(outstanding, decimals)}
                tone={outstanding > 0n ? 'danger' : 'default'}
                footnote={
                  duePayments.length > 0
                    ? `${duePayments.length} ${duePayments.length === 1 ? 'allocation' : 'allocations'} still to pay`
                    : 'Nothing outstanding'
                }
                action={
                  outstanding > 0n ? (
                    <LinkButton to="/app/shop/allocations" kind="secondary" size="sm">
                      Open allocations
                    </LinkButton>
                  ) : undefined
                }
              />
              <StatTile
                label="Bottles you hold"
                value={formatCount(held)}
                footnote={
                  held > 0n
                    ? `${formatCount(transferable)} transferable today`
                    : 'Minted only when an allocation is paid in full'
                }
                action={
                  held > 0n ? (
                    <LinkButton to="/app/shop/portfolio" kind="secondary" size="sm">
                      Open portfolio
                    </LinkButton>
                  ) : undefined
                }
              />
              <StatTile
                label="Deliveries in progress"
                value={String(openDeliveries.length)}
                tone={awaitingConfirm.length > 0 ? 'accent' : 'default'}
                footnote={
                  awaitingConfirm.length > 0
                    ? `${awaitingConfirm.length} shipped and waiting for you to confirm`
                    : 'Bottles are held in escrow until you confirm receipt'
                }
                action={
                  openDeliveries.length > 0 ? (
                    <LinkButton to="/app/shop/deliveries" kind="secondary" size="sm">
                      Open deliveries
                    </LinkButton>
                  ) : undefined
                }
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <section className="card p-6" aria-labelledby="needs-you">
                <h2 id="needs-you" className="t-h3">
                  What needs you
                </h2>

                {duePayments.length + awaitingConfirm.length === 0 ? (
                  <p className="mt-4 text-body-sm text-ink-secondary">
                    Nothing is waiting on you right now.
                  </p>
                ) : (
                  <ul className="enter-stagger mt-4 divide-y divide-edge-subtle">
                    {duePayments.map((allocation) => {
                      const state = allocationState(allocation.state);
                      return (
                        <li key={`pay-${allocation.id}`} className="flex flex-wrap items-center gap-4 py-4">
                          <LotThumb lotId={allocation.lotId} size={44} />
                          <div className="min-w-0 flex-1">
                            <p className="text-body">{lotName(allocation.lotId)}</p>
                            <p className="text-body-sm text-ink-secondary tabular-nums">
                              {formatMoney(allocation.remaining, decimals)} due{' '}
                              {formatDeadline(allocation.fullPaymentDeadline)}
                            </p>
                          </div>
                          <StatusBadge tone={allocation.overdue ? 'danger' : state.tone}>
                            {allocation.overdue ? 'Past the deadline' : state.label}
                          </StatusBadge>
                          <LinkButton
                            to={`/app/shop/allocations/${allocation.id}`}
                            kind="secondary"
                            size="sm"
                          >
                            Pay
                          </LinkButton>
                        </li>
                      );
                    })}

                    {awaitingConfirm.map((redemption) => (
                      <li key={`del-${redemption.id}`} className="flex flex-wrap items-center gap-4 py-4">
                        <LotThumb lotId={redemption.lotId} size={44} />
                        <div className="min-w-0 flex-1">
                          <p className="text-body">
                            {formatCount(redemption.quantity)} bottles shipped ·{' '}
                            {lotName(redemption.lotId)}
                          </p>
                          <p className="text-body-sm text-ink-secondary">
                            Confirming receipt burns them on-chain.
                          </p>
                        </div>
                        <StatusBadge tone="info">Shipped</StatusBadge>
                        <LinkButton to="/app/shop/deliveries" kind="secondary" size="sm">
                          Confirm
                        </LinkButton>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <aside className="card p-6">
                <h2 className="t-h3">Recent</h2>
                <p className="mt-1 text-body-sm text-ink-secondary">
                  From the records themselves, not from an event log.
                </p>
                <ActivityFeed items={activity} className="mt-4" />
              </aside>
            </div>

            {held > 0n && transferable === 0n ? (
              <Callout tone="info">
                Every bottle you hold is currently frozen, so nothing can be listed or delivered
                until that changes.
              </Callout>
            ) : null}
          </>
        )}
      </div>
    </CabinetPage>
  );
}
