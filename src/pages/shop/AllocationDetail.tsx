import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button, LinkButton } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { Field, TextInput } from '@/components/ui/Field';
import { Skeleton, LoadingRegion } from '@/components/ui/Skeleton';
import { StatTile } from '@/components/ui/StatTile';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ActionReview } from '@/components/patterns/ActionReview';
import {
  useAllocation,
  useLot,
  usePaymentAllowance,
  usePaymentBalance,
  usePositions,
  useProtocol,
} from '@/chain/lens';
import { erc20Abi, primaryMarketAbi } from '@/chain/abis';
import { CHAIN_ID, CONTRACTS, PAYMENT_TOKEN } from '@/chain/config';
import { useTx } from '@/chain/tx';
import {
  formatCount,
  formatDeadline,
  formatMoney,
  parseAmount,
} from '@/lib/format';
import { allocationState } from '@/lib/enums';
import { NotFound } from '../public/NotFound';

/**
 * SHO-06. The screen that has to make deposit-versus-ownership unmistakable:
 * bottles reserved and bottles held are two different numbers, and the second
 * one is zero until the allocation is paid in full.
 *
 * Doc 10 M2 is fixed here. `payRemainder(allocationId, amount)` accepts a
 * partial amount, so the amount is editable and defaults to the full remainder
 * rather than being hidden behind a fixed-value button.
 */
