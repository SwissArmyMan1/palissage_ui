import { useEffect, useMemo, useState } from 'react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import { isHex } from 'viem';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, TextInput } from '@/components/ui/Field';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AddressValue } from '@/components/ui/Mono';
import { CabinetPage } from '@/components/layout/PageHeader';
import { ActionReview } from '@/components/patterns/ActionReview';
import { EvidencePanel } from '@/components/patterns/EvidencePanel';
import { useLots } from '@/chain/lens';
import { useCapabilities } from '@/chain/roles';
import { useIsDesktop } from '@/lib/media';
import { wineLotTokenAbi } from '@/chain/abis';
import { CONTRACTS } from '@/chain/config';
import { useTx } from '@/chain/tx';
import { formatBps, formatCount, isZeroHash } from '@/lib/format';
import { lotState, productionStage } from '@/lib/enums';
import type { LotView } from '@/chain/types';

type Decision = 'verify' | 'suspend' | 'unsuspend';

/**
 * ADM-04 and ADM-05 as one `Split view (list + detail)`: triage many, inspect
 * one, keep the list's position. Admin is desktop-primary, so below `lg` the
 * split degrades to a stack.
 *
 * Every decision is scoped and confirmed, the confirm button is never
 * auto-focused, and cancel is the safe default. On a small screen the write
 * controls are replaced by one line: this is a deliberate omission, because
 * evidence review on a 375 px screen produces bad decisions about other
 * people's money (doc 06 §2).
 */
