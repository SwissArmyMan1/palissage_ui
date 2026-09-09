import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { Plate } from '@/components/ui/Plate';
import { QuantityField, RadioCard } from '@/components/ui/Field';
import { Skeleton, LoadingRegion } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { FocusedShell } from '@/components/layout/FocusedShell';
import { ActionReview } from '@/components/patterns/ActionReview';
import { FeeBreakdown, reserveLines } from '@/components/patterns/FeeBreakdown';
import {
  useLot,
  useMyParticipant,
  useOffer,
  usePaymentAllowance,
  usePaymentBalance,
  useProtocol,
} from '@/chain/lens';
import { depositDue, offerTotal, protocolFee } from '@/chain/select';
import { erc20Abi, primaryMarketAbi } from '@/chain/abis';
import { CHAIN_ID, CONTRACTS, PAYMENT_TOKEN } from '@/chain/config';
import { useTx } from '@/chain/tx';
import { formatBps, formatCount, formatDeadline, formatMoney, parseBottles } from '@/lib/format';
import { productionStage } from '@/lib/enums';
import { NotFound } from '../public/NotFound';

/**
 * SHO-04. `Multi-step flow` for the decision, `Modal dialog` for the commit.
 *
 * Money moves here, so nothing is optimistic: the allocation is only claimed to
 * exist once the receipt is in. Approve and reserve are two transactions and
 * they run as two steps inside **one** confirmation, never two dialogs.
 *
 * Eligibility names the claim the contract actually checks — `TOPIC_B2B_BUYER`
 * for `reserve`, plus `canReceive` for the mint that follows full payment. KYB
 * is not part of that gate (doc 10 M5).
 */
