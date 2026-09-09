import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AddressValue, HashValue } from '@/components/ui/Mono';
import { CabinetPage, PageHeader } from '@/components/layout/PageHeader';
import { ActionReview } from '@/components/patterns/ActionReview';
import { useLots, useRedemptions } from '@/chain/lens';
import { useCapabilities } from '@/chain/roles';
import { redemptionManagerAbi } from '@/chain/abis';
import { CONTRACTS } from '@/chain/config';
import { useTx } from '@/chain/tx';
import { formatCount, formatDeadline, isZeroHash } from '@/lib/format';
import { redemptionState } from '@/lib/enums';
import type { RedemptionView } from '@/chain/types';

/**
 * ADM-07 and ADM-08. The delivery queue and its exceptions.
 *
 * Two of the contract's recovery paths are deliberately not exposed here:
 * `recoverEscrow` requires an EIP-712 signature from the buyer, and
 * `forcedTransfer` moves someone else's bottles. Both belong behind a
 * case-by-case process rather than a button on a queue, and this screen says so
 * instead of pretending they do not exist.
 */
export default function AdminRedemptions() {
  const redemptions = useRedemptions();
  const lots = useLots();
  const caps = useCapabilities();
  const [refunding, setRefunding] = useState<RedemptionView | null>(null);
  const [resolving, setResolving] = useState<RedemptionView | null>(null);

  const rows = useMemo(() => {
    const byId = new Map(lots.items.map((lot) => [String(lot.id), lot.name]));
    return redemptions.items.map((redemption) => ({
      redemption,
      lotName: byId.get(String(redemption.lotId)) ?? `Lot #${String(redemption.lotId)}`,
    }));
  }, [redemptions.items, lots.items]);

  return (
    <CabinetPage>
      <PageHeader
        title="Redemptions"
        lede="Every delivery request on the deployment, and the exceptions a verifier can resolve."
      />

      <div className="mt-8 space-y-8">
        {!caps.canResolveRedemption ? (
          <Callout tone="warning" title="You can read this queue but not resolve it">
            Refunding a delivery or confirming one on a buyer's behalf needs the verifier role on
            the redemption manager. This wallet does not hold it.
          </Callout>
        ) : null}

        {!redemptions.hasData ? (
          <SkeletonRows count={3} label="Loading deliveries…" />
        ) : rows.length === 0 ? (
          <EmptyState
            variant="success"
            title="No delivery has been requested."
            body="Requests appear here as soon as a holder asks for physical delivery."
          />
        ) : (
          <ul className="space-y-4">
            {rows.map(({ redemption, lotName }) => {
              const state = redemptionState(redemption.state);
              const shipped = !isZeroHash(redemption.shipmentDocsHash);
              const open = redemption.state === 0 || redemption.state === 1;
              return (
                <li key={String(redemption.id)} className="card p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-body-sm text-ink-secondary">
                        Request #{String(redemption.id)} · requested{' '}
                        {formatDeadline(redemption.requestedAt)}
                      </p>
                      <h2 className="mt-1 t-h3">
                        {formatCount(redemption.quantity)} bottles · {lotName}
                      </h2>
                      <p className="mt-2 text-body-sm text-ink-secondary">
                        Buyer <AddressValue address={redemption.buyer} label="buyer wallet" /> ·
                        producer <AddressValue address={redemption.winery} label="producer wallet" />
                      </p>
                      <p className="mt-1 text-body-sm text-ink-secondary">
                        Shipment documents{' '}
                        {shipped ? (
                          <HashValue hash={redemption.shipmentDocsHash} label="shipment hash" />
                        ) : (
                          '— not attached'
                        )}
                      </p>
                    </div>
                    <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
                  </div>

                  {open ? (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button
                        size="sm"
                        kind="secondary"
                        disabled={!caps.canResolveRedemption || !shipped}
                        onClick={() => setResolving(redemption)}
                      >
                        Resolve as delivered
                      </Button>
                      <Button
                        size="sm"
                        kind="danger"
                        disabled={!caps.canResolveRedemption}
                        onClick={() => setRefunding(redemption)}
                      >
                        Return the bottles
                      </Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        <Callout tone="info" title="Not exposed in this release">
          <p>
            <code className="t-mono">recoverEscrow</code> moves escrowed bottles to a new wallet
            when a buyer has lost compliance, and it needs an EIP-712 signature from that buyer.
            <code className="t-mono"> forcedTransfer</code> and{' '}
            <code className="t-mono">setFrozenTokens</code> move or freeze balances that belong to
            someone else. All three exist on the contracts and are handled as a case, with the
            evidence, rather than as a button on a queue.
          </p>
        </Callout>
      </div>

      {refunding ? (
        <ResolveDialog redemption={refunding} mode="refund" onClose={() => setRefunding(null)} />
      ) : null}
      {resolving ? (
        <ResolveDialog redemption={resolving} mode="deliver" onClose={() => setResolving(null)} />
      ) : null}
    </CabinetPage>
  );
}

function ResolveDialog({
  redemption,
  mode,
  onClose,
}: {
  redemption: RedemptionView;
  mode: 'refund' | 'deliver';
  onClose: () => void;
}) {
  const tx = useTx();
  const refund = mode === 'refund';
  return (
    <ActionReview
      open
      onClose={onClose}
      destructive={refund}
      title={refund ? `Return the bottles on #${String(redemption.id)}` : `Resolve #${String(redemption.id)} as delivered`}
      object={
        <p className="text-body">
          {formatCount(redemption.quantity)} bottles · request #{String(redemption.id)}
        </p>
      }
      consequence={
        refund ? (
          <p>
            The {formatCount(redemption.quantity)} escrowed bottles return to the buyer’s wallet
            and the delivery is closed as returned. Nothing is burned.
          </p>
        ) : (
          <p>
            The {formatCount(redemption.quantity)} escrowed bottles are burned as if the buyer had
            confirmed receipt. Use this only where the delivery is evidenced and the buyer cannot
            confirm — the burn cannot be undone.
          </p>
        )
      }
      steps={[
        {
          id: mode,
          label: refund ? 'Return the bottles' : 'Resolve as delivered',
          required: true,
          run: () =>
            tx.send({
              address: CONTRACTS.redemptionManager,
              abi: redemptionManagerAbi,
              functionName: refund ? 'refundRedemption' : 'confirmDelivery',
              args: [redemption.id],
            }),
          tx,
        },
      ]}
    />
  );
}
