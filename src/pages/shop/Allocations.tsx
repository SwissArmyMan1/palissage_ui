import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CabinetPage, PageHeader } from '@/components/layout/PageHeader';
import { ConnectPrompt } from '@/components/layout/ConnectPrompt';
import { useAllocationsOfBuyer, useLots, useProtocol } from '@/chain/lens';
import { PAYMENT_TOKEN } from '@/chain/config';
import { formatCount, formatDeadline, formatMoney } from '@/lib/format';
import { allocationState } from '@/lib/enums';

/**
 * SHO-05. `Dense list` grouped by required action, because the buyer's question
 * is "what do I owe and when", not "compare eight attributes". The columns live
 * on the detail screen.
 */
export default function Allocations() {
  const { address, isConnected } = useAccount();
  const allocations = useAllocationsOfBuyer(address);
  const lots = useLots();
  const protocol = useProtocol();
  const decimals = protocol.data?.paymentDecimals ?? PAYMENT_TOKEN.decimals;

  const groups = useMemo(() => {
    const byLot = new Map(lots.items.map((lot) => [String(lot.id), lot]));
    const rows = allocations.items.map((allocation) => ({
      allocation,
      lot: byLot.get(String(allocation.lotId)),
    }));
    return {
      needsPayment: rows.filter((row) => row.allocation.state === 0 && row.allocation.remaining > 0n),
      settled: rows.filter((row) => row.allocation.state === 1),
      closed: rows.filter((row) => row.allocation.state === 2 || row.allocation.state === 3),
    };
  }, [allocations.items, lots.items]);

  if (!isConnected) {
    return (
      <CabinetPage>
        <PageHeader title="Allocations" />
        <ConnectPrompt what="your allocations" className="mt-8" />
      </CabinetPage>
    );
  }

  const total =
    groups.needsPayment.length + groups.settled.length + groups.closed.length;

  return (
    <CabinetPage>
      <PageHeader
        title="Allocations"
        lede="Everything you have reserved, grouped by what it needs from you."
      />

      <div className="mt-8 space-y-12">
        {allocations.isLoading ? (
          <SkeletonRows count={3} label="Loading your allocations…" />
        ) : total === 0 ? (
          <EmptyState
            title="You have not reserved anything yet."
            body="Reserve an allocation and it appears here with what you owe and when."
            action={{ label: 'Browse lots', to: '/app/shop/market' }}
          />
        ) : (
          <>
            <Group
              title="Needs payment"
              rows={groups.needsPayment}
              decimals={decimals}
              emptyNote="Nothing is outstanding."
            />
            <Group
              title="Paid in full"
              rows={groups.settled}
              decimals={decimals}
              emptyNote="Nothing paid in full yet."
            />
            {groups.closed.length > 0 ? (
              <Group title="Closed" rows={groups.closed} decimals={decimals} emptyNote="" />
            ) : null}
          </>
        )}
      </div>
    </CabinetPage>
  );
}

interface Row {
  allocation: ReturnType<typeof useAllocationsOfBuyer>['items'][number];
  lot?: ReturnType<typeof useLots>['items'][number];
}

function Group({
  title,
  rows,
  decimals,
  emptyNote,
}: {
  title: string;
  rows: Row[];
  decimals: number;
  emptyNote: string;
}) {
  return (
    <section aria-labelledby={`group-${title}`}>
      <h2 id={`group-${title}`} className="t-h3">
        {title}
        <span className="ml-2 text-body-sm font-normal text-ink-secondary tabular-nums">
          {rows.length}
        </span>
      </h2>

      {rows.length === 0 ? (
        <p className="mt-3 text-body-sm text-ink-secondary">{emptyNote}</p>
      ) : (
        <ul className="mt-4 divide-y divide-edge-subtle">
          {rows.map(({ allocation, lot }) => {
            const state = allocationState(allocation.state);
            return (
              <li key={String(allocation.id)} className="flex flex-wrap items-center gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/app/shop/allocations/${allocation.id}`}
                    className="text-body font-medium underline decoration-transparent underline-offset-4 hover:decoration-current"
                  >
                    {lot?.name ?? `Lot #${String(allocation.lotId)}`}
                  </Link>
                  <p className="text-body-sm text-ink-secondary tabular-nums">
                    {formatCount(allocation.quantity)} bottles · allocation #{String(allocation.id)}
                    {allocation.remaining > 0n
                      ? ` · due ${formatDeadline(allocation.fullPaymentDeadline)}`
                      : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-body font-medium tabular-nums">
                    {allocation.remaining > 0n
                      ? formatMoney(allocation.remaining, decimals)
                      : formatMoney(allocation.totalDue, decimals)}
                  </p>
                  <p className="text-body-sm text-ink-secondary">
                    {allocation.remaining > 0n ? 'outstanding' : 'paid'}
                  </p>
                </div>
                <StatusBadge tone={allocation.overdue && allocation.state === 0 ? 'danger' : state.tone}>
                  {allocation.overdue && allocation.state === 0 ? 'Past the deadline' : state.label}
                </StatusBadge>
                <LinkButton
                  to={`/app/shop/allocations/${allocation.id}`}
                  kind="secondary"
                  size="sm"
                >
                  {allocation.remaining > 0n ? 'Pay' : 'Open'}
                </LinkButton>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