export default function Reserve() {
  const { offerId } = useParams();
  const navigate = useNavigate();
  const { address, isConnected, chainId } = useAccount();

  const parsed = /^\d+$/.test(offerId ?? '') ? BigInt(offerId!) : undefined;
  const offer = useOffer(parsed);
  const lot = useLot(offer.data?.lotId);
  const protocol = useProtocol();
  const participant = useMyParticipant();
  const balance = usePaymentBalance(address);
  const allowance = usePaymentAllowance(address, CONTRACTS.primaryMarket);

  const [quantity, setQuantity] = useState('');
  const [payFull, setPayFull] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const approveTx = useTx();
  const reserveTx = useTx();

  const decimals = protocol.data?.paymentDecimals ?? PAYMENT_TOKEN.decimals;
  const symbol = protocol.data?.paymentSymbol ?? PAYMENT_TOKEN.symbol;
  const feeBps = protocol.data?.primaryFeeBps ?? 0;

  const view = offer.data;
  const available = view?.available ?? 0;
  const bottles = parseBottles(quantity);

  const quantityError = useMemo(() => {
    if (quantity === '') return undefined;
    if (bottles === null) return 'Enter a whole number of bottles.';
    if (bottles < 1) return 'Enter at least one bottle.';
    if (bottles > available)
      return `Enter a quantity between 1 and ${formatCount(available)} — that is what is uncommitted in this offer.`;
    return undefined;
  }, [quantity, bottles, available]);

  const validQuantity = bottles !== null && bottles >= 1 && bottles <= available;
  const total = view && validQuantity ? offerTotal(view, bottles!) : 0n;
  const deposit = view && validQuantity ? depositDue(view, bottles!) : 0n;
  const dueNow = payFull || (view?.depositBps ?? 0) === 0 ? total : deposit;
  const remaining = total - dueNow;
  const fee = protocolFee(total, feeBps);

  if (parsed === undefined) return <NotFound what={`offer ${offerId ?? ''}`} />;

  if (offer.isLoading || !view) {
    return (
      <FocusedShell title="Reserve allocation">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <LoadingRegion label="Loading the offer…">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px]">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-80 w-full" />
            </div>
          </LoadingRegion>
        </div>
      </FocusedShell>
    );
  }

  const stage = productionStage(lot.lot?.production ?? 0);
  const enPrimeur = view.kind === 1;
  const depositAllowed = view.depositBps > 0;

  // Every blocking condition, named, with what to do about it.
  const blocked = (() => {
    if (!isConnected) return 'Connect a wallet to reserve. Your quantity and choice are kept.';
    if (chainId !== CHAIN_ID)
      return `Your wallet is on another network. Palissage runs on Base Sepolia for this release. Switch network in your wallet — nothing has been submitted.`;
    if (view.phase !== 1) return 'This offer is not open, so it cannot be reserved.';
    if (!participant.data?.b2bClaim)
      return 'This wallet is not qualified as a B2B buyer, so the market contract would reject the reservation. Take the Shop role on the readiness screen.';
    if (!participant.data?.canReceive)
      return 'Bottles cannot be minted to this wallet yet, so a full payment could not settle. Check your readiness.';
    if (!validQuantity) return 'Enter how many bottles you want first.';
    if ((balance.data ?? 0n) < dueNow)
      return `You need ${formatMoney(dueNow, decimals)} of ${symbol} to reserve ${formatCount(
        bottles!,
      )} bottles. This wallet holds ${formatMoney(balance.data ?? 0n, decimals)}.`;
    return undefined;
  })();

  const needsApproval = (allowance.data ?? 0n) < dueNow;

  const steps = [
    {
      id: 'approve',
      label: `Allow Palissage to use ${formatMoney(dueNow, decimals)}`,
      note: `The market can only move the ${symbol} you allow it to move.`,
      required: needsApproval,
      run: () =>
        approveTx.send({
          address: PAYMENT_TOKEN.address,
          abi: erc20Abi,
          functionName: 'approve',
          args: [CONTRACTS.primaryMarket, dueNow],
        }),
      tx: approveTx,
    },
    {
      id: 'reserve',
      label: `Reserve ${formatCount(bottles ?? 0)} bottles`,
      note: 'Creates your allocation and moves the payment into escrow.',
      required: true,
      run: () =>
        reserveTx.send({
          address: CONTRACTS.primaryMarket,
          abi: primaryMarketAbi,
          functionName: 'reserve',
          args: [view.id, bottles!, dueNow],
        }),
      tx: reserveTx,
    },
  ];

  const currentStep = !validQuantity ? 0 : 2;

  return (
    <FocusedShell
      title="Reserve allocation"
      onClose={() => navigate(`/lots/${view.lotId}`)}
    >
      <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
        <StepIndicator steps={['Quantity', 'Payment', 'Review']} current={currentStep} />

        <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-16">
          <div className="min-w-0 space-y-8">
            {/* What is being bought */}
            <div className="card flex gap-4 p-4">
              <Plate
                asset={null}
                alt=""
                ratio="1 / 1"
                className="w-16 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-body-sm text-ink-secondary">Offer #{String(view.id)}</p>
                <p className="t-h3">{lot.lot?.name ?? `Lot #${String(view.lotId)}`}</p>
                <p className="text-body-sm text-ink-secondary">
                  {[lot.lot?.region, enPrimeur ? 'En Primeur' : 'Current release', `production stage: ${stage}`]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            </div>

            {enPrimeur ? (
              <Callout tone="info">
                This is an En Primeur offer. The wine is still on the vine, and delivery cannot be
                requested until the producer marks the lot ready for delivery.
              </Callout>
            ) : null}

            <QuantityField
              label="Bottles to reserve"
              value={quantity}
              onChange={setQuantity}
              max={available}
              error={quantityError}
              hint={`${formatCount(available)} of ${formatCount(view.quantity)} available · whole bottles only`}
            />

            <section aria-labelledby="payment-heading" className="space-y-3">
              <h2 id="payment-heading" className="t-h3">
                Payment
              </h2>
              {depositAllowed ? (
                <>
                  <RadioCard
                    name="payment"
                    value="deposit"
                    checked={!payFull}
                    onChange={() => setPayFull(false)}
                    title={`Pay a ${formatBps(view.depositBps)} deposit now`}
                    body={
                      validQuantity
                        ? `${formatMoney(deposit, decimals)} now · ${formatMoney(
                            total - deposit,
                            decimals,
                          )} due ${formatDeadline(view.fullPaymentDeadline)}`
                        : `The balance is due ${formatDeadline(view.fullPaymentDeadline)}`
                    }
                  />
                  <RadioCard
                    name="payment"
                    value="full"
                    checked={payFull}
                    onChange={() => setPayFull(true)}
                    title={
                      validQuantity
                        ? `Pay ${formatMoney(total, decimals)} in full now`
                        : 'Pay in full now'
                    }
                    body="Bottles are minted as soon as the allocation is paid in full."
                  />
                </>
              ) : (
                <Callout tone="info">
                  This offer requires payment in full at reservation. Bottles are minted straight
                  away.
                </Callout>
              )}
            </section>

            {depositAllowed && !payFull ? (
              <Callout tone="warning">
                A deposit reserves bottles. Bottles are minted only when the allocation is paid in
                full — until then your balance for this lot is zero.
              </Callout>
            ) : null}
          </div>

          {/* ---- Summary rail --------------------------------------------- */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="card p-6 shadow-1">
              <p className="t-caption text-ink-secondary">Summary</p>

              <div className="mt-4">
                {validQuantity ? (
                  <FeeBreakdown
                    lines={reserveLines({
                      quantity: bottles!,
                      pricePerBottle: view.pricePerBottle,
                      decimals,
                      depositBps: payFull ? 0 : view.depositBps,
                      total,
                      dueNow,
                      balance: remaining,
                      fullPaymentDeadline: view.fullPaymentDeadline,
                      feeBps,
                      fee,
                    })}
                    footnotes={[
                      needsApproval
                        ? 'Two transactions: approve, then reserve. Both are shown in one confirmation before anything is submitted.'
                        : `You have already allowed the market to use enough ${symbol}, so this is one transaction.`,
                      'Shipping, duties, taxes and network fees are not included.',
                    ]}
                  />
                ) : (
                  <p className="text-body-sm text-ink-secondary">
                    Enter a quantity to see what you would pay, and when.
                  </p>
                )}
              </div>

              <div className="mt-6 space-y-3 border-t border-edge-subtle pt-6">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={participant.data?.b2bClaim ? 'success' : 'warning'}>
                    {participant.data?.b2bClaim ? 'Eligible' : 'Not eligible yet'}
                  </StatusBadge>
                  <span className="text-body-sm text-ink-secondary">
                    {participant.data?.b2bClaim
                      ? 'B2B buyer claim issued — this is what the market checks.'
                      : 'The market checks the B2B buyer claim.'}
                  </span>
                </div>

                <Button
                  fullWidth
                  disabled={Boolean(blocked)}
                  onClick={() => setReviewing(true)}
                >
                  {validQuantity
                    ? needsApproval
                      ? `Approve ${formatMoney(dueNow, decimals)}`
                      : `Reserve ${formatCount(bottles!)} bottles`
                    : 'Reserve bottles'}
                </Button>

                {blocked ? (
                  <p className="text-body-sm text-ink-secondary">{blocked}</p>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <ActionReview
        open={reviewing}
        onClose={() => {
          setReviewing(false);
          approveTx.reset();
          reserveTx.reset();
        }}
        title="Confirm this reservation"
        object={
          <div className="space-y-1">
            <p className="text-body font-medium">{lot.lot?.name ?? `Lot #${String(view.lotId)}`}</p>
            <p className="text-body-sm text-ink-secondary">
              {formatCount(bottles ?? 0)} bottles · offer #{String(view.id)} ·{' '}
              {enPrimeur ? 'En Primeur' : 'Current release'}
            </p>
          </div>
        }
        summary={
          validQuantity ? (
            <FeeBreakdown
              lines={reserveLines({
                quantity: bottles!,
                pricePerBottle: view.pricePerBottle,
                decimals,
                depositBps: payFull ? 0 : view.depositBps,
                total,
                dueNow,
                balance: remaining,
                fullPaymentDeadline: view.fullPaymentDeadline,
                feeBps,
                fee,
              })}
            />
          ) : null
        }
        consequence={
          <>
            <p>
              {formatMoney(dueNow, decimals)} moves into escrow on Base and{' '}
              {formatCount(bottles ?? 0)} bottles are committed to you.
            </p>
            <p className="mt-2">
              {remaining > 0n
                ? `Bottles are minted when the balance of ${formatMoney(
                    remaining,
                    decimals,
                  )} is paid, by ${formatDeadline(view.fullPaymentDeadline)}. Palissage does not offer a buyer-controlled refund — cancellation is governed by the offer terms and the contract.`
                : 'Bottles are minted to your wallet as part of this transaction.'}
            </p>
          </>
        }
        steps={steps}
        blocked={blocked}
        onDone={() => {
          window.setTimeout(() => navigate('/app/shop/allocations'), 1200);
        }}
      />
    </FocusedShell>
  );
}
