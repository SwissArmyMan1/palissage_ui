import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';

import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTiles } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CabinetPage, PageHeader } from '@/components/layout/PageHeader';
import { ConnectPrompt } from '@/components/layout/ConnectPrompt';
import { ActionReview } from '@/components/patterns/ActionReview';
import { useLots, useOffersOfWinery, useProtocol, useSettlements } from '@/chain/lens';
import { primaryMarketAbi } from '@/chain/abis';
import { CONTRACTS, PAYMENT_TOKEN } from '@/chain/config';
import { useTx } from '@/chain/tx';
import { formatBps } from '@/lib/format';
import { formatTokenAmount, tokenMeta, type TokenMeta } from '@/chain/tokens';
import type { OfferView, LotView, SettlementView } from '@/chain/types';

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
 *
 * Every offer carries its own `paymentToken`, and this deployment has been
 * through one settlement-asset change. Totalling across assets would have added
 * 18-decimal base units to 6-decimal ones and printed the result as euros, so
 * the headline covers the settlement asset only and anything else is listed
 * under its own heading, formatted with its own decimals.
 */
export default function Finance() {
  const { address, isConnected } = useAccount();
  const offers = useOffersOfWinery(address);
  const lots = useLots();
  const protocol = useProtocol();
  const [withdrawing, setWithdrawing] = useState<{
    offerId: bigint;
    amount: bigint;
    meta: TokenMeta;
  } | null>(null);

  const settlements = useSettlements(offers.items.map((offer) => offer.id));

  const rows = useMemo(() => {
    const byLot = new Map(lots.items.map((lot) => [String(lot.id), lot]));
    return offers.items.map((offer, index) => ({
      offer,
      lot: byLot.get(String(offer.lotId)),
      settlement: settlements.items[index],
    }));
  }, [offers.items, lots.items, settlements.items]);

  const funded = rows.filter((row) => (row.settlement?.settledFunds ?? 0n) > 0n);

  // Split by asset before anything is added up. `settlement` is the asset the
  // markets accept today; `legacy` is escrow left over from the asset change,
  // still withdrawable but never comparable to the figure above it.
  const current = funded.filter((row) => tokenMeta(row.settlement?.paymentToken, protocol.data).settlement);
  const legacy = funded.filter((row) => !tokenMeta(row.settlement?.paymentToken, protocol.data).settlement);

  const settlementMeta = tokenMeta(PAYMENT_TOKEN.address, protocol.data);
  const withdrawableTotal = current.reduce((sum, row) => sum + (row.settlement?.withdrawable ?? 0n), 0n);
  const settledTotal = current.reduce((sum, row) => sum + (row.settlement?.settledFunds ?? 0n), 0n);
  const withdrawnTotal = current.reduce((sum, row) => sum + (row.settlement?.withdrawnGross ?? 0n), 0n);
  const withdrawableOffers = current.filter((row) => (row.settlement?.withdrawable ?? 0n) > 0n);

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
        {!offers.hasData ? (
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
              <p data-tour="winery-finance-withdrawable" className="t-caption text-ink-secondary">
                Withdrawable now
              </p>
              {/*
                Printing "€0.00 of €0.00" when every funded offer is in the
                retired asset would be two true numbers that together tell a
                lie: there *is* escrow, it is simply not in this asset.
              */}
              {current.length === 0 ? (
                <>
                  <p className="mt-2 t-metric text-[clamp(2rem,1.4rem+2vw,3rem)]">—</p>
                  <p className="mt-3 max-w-reading text-body-sm text-ink-secondary">
                    Nothing of yours is settled in {settlementMeta.symbol} yet. The escrow you do
                    have is in the asset this deployment used before, and it is listed below with
                    its own figures.
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-2 t-metric text-[clamp(2rem,1.4rem+2vw,3rem)]">
                    {formatTokenAmount(withdrawableTotal, settlementMeta)}
                  </p>
                  <p className="mt-3 max-w-reading text-body-sm text-ink-secondary">
                    of {formatTokenAmount(settledTotal, settlementMeta)} settled in escrow, in{' '}
                    {settlementMeta.symbol}. Buyers have paid; funds are released to you as a
                    verifier confirms each production milestone.
                  </p>
                </>
              )}
              {withdrawableOffers.length > 0 ? (
                <Callout tone="info" className="mt-4 max-w-none">
                  Withdrawal is per offer, so taking all of it means{' '}
                  {withdrawableOffers.length === 1
                    ? 'one transaction'
                    : `${withdrawableOffers.length} separate transactions`}
                  . Each offer&rsquo;s own button is on its card below.
                </Callout>
              ) : null}
              {legacy.length > 0 ? (
                <Callout tone="warning" className="mt-4 max-w-none">
                  {legacy.length === 1 ? 'One offer of yours is' : `${legacy.length} offers of yours are`}{' '}
                  denominated in a different asset from your selection, so{' '}
                  {legacy.length === 1 ? 'its' : 'their'} escrow is not part of the figure above.
                  It is listed separately below, in its own asset.
                </Callout>
              ) : null}
            </section>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
              <div className="enter-stagger space-y-6">
                {current.length > 0 ? (
                  <h2 className="t-h3">Escrow in {settlementMeta.symbol}</h2>
                ) : null}
                {current.map((row) => (
                  <SettlementCard
                    key={String(row.offer.id)}
                    offer={row.offer}
                    lot={row.lot}
                    settlement={row.settlement}
                    meta={tokenMeta(row.settlement?.paymentToken, protocol.data)}
                    onWithdraw={setWithdrawing}
                  />
                ))}

                {legacy.length > 0 ? (
                  <section aria-labelledby="legacy-heading" className="space-y-6">
                    <div className="border-t border-edge-subtle pt-6">
                      <h2 id="legacy-heading" className="t-h3">
                        Escrow in another payment asset
                      </h2>
                      <p className="mt-2 max-w-reading text-body-sm text-ink-secondary">
                        These offers use a different payment asset from your current selection.
                        Each amount keeps its original token and decimals. Available funds can
                        be withdrawn under the same milestone rules.
                      </p>
                    </div>
                    {legacy.map((row) => (
                      <SettlementCard
                        key={String(row.offer.id)}
                        offer={row.offer}
                        lot={row.lot}
                        settlement={row.settlement}
                        meta={tokenMeta(row.settlement?.paymentToken, protocol.data)}
                        onWithdraw={setWithdrawing}
                      />
                    ))}
                  </section>
                ) : null}
              </div>

              <aside className="space-y-6">
                <div className="card p-6">
                  <p className="t-caption text-ink-secondary">Withdrawn to date</p>
                  <p className="mt-2 t-metric text-2xl">
                    {current.length === 0
                      ? '—'
                      : formatTokenAmount(withdrawnTotal, settlementMeta)}
                  </p>
                  <p className="mt-3 text-body-sm text-ink-secondary">
                    {current.length === 0
                      ? `No offer of yours has settled in ${settlementMeta.symbol} yet.`
                      : `Gross, before the protocol fee, across every offer of yours settled in ${settlementMeta.symbol}.`}
                  </p>
                </div>
                <div className="card p-6">
                  <p className="t-caption text-ink-secondary">Secondary royalties</p>
                  <p className="mt-3 text-body-sm text-ink-secondary">
                    Your royalty is paid to you directly at the moment a resale settles. The read
                    model does not total those payments, so this interface does not print a figure
                    it has not read. Your wallet balance on the selected network is the record.
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
          meta={withdrawing.meta}
          onClose={() => setWithdrawing(null)}
        />
      ) : null}
    </CabinetPage>
  );
}

