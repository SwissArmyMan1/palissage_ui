import { LotThumb } from '@/components/ui/LotThumb';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button, LinkButton } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { Skeleton, LoadingRegion } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { Field, TextInput } from '@/components/ui/Field';
import { CabinetPage } from '@/components/layout/PageHeader';
import { ActionReview } from '@/components/patterns/ActionReview';
import { EvidencePanel } from '@/components/patterns/EvidencePanel';
import { TrellisLifecycle } from '@/components/patterns/TrellisLifecycle';
import { useLot, useOffersOfLot, useProtocol } from '@/chain/lens';
import { wineLotTokenAbi } from '@/chain/abis';
import { CONTRACTS } from '@/chain/config';
import { formatTokenAmount, tokenMeta } from '@/chain/tokens';
import { useTx } from '@/chain/tx';
import { formatBps, formatCount } from '@/lib/format';
import { lotState, nextProductionStage, offerPhase, productionStage } from '@/lib/enums';
import { NotFound } from '../public/NotFound';

const TABS = [
  { id: 'production', label: 'Production' },
  { id: 'offers', label: 'Offers' },
  { id: 'evidence', label: 'Evidence' },
] as const;

/**
 * WIN-04. The producer's core screen.
 *
 * Production is forward only, and the contract enforces it — so no control here
 * implies going back, and advancing carries a confirmation because it cannot be
 * undone. Reaching Ready for delivery unlocks redemption for every holder of
 * the lot, which is stated before the button, not after.
 */