export default function LotVerification() {
  const { lotId } = useParams();
  const navigate = useNavigate();
  const lots = useLots();
  const caps = useCapabilities();
  const isDesktop = useIsDesktop();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [docsHash, setDocsHash] = useState('');

  const queue = useMemo(
    () => [...lots.items].sort((a, b) => a.status - b.status || Number(a.id - b.id)),
    [lots.items],
  );
  const awaiting = queue.filter((lot) => lot.status === 0);

  const selected = lotId ? queue.find((lot) => String(lot.id) === lotId) : queue[0];

  // Landing on the queue with no id selects the oldest waiting lot, so the
  // reviewer starts where the work is.
  useEffect(() => {
    if (!lotId && awaiting[0]) {
      navigate(`/app/admin/lots/${awaiting[0].id}`, { replace: true });
    }
  }, [lotId, awaiting, navigate]);

  return (
    <div className="lg:grid lg:h-[calc(100dvh-var(--topbar-h))] lg:grid-cols-[320px_minmax(0,1fr)]">
      {/* ---- Queue ------------------------------------------------------ */}
      <div className="border-b border-edge-subtle lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="p-6">
          <h1 className="t-h3">Lots awaiting verification</h1>
          <p className="mt-1 text-body-sm text-ink-secondary">
            {awaiting.length === 0
              ? 'The queue is clear'
              : `${awaiting.length} in the queue · oldest first`}
          </p>
        </div>

        {!lots.hasData ? (
          <div className="px-6">
            <SkeletonRows count={4} label="Loading the queue…" />
          </div>
        ) : (
          <ul>
            {queue.map((lot) => {
              const state = lotState(lot.status);
              return (
                <li key={String(lot.id)}>
                  <NavLink
                    to={`/app/admin/lots/${lot.id}`}
                    className={({ isActive }) =>
                      [
                        'relative block border-b border-edge-subtle px-6 py-4 transition-colors duration-instant ease-out',
                        isActive
                          ? 'bg-surface-selected before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-accent'
                          : 'hover:bg-surface-sunken',
                      ].join(' ')
                    }
                  >
                    <p className="text-body font-medium">{lot.name}</p>
                    <p className="mt-1 text-body-sm text-ink-secondary">
                      Lot #{String(lot.id)} · {productionStage(lot.production)}
                    </p>
                    <StatusBadge tone={state.tone} className="mt-2">
                      {state.label}
                    </StatusBadge>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ---- Detail ----------------------------------------------------- */}
      <div className="lg:overflow-y-auto">
        {!selected ? (
          <CabinetPage>
            <EmptyState
              variant="success"
              title="Nothing is waiting for a decision."
              body="Verified and suspended lots stay in the queue on the left so you can review them."
            />
          </CabinetPage>
        ) : (
          <CabinetPage>
            <Detail
              lot={selected}
              canDecide={caps.canVerifyLot}
              isDesktop={isDesktop}
              docsHash={docsHash}
              onDocsHash={setDocsHash}
              onDecide={setDecision}
            />
          </CabinetPage>
        )}
      </div>

      {selected && decision ? (
        <DecisionDialog
          lot={selected}
          decision={decision}
          docsHash={docsHash}
          onClose={() => setDecision(null)}
        />
      ) : null}
    </div>
  );
}

function Detail({
  lot,
  canDecide,
  isDesktop,
  docsHash,
  onDocsHash,
  onDecide,
}: {
  lot: LotView;
  canDecide: boolean;
  isDesktop: boolean;
  docsHash: string;
  onDocsHash: (value: string) => void;
  onDecide: (decision: Decision) => void;
}) {
  const state = lotState(lot.status);
  const hashError =
    docsHash === ''
      ? undefined
      : !isHex(docsHash) || docsHash.length !== 66
        ? 'Enter the 32-byte hash of the documents you reviewed: 0x followed by 64 hexadecimal characters.'
        : undefined;
  const hashReady = docsHash !== '' && !hashError;

  return (
    <>
      <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
      <p className="mt-4 text-body-sm text-ink-secondary">
        <AddressValue address={lot.winery} label="producer wallet" /> · lot #{String(lot.id)}
      </p>
      <h2 className="mt-2 t-h1">{lot.name}</h2>
      <p className="mt-3 text-body-sm text-ink-secondary tabular-nums">
        {[
          lot.region,
          lot.grapes,
          `${formatCount(lot.totalBottles)} bottles`,
          `${formatCount(lot.bottleSizeMl)} ml`,
          `royalty ${formatBps(lot.royaltyBps)}`,
          `vintage ${lot.vintage}`,
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>

      <div className="mt-10">
        <EvidencePanel lot={lot} />
      </div>

      <section className="mt-10 card p-6" aria-labelledby="decision-heading">
        <p id="decision-heading" className="t-caption text-ink-secondary">
          Decision
        </p>
        <p className="mt-3 max-w-reading text-body-sm text-ink-secondary">
          Verifying sets the lot’s <code className="t-mono">docsHash</code> and verifier on Base
          and moves it to Verified, which lets the producer publish offers. It records what was
          checked — it is not a guarantee of quality or legal compliance.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <StatusBadge tone={canDecide ? 'success' : 'warning'}>
            {canDecide ? 'You hold the token verifier role' : 'Verifier role missing'}
          </StatusBadge>
          <span className="text-body-sm text-ink-secondary">
            Read from ParticipantView on Base Sepolia. Suspending needs the same role.
          </span>
        </div>

        {!isDesktop ? (
          <Callout tone="info" className="mt-6 max-w-none">
            Decisions are made on a larger screen. This queue is readable here on purpose;
            reviewing evidence on a phone produces bad decisions about other people’s money.
          </Callout>
        ) : (
          <>
            {lot.status === 0 ? (
              <div className="mt-6 max-w-xl">
                <Field
                  label="Hash of the documents you reviewed"
                  error={hashError}
                  hint="Recorded on Base as the lot's docsHash. The files themselves are never published."
                >
                  {(props) => (
                    <TextInput
                      {...props}
                      value={docsHash}
                      onChange={(event) => onDocsHash(event.target.value.trim())}
                      placeholder="0x…"
                      autoComplete="off"
                      className="t-mono"
                      invalid={Boolean(hashError)}
                    />
                  )}
                </Field>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              {lot.status === 0 ? (
                <Button disabled={!canDecide || !hashReady} onClick={() => onDecide('verify')}>
                  Verify this lot
                </Button>
              ) : null}
              {lot.status === 1 ? (
                <Button kind="danger" disabled={!canDecide} onClick={() => onDecide('suspend')}>
                  Suspend {lot.name}
                </Button>
              ) : null}
              {lot.status === 2 ? (
                <Button kind="secondary" disabled={!canDecide} onClick={() => onDecide('unsuspend')}>
                  Reinstate {lot.name}
                </Button>
              ) : null}
            </div>

            {lot.status === 0 && !hashReady ? (
              <p className="mt-3 text-body-sm text-ink-secondary">
                Verify is unavailable until the document hash is entered.
              </p>
            ) : null}
            {!canDecide ? (
              <p className="mt-3 text-body-sm text-ink-secondary">
                This wallet cannot verify or suspend, so the contract would reject the write.
              </p>
            ) : null}
          </>
        )}
      </section>
    </>
  );
}

function DecisionDialog({
  lot,
  decision,
  docsHash,
  onClose,
}: {
  lot: LotView;
  decision: Decision;
  docsHash: string;
  onClose: () => void;
}) {
  const tx = useTx();

  const config = {
    verify: {
      title: `Verify ${lot.name}`,
      label: 'Verify this lot',
      destructive: false,
      consequence: (
        <>
          <p>
            The lot moves to Verified on Base, with your address and the document hash recorded
            against it. The producer can then publish offers.
          </p>
          <p className="mt-2">
            Total bottles and this hash cannot change afterwards, and a later edit of the
            description does not re-open verification.
          </p>
        </>
      ),
      run: () =>
        tx.send({
          address: CONTRACTS.wineLotToken,
          abi: wineLotTokenAbi,
          functionName: 'verifyLot',
          args: [lot.id, docsHash as `0x${string}`],
        }),
    },
    suspend: {
      title: `Suspend ${lot.name}`,
      label: `Suspend ${lot.name}`,
      destructive: true,
      consequence: (
        <p>
          The lot stops being tradeable: no new reservation, no new listing, and existing deposits
          against it cannot settle. Bottles already minted stay where they are.
        </p>
      ),
      run: () =>
        tx.send({
          address: CONTRACTS.wineLotToken,
          abi: wineLotTokenAbi,
          functionName: 'suspendLot',
          args: [lot.id],
        }),
    },
    unsuspend: {
      title: `Reinstate ${lot.name}`,
      label: `Reinstate ${lot.name}`,
      destructive: false,
      consequence: <p>The lot returns to Verified and can be traded again.</p>,
      run: () =>
        tx.send({
          address: CONTRACTS.wineLotToken,
          abi: wineLotTokenAbi,
          functionName: 'unsuspendLot',
          args: [lot.id],
        }),
    },
  }[decision];

  return (
    <ActionReview
      open
      onClose={onClose}
      destructive={config.destructive}
      title={config.title}
      object={
        <div className="space-y-1">
          <p className="text-body font-medium">{lot.name}</p>
          <p className="text-body-sm text-ink-secondary tabular-nums">
            Lot #{String(lot.id)} · {formatCount(lot.totalBottles)} bottles · producer{' '}
            {lot.winery.slice(0, 6)}…{lot.winery.slice(-4)}
          </p>
          {decision === 'verify' ? (
            <p className="t-mono break-all text-ink-secondary">{docsHash}</p>
          ) : null}
          {decision === 'verify' && !isZeroHash(lot.docsHash) ? (
            <p className="text-body-sm text-warning">
              This lot already carries a document hash; verifying again replaces it.
            </p>
          ) : null}
        </div>
      }
      consequence={config.consequence}
      steps={[{ id: decision, label: config.label, required: true, run: config.run, tx }]}
    />
  );
}
