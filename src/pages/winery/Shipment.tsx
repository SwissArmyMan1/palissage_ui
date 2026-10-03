import { LotThumb } from '@/components/ui/LotThumb';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { CircleCheck, Clock, FileText } from 'lucide-react';
import { isHex } from 'viem';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { Field, TextInput } from '@/components/ui/Field';
import { Skeleton, LoadingRegion } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AddressValue, HashValue } from '@/components/ui/Mono';
import { CabinetPage } from '@/components/layout/PageHeader';
import { ActionReview } from '@/components/patterns/ActionReview';
import { useLot, useRedemption } from '@/chain/lens';
import { redemptionManagerAbi } from '@/chain/abis';
import { CONTRACTS } from '@/chain/config';
import { useTx } from '@/chain/tx';
import { formatCount, formatDeadline, isZeroHash } from '@/lib/format';
import { redemptionState } from '@/lib/enums';
import { NotFound } from '../public/NotFound';

/**
 * WIN-09. Attach shipment documents, then mark the delivery shipped.
 *
 * The contract stores one value: `shipmentDocsHash`. The documents themselves
 * are not published, and this screen does not pretend to upload them — it takes
 * the hash the producer computed from the files they sent.
 */
export default function Shipment() {
  const { redemptionId } = useParams();
  const { address } = useAccount();
  const parsed = /^\d+$/.test(redemptionId ?? '') ? BigInt(redemptionId!) : undefined;

  const redemption = useRedemption(parsed);
  const lot = useLot(redemption.data?.lotId);
  const [hash, setHash] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const tx = useTx();

  if (parsed === undefined) return <NotFound what={`delivery request ${redemptionId ?? ''}`} />;

  if (redemption.isLoading || !redemption.data) {
    return (
      <CabinetPage>
        <LoadingRegion label="Loading the delivery request…">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="mt-6 h-10 w-80" />
          <Skeleton className="mt-8 h-48 w-full" />
        </LoadingRegion>
      </CabinetPage>
    );
  }

  const view = redemption.data;
  const state = redemptionState(view.state);
  const shipped = !isZeroHash(view.shipmentDocsHash);
  const isOwner = address && view.winery.toLowerCase() === address.toLowerCase();

  const hashError =
    hash === ''
      ? undefined
      : !isHex(hash) || hash.length !== 66
        ? 'Enter the 32-byte hash of your shipment documents, as 0x followed by 64 hexadecimal characters.'
        : undefined;
  const validHash = hash !== '' && !hashError;

  const blocked = !isOwner
    ? 'This lot belongs to another wallet, so only that wallet can mark the delivery shipped.'
    : view.state !== 0
      ? `This request is already ${state.label.toLowerCase()}.`
      : !validHash
        ? 'Enter the hash of the shipment documents first.'
        : undefined;

  return (
    <CabinetPage>
      <Breadcrumb
        trail={[
          { label: 'Deliveries', to: '/app/winery/deliveries' },
          { label: lot.lot?.name ?? `Lot #${String(view.lotId)}` },
          { label: `#${String(view.id)}` },
        ]}
      />

      <div className="mt-6">
        <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
        <p className="mt-4 text-body-sm text-ink-secondary">
          Request #{String(view.id)} · requested {formatDeadline(view.requestedAt)} by{' '}
          <AddressValue address={view.buyer} label="buyer wallet" />
        </p>
        <h1 className="mt-2 flex items-center gap-4 t-h1">
          <LotThumb lotId={view.lotId} size={72} />
          <span>{formatCount(view.quantity)} bottles · {lot.lot?.name ?? `Lot #${String(view.lotId)}`}</span>
        </h1>
      </div>

      <Callout tone="info" className="mt-6 max-w-none">
        These {formatCount(view.quantity)} bottles are held in escrow by the redemption manager.
        They are burned when the buyer confirms receipt, and returned to the buyer if the delivery
        is cancelled.
      </Callout>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        <section className="card p-6" aria-labelledby="documents-heading">
          <h2 id="documents-heading" className="t-h3">
            Shipment documents
          </h2>
          <p className="mt-2 max-w-reading text-body-sm text-ink-secondary">
            Send the documents to the buyer through your usual channel, then record their hash
            here. The hash goes on the selected network as <code className="t-mono">shipmentDocsHash</code>; the
            files themselves are never published.
          </p>

          <ul className="mt-6 space-y-3">
            <li className="rounded-lg border border-edge-subtle p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <FileText aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-secondary" strokeWidth={1.75} />
                  <div className="min-w-0">
                    <p className="text-body font-medium">Shipment documents</p>
                    <p className="text-body-sm text-ink-secondary">
                      {shipped ? (
                        <>
                          hash <HashValue hash={view.shipmentDocsHash} label="shipment hash" />
                        </>
                      ) : (
                        'awaiting the hash'
                      )}
                    </p>
                  </div>
                </div>
                {shipped ? (
                  <StatusBadge tone="success">Recorded</StatusBadge>
                ) : (
                  <StatusBadge tone="warning">Awaiting</StatusBadge>
                )}
              </div>
            </li>
          </ul>

          {view.state === 0 ? (
            <div className="mt-6 space-y-4">
              <Field
                label="Shipment documents hash"
                error={hashError}
                hint="A 32-byte hash: 0x followed by 64 hexadecimal characters. Compute it from the files you sent."
              >
                {(props) => (
                  <TextInput
                    {...props}
                    value={hash}
                    onChange={(event) => setHash(event.target.value.trim())}
                    placeholder="0x…"
                    autoComplete="off"
                    className="t-mono"
                    invalid={Boolean(hashError)}
                  />
                )}
              </Field>
              <Button disabled={Boolean(blocked)} onClick={() => setReviewing(true)}>
                Mark as shipped
              </Button>
              {blocked ? <p className="text-body-sm text-ink-secondary">{blocked}</p> : null}
            </div>
          ) : null}
        </section>

        <aside className="card p-6">
          <h2 className="t-caption text-ink-secondary">What happens next</h2>
          <ol className="mt-4 space-y-4">
            <Step
              done={view.state >= 1}
              current={view.state === 0}
              title="You mark it shipped"
              body="Records shipmentDocsHash on the selected network."
            />
            <Step
              done={view.state >= 2}
              current={view.state === 1}
              title="The buyer confirms receipt"
              body={`Burns the ${formatCount(view.quantity)} escrowed bottles.`}
            />
            <Step
              done={false}
              current={false}
              title="If something is wrong"
              body="A verifier resolves the case. You can see it; you do not decide it."
            />
          </ol>
        </aside>
      </div>

      {reviewing ? (
        <ActionReview
          open
          onClose={() => {
            setReviewing(false);
            tx.reset();
          }}
          title="Mark this delivery shipped"
          object={
            <div className="space-y-1">
              <p className="text-body font-medium">
                {formatCount(view.quantity)} bottles · request #{String(view.id)}
              </p>
              <p className="t-mono break-all text-ink-secondary">{hash}</p>
            </div>
          }
          consequence={
            <p>
              The hash is recorded on the selected network and the buyer is able to confirm receipt. The bottles
              stay in escrow until they do.
            </p>
          }
          steps={[
            {
              id: 'ship',
              label: 'Mark as shipped',
              required: true,
              run: () =>
                tx.send({
                  address: CONTRACTS.redemptionManager,
                  abi: redemptionManagerAbi,
                  functionName: 'markShipped',
                  args: [view.id, hash as `0x${string}`],
                }),
              tx,
            },
          ]}
          blocked={blocked}
        />
      ) : null}
    </CabinetPage>
  );
}

function Step({
  done,
  current,
  title,
  body,
}: {
  done: boolean;
  current: boolean;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3">
      {done ? (
        <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={1.75} />
      ) : (
        <Clock
          aria-hidden
          className={current ? 'mt-0.5 size-4 shrink-0 text-accent' : 'mt-0.5 size-4 shrink-0 text-ink-secondary'}
          strokeWidth={1.75}
        />
      )}
      <div className="min-w-0">
        <p className={current ? 'text-body-sm font-semibold' : 'text-body-sm'}>{title}</p>
        <p className="text-body-sm text-ink-secondary">{body}</p>
      </div>
    </li>
  );
}
