import { LotThumb } from '@/components/ui/LotThumb';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { Field, TextInput } from '@/components/ui/Field';
import { Skeleton, LoadingRegion } from '@/components/ui/Skeleton';
import { StatTile } from '@/components/ui/StatTile';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AddressValue } from '@/components/ui/Mono';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { CabinetPage } from '@/components/layout/PageHeader';
import { ActionReview } from '@/components/patterns/ActionReview';
import { useAllocationsOfOffer, useLot, useMilestonesLocked, useOffer, useProtocol, useSettlement } from '@/chain/lens';
import { primaryMarketAbi } from '@/chain/abis';
import { CONTRACTS } from '@/chain/config';
import { formatTokenAmount, type TokenMeta, tokenMeta } from '@/chain/tokens';
import { useTx } from '@/chain/tx';
import { formatBps, formatCount, formatDeadline } from '@/lib/format';
import { allocationState, offerPhase } from '@/lib/enums';
import type { AllocationView } from '@/chain/types';
import { NotFound } from '../public/NotFound';

interface MilestoneDraft {
  bps: string;
  description: string;
}

/**
 * WIN-06. One offer: its allocations, its escrow and its milestone schedule.
 *
 * Doc 10 §4 lists the capabilities that had no screen. The two that matter
 * conceptually are here, and they are producer actions rather than buyer ones:
 * cancelling a reservation and refunding the buyer, and claiming a default once
 * the payment deadline has passed.
 */
