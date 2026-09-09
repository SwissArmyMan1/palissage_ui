import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReadContracts } from 'wagmi';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AddressValue } from '@/components/ui/Mono';
import { CabinetPage, PageHeader } from '@/components/layout/PageHeader';
import { ActionReview } from '@/components/patterns/ActionReview';
import { useLots, useOffers, useProtocol } from '@/chain/lens';
import { useCapabilities } from '@/chain/roles';
import { palissageLensAbi, primaryMarketAbi } from '@/chain/abis';
import { CONTRACTS, PAYMENT_TOKEN } from '@/chain/config';
import { useTx } from '@/chain/tx';
import { formatBps, formatMoney } from '@/lib/format';
import type { SettlementView } from '@/chain/types';

interface Pending {
  offerId: bigint;
  lotName: string;
  winery: `0x${string}`;
  index: number;
  description: string;
  bps: number;
  amount: bigint;
}

/**
 * ADM-06. Confirming a milestone releases a share of a producer's escrow, so
 * each row states the amount the confirmation would release before the button
 * is offered.
 */
export default function AdminMilestones() {
  const offers = useOffers();
  const lots = useLots();
  const protocol = useProtocol();
  const caps = useCapabilities();
  const [confirming, setConfirming] = useState<Pending | null>(null);
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

  const pending = useMemo<Pending[]>(() => {
    const byLot = new Map(lots.items.map((lot) => [String(lot.id), lot.name]));
    const rows: Pending[] = [];
    offers.items.forEach((offer, index) => {
      const settlement = settlements.data?.[index]?.result as SettlementView | undefined;
      if (!settlement || settlement.settledFunds === 0n) return;
      settlement.milestones.forEach((milestone, milestoneIndex) => {
        if (milestone.released) return;
        rows.push({
          offerId: offer.id,
          lotName: byLot.get(String(offer.lotId)) ?? `Lot #${String(offer.lotId)}`,
          winery: offer.winery,
          index: milestoneIndex,
          description: milestone.description || `Milestone ${milestoneIndex + 1}`,
          bps: milestone.bps,
          amount: (settlement.settledFunds * BigInt(milestone.bps)) / 10_000n,
        });
      });
    });
    return rows;
  }, [offers.items, lots.items, settlements.data]);

  const loading = offers.isLoading || settlements.isLoading;

  return (
    <CabinetPage>
      <PageHeader
        title="Milestones"
        lede="Production checkpoints waiting for a verifier. Confirming one releases the agreed share of that offer's escrow to the producer."
      />

      <div className="mt-8 space-y-8">
        {!caps.canConfirmMilestone ? (
          <Callout tone="warning" title="You can read this queue but not confirm">
            Confirming a milestone needs the verifier role on the primary market. This wallet does
            not hold it.
          </Callout>
        ) : null}

        {loading ? (
          <SkeletonRows count={3} label="Loading milestones…" />
        ) : pending.length === 0 ? (
          <EmptyState
            variant="success"
            title="No milestone is waiting."
            body="A milestone only appears here once buyers have paid into that offer's escrow."
          />
        ) : (
          <ul className="divide-y divide-edge-subtle">
            {pending.map((row) => (
              <li key={`${row.offerId}-${row.index}`} className="flex flex-wrap items-center gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-body font-medium">{row.description}</p>
                  <p className="text-body-sm text-ink-secondary tabular-nums">
                    <Link
                      to={`/app/winery/offers/${row.offerId}`}
                      className="underline decoration-transparent underline-offset-4 hover:decoration-current"
                    >
                      Offer #{String(row.offerId)}
                    </Link>{' '}
                    · {row.lotName} · {row.bps} bps
                  </p>
                  <p className="text-body-sm text-ink-secondary">
                    Producer <AddressValue address={row.winery} label="producer wallet" />
                  </p>
                </div>
                <p className="shrink-0 text-body font-medium tabular-nums">
                  {formatMoney(row.amount, decimals)}
                </p>
                <StatusBadge tone="warning">Awaiting confirmation</StatusBadge>
                <Button
                  size="sm"
                  disabled={!caps.canConfirmMilestone}
                  onClick={() => setConfirming(row)}
                >
                  Confirm
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {confirming ? (
        <ConfirmMilestone
          pending={confirming}
          decimals={decimals}
          onClose={() => setConfirming(null)}
        />
      ) : null}
    </CabinetPage>
  );
}

function ConfirmMilestone({
  pending,
  decimals,
  onClose,
}: {
  pending: Pending;
  decimals: number;
  onClose: () => void;
}) {
  const tx = useTx();
  return (
    <ActionReview
      open
      onClose={onClose}
      title={`Confirm “${pending.description}”`}
      object={
        <div className="space-y-1">
          <p className="text-body font-medium">{pending.lotName}</p>
          <p className="text-body-sm text-ink-secondary tabular-nums">
            Offer #{String(pending.offerId)} · milestone {pending.index + 1} · {pending.bps} bps (
            {formatBps(pending.bps)})
          </p>
        </div>
      }
      consequence={
        <p>
          {formatMoney(pending.amount, decimals)} becomes withdrawable by the producer, less the
          protocol fee. Confirmation is recorded against your address and cannot be withdrawn.
        </p>
      }
      steps={[
        {
          id: 'confirm',
          label: `Confirm and release ${formatMoney(pending.amount, decimals)}`,
          required: true,
          run: () =>
            tx.send({
              address: CONTRACTS.primaryMarket,
              abi: primaryMarketAbi,
              functionName: 'confirmMilestone',
              args: [pending.offerId, BigInt(pending.index)],
            }),
          tx,
        },
      ]}
    />
  );
}