export default function ManageLot() {
  const { lotId } = useParams();
  const { address } = useAccount();
  const [tab, setTab] = useState<string>('production');
  const [advancing, setAdvancing] = useState(false);
  const [editingMetadata, setEditingMetadata] = useState(false);

  const parsed = /^\d+$/.test(lotId ?? '') ? BigInt(lotId!) : undefined;
  const { lot, exists, isLoading, isError } = useLot(parsed);
  const offers = useOffersOfLot(parsed);
  const protocol = useProtocol();

  if (parsed === undefined || (!isLoading && !isError && !exists)) {
    return <NotFound what={`lot ${lotId ?? ''}`} />;
  }

  if (isLoading || !lot) {
    return (
      <CabinetPage>
        <LoadingRegion label="Loading the lot…">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="mt-6 h-12 w-80" />
          <Skeleton className="mt-8 h-64 w-full" />
        </LoadingRegion>
      </CabinetPage>
    );
  }

  const state = lotState(lot.status);
  const next = nextProductionStage(lot.production);
  const isOwner = address && lot.winery.toLowerCase() === address.toLowerCase();
  const uncommitted = lot.totalBottles - Number(lot.offeredBottles);

  return (
    <CabinetPage>
      <Breadcrumb
        trail={[
          { label: 'Lots', to: '/app/winery/lots' },
          { label: lot.region || 'Lot' },
          { label: lot.name },
        ]}
      />

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
            <StatusBadge tone="neutral">{productionStage(lot.production)}</StatusBadge>
          </div>
          <h1 className="mt-4 flex items-center gap-4 t-h1">
            <LotThumb lotId={lot.id} size={72} />
            <span>{lot.name}</span>
          </h1>
          <p className="mt-3 text-body-sm text-ink-secondary tabular-nums">
            {[
              lot.region,
              lot.grapes,
              `${formatCount(lot.totalBottles)} bottles`,
              `royalty ${formatBps(lot.royaltyBps)}`,
              lot.exportAllowed ? 'export eligible' : 'not marked for export',
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        {lot.status === 1 && uncommitted > 0 ? (
          <LinkButton to={`/app/winery/lots/${lot.id}/offers/new`} data-tour="winery-lot-publish-offer">
            Publish an offer
          </LinkButton>
        ) : null}
      </div>

      {lot.status === 0 ? (
        <Callout tone="warning" className="mt-6 max-w-none">
          This lot is a draft. An operator has to verify it before you can publish an offer.
          Verification records the hash of your production documents on the selected network together with the
          operator’s address.
        </Callout>
      ) : null}

      {!isOwner ? (
        <Callout tone="info" className="mt-6 max-w-none">
          This lot belongs to another wallet, so the controls below are read-only. The contract
          checks the lot’s own producer address on every write.
        </Callout>
      ) : null}

      <Tabs tabs={TABS} value={tab} onChange={setTab} className="mt-10" />

      <div className="mt-8">
        <TabPanel id="production" active={tab === 'production'}>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
            <section className="card p-6" aria-labelledby="production-heading">
              <h2 id="production-heading" className="t-h3">
                Production
              </h2>
              <div className="mt-6">
                <TrellisLifecycle
                  stage={lot.production}
                  variant="static"
                  label={`Production stage of ${lot.name}`}
                />
              </div>

              <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-body font-medium">
                    {next ? `Next stage: ${next}` : 'This lot is ready for delivery'}
                  </p>
                  <p className="mt-1 max-w-reading text-body-sm text-ink-secondary">
                    Production moves forward only. A stage cannot be undone once recorded on the selected network.
                  </p>
                </div>
                {next ? (
                  <Button
                    kind="secondary"
                    disabled={!isOwner}
                    onClick={() => setAdvancing(true)}
                  >
                    Advance to {next}
                  </Button>
                ) : null}
              </div>

              {next === 'Ready for delivery' ? (
                <Callout tone="warning" className="mt-6 max-w-none">
                  Reaching Ready for delivery unlocks redemption for every holder of this lot. That
                  change cannot be reversed.
                </Callout>
              ) : null}
            </section>

            <aside className="card p-6">
              <h2 className="t-h3">On the record</h2>
              <dl className="mt-4 space-y-3">
                <Row label="Bottles" value={formatCount(lot.totalBottles)} />
                <Row label="Minted" value={formatCount(lot.mintedBottles)} />
                <Row label="Committed to offers" value={formatCount(lot.offeredBottles)} />
                <Row label="Uncommitted" value={formatCount(uncommitted)} />
                <Row label="In circulation" value={formatCount(lot.circulating)} />
                <Row label="Delivered and burned" value={formatCount(lot.redeemedBottles)} />
              </dl>
              <p className="mt-4 text-body-sm text-ink-secondary">
                The total bottle count is fixed at creation — minting is capped by it and it cannot
                be raised later.
              </p>
              <Link
                to={`/lots/${lot.id}`}
                className="mt-4 inline-block text-body-sm font-medium text-accent underline underline-offset-4"
              >
                See the public lot page
              </Link>
            </aside>
          </div>
        </TabPanel>

        <TabPanel id="offers" active={tab === 'offers'}>
          <section aria-labelledby="offers-heading">
            <h2 id="offers-heading" className="t-h3">
              Offers on this lot
            </h2>
            {offers.items.length === 0 ? (
              <p className="mt-4 text-body-sm text-ink-secondary">
                No offer has been published on this lot yet.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-edge-subtle">
                {offers.items.map((offer) => {
                  const phase = offerPhase(offer.phase);
                  const offerMeta = tokenMeta(offer.paymentToken, protocol.data);
                  return (
                    <li key={String(offer.id)} className="flex flex-wrap items-center gap-4 py-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-body font-medium">
                          Offer #{String(offer.id)} ·{' '}
                          {offer.kind === 1 ? 'En Primeur' : 'Current release'}
                        </p>
                        <p className="text-body-sm text-ink-secondary tabular-nums">
                          {formatTokenAmount(offer.pricePerBottle, offerMeta)} ·{' '}
                          {formatCount(offer.available)} of {formatCount(offer.quantity)} left
                          {offerMeta.settlement
                            ? ''
                            : ' · settled in another payment asset'}
                        </p>
                      </div>
                      <StatusBadge tone={phase.tone}>{phase.label}</StatusBadge>
                      <LinkButton to={`/app/winery/offers/${offer.id}`} kind="secondary" size="sm">
                        Open
                      </LinkButton>
                    </li>
                  );
                })}
              </ul>
            )}
            <Callout tone="info" className="mt-6 max-w-none">
              Total bottles and the verified documents’ hash cannot change after verification.
              Editing the description does not re-open verification.
            </Callout>
          </section>
        </TabPanel>

        <TabPanel id="evidence" active={tab === 'evidence'}>
          <EvidencePanel lot={lot} />

          <section className="card mt-6 p-6" aria-labelledby="metadata-heading">
            <h2 id="metadata-heading" className="t-h3">
              Metadata link
            </h2>
            <p className="mt-2 max-w-reading text-body-sm text-ink-secondary">
              The lot&rsquo;s <code className="t-mono">metadataURI</code> — your own description,
              images or tasting notes, stored with the lot on the selected network. It is the one field the
              producer may change after verification, because it carries no attestation: the{' '}
              <code className="t-mono">docsHash</code> a verifier set is separate and is not
              touched by this.
            </p>
            <dl className="mt-4">
              <Row
                label="Current"
                value={
                  lot.metadataURI ? (
                    <span className="t-mono break-all">{lot.metadataURI}</span>
                  ) : (
                    <span className="text-ink-secondary">not set</span>
                  )
                }
              />
            </dl>
            {isOwner ? (
              <Button kind="secondary" className="mt-5" onClick={() => setEditingMetadata(true)}>
                {lot.metadataURI ? 'Change the metadata link' : 'Add a metadata link'}
              </Button>
            ) : (
              <p className="mt-5 text-body-sm text-ink-secondary">
                Only the lot&rsquo;s producer can change this.
              </p>
            )}
          </section>
        </TabPanel>
      </div>

      {editingMetadata ? (
        <MetadataDialog
          lotId={lot.id}
          lotName={lot.name}
          current={lot.metadataURI}
          onClose={() => setEditingMetadata(false)}
        />
      ) : null}

      {advancing && next ? (
        <AdvanceDialog
          lotId={lot.id}
          lotName={lot.name}
          nextIndex={lot.production + 1}
          nextName={next}
          onClose={() => setAdvancing(false)}
        />
      ) : null}
    </CabinetPage>
  );
}

/**
 * `updateLotMetadata` is URI-only and producer-only. Changing it is reversible
 * and attests nothing, so this is an ordinary confirmation rather than a
 * destructive one — and the dialog says out loud what it does *not* touch, since
 * "editing a verified lot" is exactly the thing a producer will hesitate over.
 */
function MetadataDialog({
  lotId,
  lotName,
  current,
  onClose,
}: {
  lotId: bigint;
  lotName: string;
  current: string;
  onClose: () => void;
}) {
  const [uri, setUri] = useState(current);
  const [touched, setTouched] = useState(false);
  const tx = useTx();
  const trimmed = uri.trim();
  const unchanged = trimmed === current.trim();

  return (
    <ActionReview
      open
      onClose={onClose}
      title="Update the metadata link"
      object={
        <div className="space-y-3">
          <p className="text-body font-medium">{lotName}</p>
          <Field
            label="Metadata URI"
            hint="A link to your own description or images. Leave it empty to remove the link."
            // Not on open: the field starts at the current value by design, and
            // greeting the reader with an error for that is hostile.
            error={
              touched && unchanged && trimmed !== ''
                ? 'This is the link the lot already carries.'
                : undefined
            }
          >
            {(props) => (
              <TextInput
                {...props}
                value={uri}
                onChange={(event) => {
                  setTouched(true);
                  setUri(event.target.value);
                }}
                placeholder="https://"
                autoComplete="url"
              />
            )}
          </Field>
        </div>
      }
      consequence={
        <>
          <p>
            The new link is recorded on the selected network and is what the public lot page and the passport
            read from.
          </p>
          <p className="mt-2">
            Verification is not affected. The lot keeps its state, its{' '}
            <code className="t-mono">docsHash</code> and its verifier — the contract does not let
            this call touch any of them.
          </p>
        </>
      }
      steps={[
        {
          id: 'metadata',
          label: trimmed === '' ? 'Remove the metadata link' : 'Save the metadata link',
          required: true,
          run: () =>
            tx.send({
              address: CONTRACTS.wineLotToken,
              abi: wineLotTokenAbi,
              functionName: 'updateLotMetadata',
              args: [lotId, trimmed],
            }),
          tx,
        },
      ]}
      blocked={unchanged ? 'The link is unchanged, so there is nothing to send.' : undefined}
    />
  );
}

function AdvanceDialog({
  lotId,
  lotName,
  nextIndex,
  nextName,
  onClose,
}: {
  lotId: bigint;
  lotName: string;
  nextIndex: number;
  nextName: string;
  onClose: () => void;
}) {
  const tx = useTx();
  return (
    <ActionReview
      open
      onClose={onClose}
      title={`Advance ${lotName} to ${nextName}`}
      object={
        <p className="text-body">
          {lotName} · moving from {productionStage(nextIndex - 1)} to {nextName}
        </p>
      }
      consequence={
        <>
          <p>The new stage is recorded on the selected network and shown on the public lot page.</p>
          <p className="mt-2">
            {nextName === 'Ready for delivery'
              ? 'This also unlocks redemption for every holder of this lot.'
              : 'Production moves forward only, so this cannot be undone.'}
          </p>
        </>
      }
      steps={[
        {
          id: 'advance',
          label: `Advance to ${nextName}`,
          required: true,
          run: () =>
            tx.send({
              address: CONTRACTS.wineLotToken,
              abi: wineLotTokenAbi,
              functionName: 'setProductionStatus',
              args: [lotId, nextIndex],
            }),
          tx,
        },
      ]}
    />
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <dt className="text-body-sm text-ink-secondary">{label}</dt>
      <dd className="text-body-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}