export default function AllocationDetail() {
  const { allocationId } = useParams();
  const { address, isConnected, chainId } = useAccount();

  const parsed = /^\d+$/.test(allocationId ?? '') ? BigInt(allocationId!) : undefined;
  const allocation = useAllocation(parsed);
  const lot = useLot(allocation.data?.lotId);
  const protocol = useProtocol();
  const balance = usePaymentBalance(address);
  const allowance = usePaymentAllowance(address, CONTRACTS.primaryMarket);
  const positions = usePositions(address, allocation.data ? [allocation.data.lotId] : []);

  const decimals = protocol.data?.paymentDecimals ?? PAYMENT_TOKEN.decimals;
  const symbol = protocol.data?.paymentSymbol ?? PAYMENT_TOKEN.symbol;

  const view = allocation.data;
  const [amountInput, setAmountInput] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const approveTx = useTx();
  const payTx = useTx();

  if (parsed === undefined) return <NotFound what={`allocation ${allocationId ?? ''}`} />;

  if (allocation.isLoading || !view) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <LoadingRegion label="Loading the allocation…">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="mt-6 h-12 w-96" />
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </LoadingRegion>
      </div>
    );
  }

  const state = allocationState(view.state);
  const held = positions.items[0]?.balance ?? 0n;
  const remaining = view.remaining;
  const outstanding = remaining > 0n && view.state === 0;

  const typed = amountInput === '' ? remaining : parseAmount(amountInput, decimals);
  const amountError =
    amountInput === ''
      ? undefined
      : typed === null
        ? `Enter an amount in ${symbol}, for example ${formatMoney(remaining, decimals).replace('€', '')}.`
        : typed <= 0n
          ? 'Enter an amount greater than zero.'
          : typed > remaining
            ? `The outstanding balance is ${formatMoney(remaining, decimals)}. Enter that or less.`
            : undefined;

  const payAmount = typed !== null && !amountError ? typed : 0n;
  const afterPayment = remaining - payAmount;
  const needsApproval = (allowance.data ?? 0n) < payAmount;

  const blocked = (() => {
    if (!isConnected) return 'Connect the wallet that holds this allocation to pay.';
    if (chainId !== CHAIN_ID)
      return 'Your wallet is on another network. Palissage runs on Base Sepolia for this release.';
    if (address && view.buyer.toLowerCase() !== address.toLowerCase())
      return 'This allocation belongs to another wallet, so only that wallet can pay it.';
    if (!outstanding) return 'There is nothing outstanding on this allocation.';
    if (payAmount === 0n) return 'Enter how much you want to pay.';
    if ((balance.data ?? 0n) < payAmount)
      return `You need ${formatMoney(payAmount, decimals)} of ${symbol}. This wallet holds ${formatMoney(
        balance.data ?? 0n,
        decimals,
      )}.`;
    return undefined;
  })();

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <Breadcrumb
        trail={[
          { label: 'Allocations', to: '/app/shop/allocations' },
          { label: lot.lot?.name ?? `Lot #${String(view.lotId)}`, to: `/lots/${view.lotId}` },
          { label: `#${String(view.id)}` },
        ]}
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
        {view.overdue ? <StatusBadge tone="danger">Past the deadline</StatusBadge> : null}
      </div>

      <p className="mt-4 text-body-sm text-ink-secondary">
        Allocation #{String(view.id)} · offer #{String(view.offerId)}
      </p>
      <h1 className="mt-2 t-h1">{lot.lot?.name ?? `Lot #${String(view.lotId)}`}</h1>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Bottles reserved"
          value={formatCount(view.quantity)}
          footnote="Committed under this allocation"
        />
        <StatTile
          label="Bottles you hold"
          value={formatCount(held)}
          tone={held === 0n ? 'warning' : 'default'}
          footnote={held === 0n ? 'Minted only when paid in full' : 'Minted to this wallet'}
        />
        <StatTile
          label="Paid to date"
          value={formatMoney(view.paidAmount, decimals)}
          footnote={
            view.paidAmount === view.totalDue
              ? 'Paid in full'
              : `of ${formatMoney(view.totalDue, decimals)} due`
          }
        />
        <StatTile
          label="Remaining"
          value={formatMoney(remaining, decimals)}
          tone={remaining > 0n ? 'danger' : 'default'}
          footnote={remaining > 0n ? `Due ${formatDeadline(view.fullPaymentDeadline)}` : 'Nothing outstanding'}
        />
      </div>

      {held === 0n && remaining > 0n ? (
        <Callout tone="warning" className="mt-6 max-w-none">
          A deposit reserves bottles; it does not mint them. Your balance for this lot is{' '}
          {formatCount(held)} until the allocation is paid in full. Palissage does not offer a
          buyer-controlled refund — cancellation is governed by the offer terms and the contract.
        </Callout>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
        {/* ---- History -------------------------------------------------- */}
        <section aria-labelledby="history-heading" className="card p-6">
          <h2 id="history-heading" className="t-h3">
            History
          </h2>
          <ol className="mt-6 space-y-6">
            <Event
              tone="done"
              title={`Reserved · ${formatMoney(view.paidAmount, decimals)} paid`}
              meta={formatDeadline(view.createdAt)}
              amount={formatMoney(view.paidAmount, decimals)}
            />
            <Event
              tone={remaining > 0n ? 'due' : 'done'}
              title={remaining > 0n ? 'Balance due' : 'Paid in full'}
              meta={remaining > 0n ? formatDeadline(view.fullPaymentDeadline) : 'Nothing outstanding'}
              amount={remaining > 0n ? formatMoney(remaining, decimals) : '—'}
            />
            <Event
              tone={held > 0n ? 'done' : 'future'}
              title="Bottles minted"
              meta={held > 0n ? 'Minted to your wallet' : 'On full payment'}
              amount={`${formatCount(held > 0n ? held : view.quantity)} bottles`}
            />
            <Event
              tone={(lot.lot?.production ?? 0) === 6 ? 'done' : 'future'}
              title="Delivery available"
              meta={
                (lot.lot?.production ?? 0) === 6
                  ? 'The producer marked this lot ready for delivery'
                  : 'When the lot reaches Ready for delivery'
              }
              amount="—"
            />
          </ol>
        </section>

        {/* ---- What this needs ------------------------------------------ */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6 shadow-1">
            <p className="t-caption text-ink-secondary">What this needs</p>
            <h2 className="mt-2 t-h3">
              {outstanding ? 'Pay the remaining balance' : 'Nothing, for now'}
            </h2>

            {outstanding ? (
              <>
                <p className="mt-3 text-body-sm text-ink-secondary">
                  Due {formatDeadline(view.fullPaymentDeadline)}. After the deadline the offer’s
                  stated consequence applies; a default requires a separate contract action and
                  does not follow from the clock alone.
                </p>

                <div className="mt-6">
                  <Field
                    label={`Amount to pay (${symbol})`}
                    error={amountError}
                    hint={
                      payAmount > 0n && payAmount < remaining
                        ? `${formatMoney(afterPayment, decimals)} would still be outstanding, and bottles are minted only at zero.`
                        : 'A part payment is accepted. Bottles are minted when the balance reaches zero.'
                    }
                  >
                    {(props) => (
                      <TextInput
                        {...props}
                        inputMode="decimal"
                        autoComplete="off"
                        value={amountInput}
                        placeholder={formatMoney(remaining, decimals).replace('€', '')}
                        invalid={Boolean(amountError)}
                        onChange={(event) => setAmountInput(event.target.value)}
                        className="tabular-nums"
                      />
                    )}
                  </Field>
                </div>

                <Button
                  fullWidth
                  className="mt-4"
                  disabled={Boolean(blocked)}
                  onClick={() => setReviewing(true)}
                >
                  Pay {formatMoney(payAmount > 0n ? payAmount : remaining, decimals)}
                </Button>
                {blocked ? (
                  <p className="mt-3 text-body-sm text-ink-secondary">{blocked}</p>
                ) : null}
              </>
            ) : (
              <p className="mt-3 text-body-sm text-ink-secondary">
                {view.state === 1
                  ? 'This allocation is paid in full. Your bottles are in your portfolio, and delivery opens when the producer marks the lot ready.'
                  : `This allocation is ${state.label.toLowerCase()}.`}
              </p>
            )}

            <LinkButton to={`/lots/${view.lotId}`} kind="secondary" fullWidth className="mt-3">
              View the lot
            </LinkButton>
          </div>
        </aside>
      </div>

      <ActionReview
        open={reviewing}
        onClose={() => {
          setReviewing(false);
          approveTx.reset();
          payTx.reset();
        }}
        title="Confirm this payment"
        object={
          <div className="space-y-1">
            <p className="text-body font-medium">{lot.lot?.name ?? `Lot #${String(view.lotId)}`}</p>
            <p className="text-body-sm text-ink-secondary">
              Allocation #{String(view.id)} · paying {formatMoney(payAmount, decimals)}
            </p>
          </div>
        }
        consequence={
          <>
            <p>
              {formatMoney(payAmount, decimals)} moves into escrow against this allocation.
            </p>
            <p className="mt-2">
              {afterPayment === 0n
                ? `The allocation is then paid in full and ${formatCount(view.quantity)} bottles are minted to your wallet.`
                : `${formatMoney(afterPayment, decimals)} would still be outstanding, so no bottles are minted yet.`}
            </p>
          </>
        }
        steps={[
          {
            id: 'approve',
            label: `Allow Palissage to use ${formatMoney(payAmount, decimals)}`,
            note: `The market can only move the ${symbol} you allow it to move.`,
            required: needsApproval,
            run: () =>
              approveTx.send({
                address: PAYMENT_TOKEN.address,
                abi: erc20Abi,
                functionName: 'approve',
                args: [CONTRACTS.primaryMarket, payAmount],
              }),
            tx: approveTx,
          },
          {
            id: 'pay',
            label: `Pay ${formatMoney(payAmount, decimals)}`,
            note: 'Sends the payment to the primary market.',
            required: true,
            run: () =>
              payTx.send({
                address: CONTRACTS.primaryMarket,
                abi: primaryMarketAbi,
                functionName: 'payRemainder',
                args: [view.id, payAmount],
              }),
            tx: payTx,
          },
        ]}
        blocked={blocked}
      />
    </div>
  );
}

function Event({
  tone,
  title,
  meta,
  amount,
}: {
  tone: 'done' | 'due' | 'future';
  title: string;
  meta: string;
  amount: string;
}) {
  return (
    <li className="flex gap-4">
      <span
        aria-hidden
        className={
          tone === 'done'
            ? 'mt-1.5 size-2.5 shrink-0 rounded-full bg-success'
            : tone === 'due'
              ? 'mt-1.5 size-2.5 shrink-0 rounded-full bg-accent'
              : 'mt-1.5 size-2.5 shrink-0 rounded-full bg-edge-strong'
        }
      />
      <div className="min-w-0 flex-1">
        <p className={tone === 'future' ? 'text-body text-ink-secondary' : 'text-body'}>{title}</p>
        <p className="text-body-sm text-ink-secondary">{meta}</p>
      </div>
      <p className="shrink-0 text-body-sm tabular-nums text-ink-secondary">{amount}</p>
    </li>
  );
}
