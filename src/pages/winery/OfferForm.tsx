import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { Field, RadioCard, TextInput } from '@/components/ui/Field';
import { FocusedShell } from '@/components/layout/FocusedShell';
import { ActionReview } from '@/components/patterns/ActionReview';
import { FeeBreakdown } from '@/components/patterns/FeeBreakdown';
import { useLot, useProtocol } from '@/chain/lens';
import { primaryMarketAbi } from '@/chain/abis';
import { CONTRACTS, PAYMENT_TOKEN } from '@/chain/config';
import { useTx } from '@/chain/tx';
import {
  formatBps,
  formatCount,
  formatDeadline,
  formatMoney,
  parseAmount,
  parseBottles,
} from '@/lib/format';
import { NotFound } from '../public/NotFound';

/** Parses a `datetime-local` value into a unix timestamp in seconds. */
function parseLocal(value: string): bigint | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? BigInt(Math.floor(ms / 1000)) : null;
}

function defaultLocal(offsetDays: number): string {
  const date = new Date(Date.now() + offsetDays * 86_400_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/**
 * WIN-05. Publish an offer.
 *
 * Doc 10 M4 is fixed here on all three counts. The deposit field is in basis
 * points with its percentage shown beside it; `fullPaymentDeadline >= endTime`
 * is validated inline rather than at submit; and the screen states plainly that
 * publishing an offer with milestones is **two** transactions, because
 * `setMilestones` is a separate call.
 */
export default function OfferForm() {
  const { lotId } = useParams();
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();

  const parsed = /^\d+$/.test(lotId ?? '') ? BigInt(lotId!) : undefined;
  const { lot, exists, isLoading } = useLot(parsed);
  const protocol = useProtocol();
  const tx = useTx();

  const decimals = protocol.data?.paymentDecimals ?? PAYMENT_TOKEN.decimals;
  const symbol = protocol.data?.paymentSymbol ?? PAYMENT_TOKEN.symbol;
  const feeBps = protocol.data?.primaryFeeBps ?? 0;

  const [kind, setKind] = useState<'0' | '1'>('0');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [depositBps, setDepositBps] = useState('0');
  const [start, setStart] = useState(defaultLocal(0));
  const [end, setEnd] = useState(defaultLocal(30));
  const [deadline, setDeadline] = useState(defaultLocal(60));
  const [reviewing, setReviewing] = useState(false);
  const [touched, setTouched] = useState(false);

  const uncommitted = lot ? lot.totalBottles - Number(lot.offeredBottles) : 0;
  const bottles = parseBottles(quantity);
  const unit = parseAmount(price, decimals);
  const deposit = Number(depositBps);
  const startTs = parseLocal(start);
  const endTs = parseLocal(end);
  const deadlineTs = parseLocal(deadline);

  const errors = useMemo(
    () => ({
      quantity:
        quantity !== '' && (bottles === null || bottles < 1 || bottles > uncommitted)
          ? `Enter a whole number between 1 and ${formatCount(uncommitted)} — bottles already promised to other offers cannot be offered twice.`
          : undefined,
      price:
        price !== '' && (unit === null || unit <= 0n)
          ? `Enter a price per bottle in ${symbol}, for example 11.50.`
          : undefined,
      depositBps:
        depositBps !== '' && (!Number.isInteger(deposit) || deposit < 0 || deposit > 9999)
          ? 'Enter the deposit in basis points, from 0 to 9999. The contract rejects 10000.'
          : undefined,
      window:
        startTs !== null && endTs !== null && endTs <= startTs
          ? 'The offer has to close after it opens.'
          : undefined,
      deadline:
        endTs !== null && deadlineTs !== null && deadlineTs < endTs
          ? 'The full-payment deadline cannot be before the offer closes — the contract requires the deadline to be on or after the closing time.'
          : undefined,
    }),
    [quantity, bottles, uncommitted, price, unit, symbol, depositBps, deposit, startTs, endTs, deadlineTs],
  );

  if (parsed === undefined || (!isLoading && !exists)) {
    return <NotFound what={`lot ${lotId ?? ''}`} />;
  }

  const complete =
    bottles !== null &&
    bottles > 0 &&
    bottles <= uncommitted &&
    unit !== null &&
    unit > 0n &&
    Number.isInteger(deposit) &&
    deposit >= 0 &&
    deposit <= 9999 &&
    startTs !== null &&
    endTs !== null &&
    deadlineTs !== null &&
    endTs > startTs &&
    deadlineTs >= endTs;

  const gross = complete ? unit! * BigInt(bottles!) : 0n;
  const fee = (gross * BigInt(feeBps)) / 10_000n;

  const blocked = !isConnected
    ? 'Connect the wallet that owns this lot.'
    : lot && address && lot.winery.toLowerCase() !== address.toLowerCase()
      ? 'This lot belongs to another wallet, so only that wallet can publish an offer on it.'
      : lot && lot.status !== 1
        ? 'This lot is not verified yet, so the market would reject the offer.'
        : !complete
          ? 'Fill in the quantity, the price, the deposit and the three dates.'
          : undefined;

  return (
    <FocusedShell
      title="Publish an offer"
      unsaved={touched}
      onClose={() => navigate(`/app/winery/lots/${lotId}`)}
    >
      <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-16">
          <div className="min-w-0 space-y-8" onChange={() => setTouched(true)}>
            <header>
              {/* The focused shell already carries the flow's h1. */}
              <h2 className="t-h1">Publish an offer</h2>
              <p className="mt-3 text-body-sm text-ink-secondary">
                {lot?.name} · {formatCount(uncommitted)} of {formatCount(lot?.totalBottles ?? 0)}{' '}
                bottles are uncommitted.
              </p>
            </header>

            <fieldset className="space-y-3">
              <legend className="t-h3">Offer kind</legend>
              <RadioCard
                name="kind"
                value="0"
                checked={kind === '0'}
                onChange={() => setKind('0')}
                title="Current release"
                body="The wine exists. Buyers can request delivery once you mark the lot Ready for delivery."
              />
              <RadioCard
                name="kind"
                value="1"
                checked={kind === '1'}
                onChange={() => setKind('1')}
                title="En Primeur"
                body="A future vintage. Buyers pay in advance and finance production; delivery is not available until the lot is ready."
              />
            </fieldset>

            <Field
              label="Bottles offered"
              required
              error={touched ? errors.quantity : undefined}
              hint={`Maximum ${formatCount(uncommitted)} uncommitted. Bottles already promised to other offers cannot be offered twice.`}
            >
              {(props) => (
                <TextInput
                  {...props}
                  inputMode="numeric"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className="tabular-nums"
                />
              )}
            </Field>

            <Field
              label={`Price per bottle (${symbol})`}
              required
              error={touched ? errors.price : undefined}
              hint="Buyers see this price with the protocol fee disclosed before they commit."
            >
              {(props) => (
                <TextInput
                  {...props}
                  inputMode="decimal"
                  value={price}
                  placeholder="0.00"
                  onChange={(event) => setPrice(event.target.value)}
                  className="tabular-nums"
                />
              )}
            </Field>

            <Field
              label="Deposit at reservation"
              error={touched ? errors.depositBps : undefined}
              hint={
                Number.isInteger(deposit) && deposit > 0
                  ? `Basis points. ${depositBps} bps = ${formatBps(deposit)} of the total, due when a buyer reserves.`
                  : 'Basis points. Leave it at 0 to require payment in full at reservation.'
              }
            >
              {(props) => (
                <TextInput
                  {...props}
                  inputMode="numeric"
                  value={depositBps}
                  onChange={(event) => setDepositBps(event.target.value)}
                  className="tabular-nums"
                />
              )}
            </Field>

            <Field label="Opens" required error={touched ? errors.window : undefined}>
              {(props) => (
                <TextInput
                  {...props}
                  type="datetime-local"
                  value={start}
                  onChange={(event) => setStart(event.target.value)}
                />
              )}
            </Field>

            <Field
              label="Closes"
              required
              error={touched ? errors.window : undefined}
              hint="After this, no new reservation can be made against the offer."
            >
              {(props) => (
                <TextInput
                  {...props}
                  type="datetime-local"
                  value={end}
                  onChange={(event) => setEnd(event.target.value)}
                />
              )}
            </Field>

            <Field
              label="Full payment deadline"
              required
              error={touched ? errors.deadline : undefined}
              hint="Shown to buyers as an absolute date and time, never as “in 3 days”. It has to be on or after the closing time."
            >
              {(props) => (
                <TextInput
                  {...props}
                  type="datetime-local"
                  value={deadline}
                  onChange={(event) => setDeadline(event.target.value)}
                />
              )}
            </Field>

            <Callout tone="info">
              Publishing an offer and defining its milestones are <strong>two transactions</strong>.
              This screen sends the first. Until you set milestones, the market falls back to a
              single 100% release when the first buyer reserves — and after that first reservation
              the schedule is locked.
            </Callout>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="card p-6 shadow-1">
              <p className="t-caption text-ink-secondary">If this sells out</p>
              <div className="mt-4">
                {complete ? (
                  <FeeBreakdown
                    lines={[
                      {
                        label: `${formatCount(bottles!)} bottles × ${formatMoney(unit!, decimals)}`,
                        value: formatMoney(gross, decimals),
                      },
                      {
                        label: `Protocol fee ${formatBps(feeBps)}`,
                        value: `−${formatMoney(fee, decimals)}`,
                        muted: true,
                      },
                      {
                        label: 'Net to you',
                        value: formatMoney(gross - fee, decimals),
                        emphasis: true,
                      },
                    ]}
                    footnotes={[
                      'Money reaches you as milestones are confirmed, not all at once.',
                      deposit > 0
                        ? `A buyer pays ${formatBps(deposit)} at reservation and the balance by ${formatDeadline(
                            deadlineTs ?? 0n,
                          )}.`
                        : 'Buyers pay in full at reservation, so bottles are minted immediately.',
                    ]}
                  />
                ) : (
                  <p className="text-body-sm text-ink-secondary">
                    Enter a quantity and a price to see what the offer would return.
                  </p>
                )}
              </div>

              <Button
                fullWidth
                className="mt-6"
                disabled={Boolean(blocked)}
                onClick={() => setReviewing(true)}
              >
                Publish the offer
              </Button>
              {blocked ? (
                <p className="mt-3 text-body-sm text-ink-secondary">{blocked}</p>
              ) : null}
            </div>
          </aside>
        </div>
      </div>

      <ActionReview
        open={reviewing}
        onClose={() => {
          setReviewing(false);
          tx.reset();
        }}
        title="Publish this offer"
        object={
          <div className="space-y-1">
            <p className="text-body font-medium">{lot?.name}</p>
            <p className="text-body-sm text-ink-secondary tabular-nums">
              {formatCount(bottles ?? 0)} bottles at {formatMoney(unit ?? 0n, decimals)} ·{' '}
              {kind === '1' ? 'En Primeur' : 'Current release'}
            </p>
          </div>
        }
        consequence={
          <>
            <p>
              The offer opens {formatDeadline(startTs ?? 0n)} and closes {formatDeadline(endTs ?? 0n)}.
              {deposit > 0
                ? ` Buyers may pay a ${formatBps(deposit)} deposit, with the balance due ${formatDeadline(
                    deadlineTs ?? 0n,
                  )}.`
                : ' Buyers pay in full at reservation.'}
            </p>
            <p className="mt-2">
              This is the first of two transactions. Set the milestones next, before the first
              reservation locks the schedule.
            </p>
          </>
        }
        steps={[
          {
            id: 'create',
            label: 'Publish the offer',
            required: true,
            run: () =>
              tx.send({
                address: CONTRACTS.primaryMarket,
                abi: primaryMarketAbi,
                functionName: 'createOffer',
                args: [
                  parsed!,
                  PAYMENT_TOKEN.address,
                  unit!,
                  bottles!,
                  startTs!,
                  endTs!,
                  deposit,
                  deadlineTs!,
                  Number(kind),
                ],
              }),
            tx,
          },
        ]}
        blocked={blocked}
        onDone={() => {
          window.setTimeout(() => navigate(`/app/winery/lots/${lotId}`), 1400);
        }}
      />
    </FocusedShell>
  );
}
