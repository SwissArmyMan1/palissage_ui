import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useReadContracts } from 'wagmi';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTiles } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CabinetPage, PageHeader } from '@/components/layout/PageHeader';
import { ConnectPrompt } from '@/components/layout/ConnectPrompt';
import { ActionReview } from '@/components/patterns/ActionReview';
import { useLots, useOffersOfWinery, useProtocol } from '@/chain/lens';
import { palissageLensAbi, primaryMarketAbi } from '@/chain/abis';
import { CONTRACTS, PAYMENT_TOKEN } from '@/chain/config';
import { useTx } from '@/chain/tx';
import { formatBps, formatMoney } from '@/lib/format';
import type { SettlementView } from '@/chain/types';

/**
 * WIN-07. "How much can I take out today", answered honestly.
 *
 * Doc 10 M1 is fixed here. `withdrawReleased(offerId)` is **per offer**, so the
 * headline stays a sum while the action lives on each offer's row, and the page
 * says how many transactions a full withdrawal would take. A single global
 * Withdraw button would promise something the contract cannot do.
 *
 * Secondary royalties are deliberately absent: they are paid directly at each
 * sale and the read model does not aggregate them, so there is no figure this
 * page could print without inventing it.
 */
export default function Finance() {
  const { address, isConnected } = useAccount();
  const offers = useOffersOfWinery(address);
  const lots = useLots();
  const protocol = useProtocol();
  const [withdrawing, setWithdrawing] = useState<{ offerId: bigint; amount: bigint } | null>(null);

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

  const rows = useMemo(() => {
    const byLot = new Map(lots.items.map((lot) => [String(lot.id), lot]));
    return offers.items.map((offer, index) => ({
      offer,
      lot: byLot.get(String(offer.lotId)),
      settlement: settlements.data?.[index]?.result as SettlementView | undefined,
    }));
  }, [offers.items, lots.items, settlements.data]);

  const funded = rows.filter((row) => (row.settlement?.settledFunds ?? 0n) > 0n);
  const withdrawableTotal = funded.reduce((sum, row) => sum + (row.settlement?.withdrawable ?? 0n), 0n);
  const settledTotal = funded.reduce((sum, row) => sum + (row.settlement?.settledFunds ?? 0n), 0n);
  const withdrawnTotal = funded.reduce((sum, row) => sum + (row.settlement?.withdrawnGross ?? 0n), 0n);
  const withdrawableOffers = funded.filter((row) => (row.settlement?.withdrawable ?? 0n) > 0n);

  if (!isConnected) {
    return (
      <CabinetPage>
        <PageHeader title="Finance" />
        <ConnectPrompt what="your escrow and withdrawals" className="mt-8" />
      </CabinetPage>
    );
  }

  return (
    <CabinetPage>
      <PageHeader title="Finance" />

      <div className="mt-8 space-y-8">
        {offers.isLoading ? (
          <SkeletonTiles count={2} />
        ) : funded.length === 0 ? (
          <EmptyState
            title="No money in escrow yet."
            body="When buyers pay, their money is held here and released to you as production milestones are confirmed."
            action={{ label: 'Publish an offer', to: '/app/winery/lots' }}
          />
        ) : (
          <>
            <section className="card p-6 shadow-1">
              <p className="t-caption text-ink-secondary">Withdrawable now</p>
              <p className="mt-2 t-metric text-[clamp(2rem,1.4rem+2vw,3rem)]">
                {formatMoney(withdrawableTotal, decimals)}
              </p>
              <p className="mt-3 max-w-reading text-body-sm text-ink-secondary">
                of {formatMoney(settledTotal, decimals)} settled in escrow. Buyers have paid; funds
                are released to you as a verifier confirms each production milestone.
              </p>
              {withdrawableOffers.length > 0 ? (
                <Callout tone="info" className="mt-4 max-w-none">
                  Withdrawal is per offer, so taking all of it means{' '}
                  {withdrawableOffers.length === 1
                    ? 'one transaction'
                    : `${withdrawableOffers.length} separate transactions`}
                  . Each offer's own button is on its card below.
                </Callout>
              ) : null}
            </section>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
              <div className="space-y-6">
                {funded.map(({ offer, lot, settlement }) => (
                  <section key={String(offer.id)} className="card p-6" aria-labelledby={`offer-${offer.id}`}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 id={`offer-${offer.id}`} className="t-h3">
                          <Link to={`/lots/${offer.lotId}`} className="underline decoration-transparent underline-offset-4 hover:decoration-current">
                            {lot?.name ?? `Lot #${String(offer.lotId)}`}
                          </Link>
                          <span className="text-ink-secondary"> · {offer.kind === 1 ? 'En Primeur' : 'Current release'}</span>
                        </h2>
                        <p className="mt-1 text-body-sm text-ink-secondary tabular-nums">
                          {formatMoney(settlement?.settledFunds ?? 0n, decimals)} settled ·{' '}
                          {formatBps(Number(settlement?.releasedBps ?? 0n))} released · protocol fee{' '}
                          {formatBps(settlement?.primaryFeeBps ?? 0)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        disabled={(settlement?.withdrawable ?? 0n) === 0n}
                        onClick={() =>
                          setWithdrawing({ offerId: offer.id, amount: settlement!.withdrawable })
                        }
                      >
                        {(settlement?.withdrawable ?? 0n) > 0n
                          ? `Withdraw ${formatMoney(settlement!.withdrawable, decimals)}`
                          : 'Nothing released yet'}
                      </Button>
                    </div>

                    <ul className="mt-6 divide-y divide-edge-subtle">
                      {(settlement?.milestones ?? []).map((milestone, index) => {
                        const share =
                          ((settlement?.settledFunds ?? 0n) * BigInt(milestone.bps)) / 10_000n;
                        return (
                          <li
                            key={index}
                            className="flex flex-wrap items-center gap-4 py-3"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-body-sm">{milestone.description || `Milestone ${index + 1}`}</p>
                              <p className="text-body-sm text-ink-secondary tabular-nums">
                                {milestone.bps} bps of the offer
                              </p>
                            </div>
                            <p className="shrink-0 text-body-sm tabular-nums">
                              {formatMoney(share, decimals)}
                            </p>
                            <StatusBadge tone={milestone.released ? 'success' : 'warning'}>
                              {milestone.released ? 'Released' : 'Awaiting verifier'}
                            </StatusBadge>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>

              <aside className="space-y-6">
                <div className="card p-6">
                  <p className="t-caption text-ink-secondary">Withdrawn to date</p>
                  <p className="mt-2 t-metric text-2xl">{formatMoney(withdrawnTotal, decimals)}</p>
                  <p className="mt-3 text-body-sm text-ink-secondary">
                    Gross, before the protocol fee, across every offer of yours.
                  </p>
                </div>
                <div className="card p-6">
                  <p className="t-caption text-ink-secondary">Secondary royalties</p>
                  <p className="mt-3 text-body-sm text-ink-secondary">
                    Your royalty is paid to you directly at the moment a resale settles. The read
                    model does not total those payments, so this interface does not print a figure
                    it has not read. Your wallet balance on Base is the record.
                  </p>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>

      {withdrawing ? (
        <WithdrawDialog
          offerId={withdrawing.offerId}
          amount={withdrawing.amount}
          decimals={decimals}
          onClose={() => setWithdrawing(null)}
        />
      ) : null}
    </CabinetPage>
  );
}

function WithdrawDialog({
  offerId,
  amount,
  decimals,
  onClose,
}: {
  offerId: bigint;
  amount: bigint;
  decimals: number;
  onClose: () => void;
}) {
  const tx = useTx();
  return (
    <ActionReview
      open
      onClose={onClose}
      title={`Withdraw from offer #${String(offerId)}`}
      object={
        <p className="text-body">
          {formatMoney(amount, decimals)} released against offer #{String(offerId)}
        </p>
      }
      consequence={
        <p>
          The released share leaves escrow and arrives in your wallet, less the protocol fee. Money
          still held against unconfirmed milestones stays in escrow.
        </p>
      }
      steps={[
        {
          id: 'withdraw',
          label: `Withdraw ${formatMoney(amount, decimals)}`,
          required: true,
          run: () =>
            tx.send({
              address: CONTRACTS.primaryMarket,
              abi: primaryMarketAbi,
              functionName: 'withdrawReleased',
              args: [offerId],
            }),
          tx,
        },
      ]}
    />
  );
}