/**
 * One offer's escrow, formatted in that offer's own asset.
 *
 * Shared by the settlement-asset list and the retired-asset list, because the
 * only difference between them is the asset — the milestone rules, the fee and
 * the withdrawal path are identical.
 */
function SettlementCard({
  offer,
  lot,
  settlement,
  meta,
  onWithdraw,
}: {
  offer: OfferView;
  lot?: LotView;
  settlement?: SettlementView;
  meta: TokenMeta;
  onWithdraw: (next: { offerId: bigint; amount: bigint; meta: TokenMeta }) => void;
}) {
  const withdrawable = settlement?.withdrawable ?? 0n;
  return (
    <section className="card p-6" aria-labelledby={`offer-${offer.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 id={`offer-${offer.id}`} className="t-h3">
            <Link
              to={`/lots/${offer.lotId}`}
              className="underline decoration-transparent underline-offset-4 hover:decoration-current"
            >
              {lot?.name ?? `Lot #${String(offer.lotId)}`}
            </Link>
            <span className="text-ink-secondary">
              {' '}
              · {offer.kind === 1 ? 'En Primeur' : 'Current release'}
            </span>
          </h3>
          <p className="mt-1 text-body-sm text-ink-secondary tabular-nums">
            {formatTokenAmount(settlement?.settledFunds ?? 0n, meta)} settled ·{' '}
            {formatBps(Number(settlement?.releasedBps ?? 0n))} released · protocol fee{' '}
            {formatBps(settlement?.primaryFeeBps ?? 0)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {!meta.settlement ? <StatusBadge tone="neutral">Retired asset</StatusBadge> : null}
          <Button
            size="sm"
            disabled={withdrawable === 0n}
            onClick={() => onWithdraw({ offerId: offer.id, amount: withdrawable, meta })}
          >
            {withdrawable > 0n
              ? `Withdraw ${formatTokenAmount(withdrawable, meta)}`
              : 'Nothing released yet'}
          </Button>
        </div>
      </div>

      <ul className="mt-6 divide-y divide-edge-subtle">
        {(settlement?.milestones ?? []).map((milestone, index) => {
          const share = ((settlement?.settledFunds ?? 0n) * BigInt(milestone.bps)) / 10_000n;
          return (
            <li key={index} className="flex flex-wrap items-center gap-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-body-sm">
                  {milestone.description || `Milestone ${index + 1}`}
                </p>
                <p className="text-body-sm text-ink-secondary tabular-nums">
                  {milestone.bps} bps of the offer
                </p>
              </div>
              <p className="shrink-0 text-body-sm tabular-nums">
                {formatTokenAmount(share, meta)}
              </p>
              <StatusBadge tone={milestone.released ? 'success' : 'warning'}>
                {milestone.released ? 'Released' : 'Awaiting verifier'}
              </StatusBadge>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function WithdrawDialog({
  offerId,
  amount,
  meta,
  onClose,
}: {
  offerId: bigint;
  amount: bigint;
  meta: TokenMeta;
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
          {formatTokenAmount(amount, meta)} released against offer #{String(offerId)}
        </p>
      }
      consequence={
        <p>
          The released share leaves escrow and arrives in your wallet in {meta.symbol}, less the
          protocol fee. Money still held against unconfirmed milestones stays in escrow.
        </p>
      }
      steps={[
        {
          id: 'withdraw',
          label: `Withdraw ${formatTokenAmount(amount, meta)}`,
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