export default function OfferDetail() {
  const { offerId } = useParams();
  const { address } = useAccount();
  const parsed = /^\d+$/.test(offerId ?? '') ? BigInt(offerId!) : undefined;

  const offer = useOffer(parsed);
  const lot = useLot(offer.data?.lotId);
  const settlement = useSettlement(parsed);
  const allocations = useAllocationsOfOffer(parsed);
  const protocol = useProtocol();
  // Escrow, price and every allocation on this page are denominated in the
  // offer's own asset. See `chain/tokens.ts` for why that is not the
  // deployment's asset.
  const meta = tokenMeta(offer.data?.paymentToken, protocol.data);

  const locked = useMilestonesLocked(parsed);

  const [drafts, setDrafts] = useState<MilestoneDraft[]>([]);
  const [savingMilestones, setSavingMilestones] = useState(false);
  const [cancelling, setCancelling] = useState<AllocationView | null>(null);
  const [defaulting, setDefaulting] = useState<AllocationView | null>(null);
  const [cancelOffer, setCancelOffer] = useState(false);

  const milestoneTx = useTx();

  const existing = settlement.data?.milestones ?? [];
  const editable = locked.data === false;
  const rows = drafts.length > 0 ? drafts : existing.map((m) => ({ bps: String(m.bps), description: m.description }));
  const sum = useMemo(() => rows.reduce((total, row) => total + (Number(row.bps) || 0), 0), [rows]);

  if (parsed === undefined) return <NotFound what={`offer ${offerId ?? ''}`} />;

  if (offer.isLoading || !offer.data) {
    return (
      <CabinetPage>
        <LoadingRegion label="Loading the offer…">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="mt-6 h-10 w-72" />
          <Skeleton className="mt-8 h-48 w-full" />
        </LoadingRegion>
      </CabinetPage>
    );
  }

  const view = offer.data;
  const phase = offerPhase(view.phase);
  const isOwner = address && view.winery.toLowerCase() === address.toLowerCase();

  return (
    <CabinetPage>
      <Breadcrumb
        trail={[
          { label: 'Lots', to: '/app/winery/lots' },
          { label: lot.lot?.name ?? `Lot #${String(view.lotId)}`, to: `/app/winery/lots/${view.lotId}` },
          { label: `Offer #${String(view.id)}` },
        ]}
      />

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <StatusBadge tone={phase.tone}>{phase.label}</StatusBadge>
          <h1 className="mt-4 flex items-center gap-4 t-h1">
            <LotThumb lotId={view.lotId} size={72} />
            <span>Offer #{String(view.id)} · {view.kind === 1 ? 'En Primeur' : 'Current release'}</span>
          </h1>
          <p className="mt-3 text-body-sm text-ink-secondary tabular-nums">
            {formatTokenAmount(view.pricePerBottle, meta)} per bottle ·{' '}
            {formatCount(view.reserved)} of {formatCount(view.quantity)} reserved ·{' '}
            {view.depositBps > 0 ? `${formatBps(view.depositBps)} deposit` : 'full payment'} · closes{' '}
            {formatDeadline(view.endTime)}
          </p>
        </div>
        {isOwner && view.active ? (
          <Button kind="danger" onClick={() => setCancelOffer(true)}>
            Cancel this offer
          </Button>
        ) : null}
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Settled in escrow"
          value={formatTokenAmount(settlement.data?.settledFunds ?? 0n, meta)}
          footnote="What buyers have paid against this offer"
        />
        <StatTile
          label="Released"
          value={formatBps(Number(settlement.data?.releasedBps ?? 0n))}
          footnote="Share unlocked by confirmed milestones"
        />
        <StatTile
          label="Withdrawable now"
          value={formatTokenAmount(settlement.data?.withdrawable ?? 0n, meta)}
          footnote="Take it out from the finance screen"
        />
        <StatTile
          label="Withdrawn"
          value={formatTokenAmount(settlement.data?.withdrawnGross ?? 0n, meta)}
          footnote="Gross, before the protocol fee"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
        {/* ---- Allocations --------------------------------------------- */}
        <section className="card p-6" aria-labelledby="allocations-heading">
          <h2 id="allocations-heading" className="t-h3">
            Allocations
          </h2>
          {allocations.items.length === 0 ? (
            <p className="mt-4 text-body-sm text-ink-secondary">
              Nobody has reserved from this offer yet.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-edge-subtle">
              {allocations.items.map((allocation) => {
                const state = allocationState(allocation.state);
                return (
                  <li key={String(allocation.id)} className="flex flex-wrap items-center gap-4 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-medium tabular-nums">
                        {formatCount(allocation.quantity)} bottles · #{String(allocation.id)}
                      </p>
                      <p className="text-body-sm text-ink-secondary">
                        <AddressValue address={allocation.buyer} label="buyer wallet" />
                      </p>
                      <p className="text-body-sm text-ink-secondary tabular-nums">
                        {formatTokenAmount(allocation.paidAmount, meta)} paid of{' '}
                        {formatTokenAmount(allocation.totalDue, meta)}
                        {allocation.remaining > 0n
                          ? ` · due ${formatDeadline(allocation.fullPaymentDeadline)}`
                          : ''}
                      </p>
                    </div>
                    <StatusBadge tone={allocation.overdue && allocation.state === 0 ? 'danger' : state.tone}>
                      {allocation.overdue && allocation.state === 0 ? 'Past the deadline' : state.label}
                    </StatusBadge>
                    {isOwner && allocation.state === 0 ? (
                      <span className="flex gap-2">
                        {allocation.overdue ? (
                          <Button size="sm" kind="danger" onClick={() => setDefaulting(allocation)}>
                            Claim the default
                          </Button>
                        ) : null}
                        <Button size="sm" kind="ghost" onClick={() => setCancelling(allocation)}>
                          Cancel and refund
                        </Button>
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          <Callout tone="info" className="mt-6 max-w-none">
            Cancelling a reservation refunds the buyer and returns the bottles to the offer. A
            buyer cannot cancel their own reservation — that is a producer or operator action.
          </Callout>
        </section>

        {/* ---- Milestones ---------------------------------------------- */}
        <aside className="card p-6">
          <h2 className="t-h3">Milestones</h2>
          <p className="mt-2 text-body-sm text-ink-secondary">
            Each milestone releases a share of the offer, in basis points, when a verifier
            confirms it. The shares have to total 10 000.
          </p>

          {!editable ? (
            <>
              <ul className="mt-4 divide-y divide-edge-subtle">
                {existing.map((milestone, index) => (
                  <li key={index} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-body-sm">{milestone.description || `Milestone ${index + 1}`}</p>
                      <p className="text-body-sm text-ink-secondary tabular-nums">
                        {milestone.bps} bps
                      </p>
                    </div>
                    <StatusBadge tone={milestone.released ? 'success' : 'warning'}>
                      {milestone.released ? 'Released' : 'Awaiting verifier'}
                    </StatusBadge>
                  </li>
                ))}
              </ul>
              <Callout tone="warning" className="mt-4 max-w-none">
                The schedule is locked: a buyer has already paid against it, so it must not change
                under them.
              </Callout>
            </>
          ) : (
            <>
              <div className="mt-4 space-y-4">
                {rows.map((row, index) => (
                  <div key={index} className="space-y-2 rounded-lg border border-edge-subtle p-3">
                    <Field label={`Milestone ${index + 1} description`} id={`ms-desc-${index}`}>
                      {(props) => (
                        <TextInput
                          {...props}
                          value={row.description}
                          onChange={(event) => {
                            const next = [...rows];
                            next[index] = { ...row, description: event.target.value };
                            setDrafts(next);
                          }}
                        />
                      )}
                    </Field>
                    <Field
                      label="Share in basis points"
                      id={`ms-bps-${index}`}
                      hint={`${row.bps || 0} bps = ${formatBps(Number(row.bps) || 0)} of the offer`}
                    >
                      {(props) => (
                        <TextInput
                          {...props}
                          inputMode="numeric"
                          value={row.bps}
                          onChange={(event) => {
                            const next = [...rows];
                            next[index] = { ...row, bps: event.target.value };
                            setDrafts(next);
                          }}
                          className="tabular-nums"
                        />
                      )}
                    </Field>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <Button
                  kind="ghost"
                  size="sm"
                  onClick={() => setDrafts([...rows, { bps: '', description: '' }])}
                >
                  Add a milestone
                </Button>
                <p
                  className={
                    sum === 10000
                      ? 'text-body-sm text-success tabular-nums'
                      : 'text-body-sm text-warning tabular-nums'
                  }
                >
                  {sum} / 10 000 bps
                </p>
              </div>

              <Button
                fullWidth
                className="mt-4"
                disabled={!isOwner || sum !== 10000 || rows.length === 0}
                onClick={() => setSavingMilestones(true)}
              >
                Save the milestone schedule
              </Button>
              {sum !== 10000 ? (
                <p className="mt-2 text-body-sm text-ink-secondary">
                  The shares must total exactly 10 000 basis points before they can be saved.
                </p>
              ) : null}
            </>
          )}
        </aside>
      </div>

      {savingMilestones ? (
        <ActionReview
          open
          onClose={() => {
            setSavingMilestones(false);
            milestoneTx.reset();
          }}
          title="Save the milestone schedule"
          object={
            <ul className="space-y-1 text-body-sm">
              {rows.map((row, index) => (
                <li key={index} className="flex justify-between gap-4">
                  <span>{row.description || `Milestone ${index + 1}`}</span>
                  <span className="tabular-nums">{row.bps} bps</span>
                </li>
              ))}
            </ul>
          }
          consequence={
            <p>
              This is what releases your money. Once a buyer reserves against this offer the
              schedule locks and cannot change.
            </p>
          }
          steps={[
            {
              id: 'milestones',
              label: 'Save the schedule',
              required: true,
              run: () =>
                milestoneTx.send({
                  address: CONTRACTS.primaryMarket,
                  abi: primaryMarketAbi,
                  functionName: 'setMilestones',
                  args: [
                    parsed!,
                    rows.map((row) => Number(row.bps)),
                    rows.map((row, index) => row.description || `Milestone ${index + 1}`),
                  ],
                }),
              tx: milestoneTx,
            },
          ]}
        />
      ) : null}

      {cancelling ? (
        <AllocationAction
          allocation={cancelling}
          meta={meta}
          mode="cancel"
          onClose={() => setCancelling(null)}
        />
      ) : null}
      {defaulting ? (
        <AllocationAction
          allocation={defaulting}
          meta={meta}
          mode="default"
          onClose={() => setDefaulting(null)}
        />
      ) : null}
      {cancelOffer ? <CancelOffer offerId={view.id} onClose={() => setCancelOffer(false)} /> : null}
    </CabinetPage>
  );
}

function AllocationAction({
  allocation,
  meta,
  mode,
  onClose,
}: {
  allocation: AllocationView;
  meta: TokenMeta;
  mode: 'cancel' | 'default';
  onClose: () => void;
}) {
  const tx = useTx();
  const cancel = mode === 'cancel';
  return (
    <ActionReview
      open
      onClose={onClose}
      destructive
      title={cancel ? `Cancel allocation #${String(allocation.id)}` : `Claim the default on #${String(allocation.id)}`}
      object={
        <div className="space-y-1">
          <p className="text-body font-medium tabular-nums">
            {formatCount(allocation.quantity)} bottles · {formatTokenAmount(allocation.paidAmount, meta)} paid
          </p>
          <p className="text-body-sm text-ink-secondary">Buyer {allocation.buyer}</p>
        </div>
      }
      consequence={
        cancel ? (
          <p>
            The buyer is refunded {formatTokenAmount(allocation.paidAmount, meta)} and the{' '}
            {formatCount(allocation.quantity)} bottles return to the offer.
          </p>
        ) : (
          <p>
            The allocation is marked defaulted and the bottles return to the offer. The deposit is
            handled as the offer’s terms and the contract provide — this action is only available
            after the full-payment deadline has passed.
          </p>
        )
      }
      steps={[
        {
          id: mode,
          label: cancel ? 'Cancel and refund the buyer' : 'Claim the default',
          required: true,
          run: () =>
            tx.send({
              address: CONTRACTS.primaryMarket,
              abi: primaryMarketAbi,
              functionName: cancel ? 'cancelAllocation' : 'claimDefault',
              args: [allocation.id],
            }),
          tx,
        },
      ]}
    />
  );
}

function CancelOffer({ offerId, onClose }: { offerId: bigint; onClose: () => void }) {
  const tx = useTx();
  return (
    <ActionReview
      open
      onClose={onClose}
      destructive
      title={`Cancel offer #${String(offerId)}`}
      object={<p className="text-body">Offer #{String(offerId)}</p>}
      consequence={
        <p>
          No new reservation can be made against this offer. Allocations already taken keep their
          own terms and are settled separately.
        </p>
      }
      steps={[
        {
          id: 'cancel-offer',
          label: 'Cancel the offer',
          required: true,
          run: () =>
            tx.send({
              address: CONTRACTS.primaryMarket,
              abi: primaryMarketAbi,
              functionName: 'cancelOffer',
              args: [offerId],
            }),
          tx,
        },
      ]}
    />
  );
}
