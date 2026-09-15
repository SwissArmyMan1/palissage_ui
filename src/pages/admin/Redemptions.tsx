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
        tour="admin-redemptions-list"
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
                      {/*
                        `confirmDelivery` lets a verifier close a redemption at
                        either open state — the shipment gate is the *buyer's*,
                        not the operator's. Requiring documents here removed the
                        only way to settle a delivery the producer never marked.
                      */}
                      <Button
                        size="sm"
                        kind="secondary"
                        disabled={!caps.canResolveRedemption}
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

        <Callout tone="info" title="Three powers that are not buttons here">
          <p>
            The contracts carry three more ways to move bottles that are not this wallet&rsquo;s.
            Each exists for a real situation, and each is deliberately handled as a case with its
            evidence rather than as a control on a queue — a queue invites a quick decision, and
            none of these should be quick.
          </p>
          <dl className="mt-4 space-y-4">
            <div>
              <dt className="text-body-sm font-medium">
                <code className="t-mono">recoverEscrow</code> — the buyer lost compliance mid-delivery
              </dt>
              <dd className="mt-1 text-body-sm text-ink-secondary">
                A refund runs through <code className="t-mono">forcedTransfer</code>, which still
                checks that the destination may receive. If a buyer&rsquo;s claims were revoked
                while their bottles sat in escrow, the refund path closes and only the
                irreversible confirmation is left. This sends the escrow to a compliant wallet
                instead — but the verifier does not choose that wallet: the buyer authorises it
                with an EIP-712 signature naming the redemption, the destination and an expiry.
                Collecting that signature is the work, and it does not happen in a dialog.
              </dd>
            </div>
            <div>
              <dt className="text-body-sm font-medium">
                <code className="t-mono">forcedTransfer</code> — move someone else&rsquo;s bottles
              </dt>
              <dd className="mt-1 text-body-sm text-ink-secondary">
                Needs <code className="t-mono">ENFORCER_ROLE</code> on the token. It exists for
                court orders, estate transfers and a holder who has provably lost their wallet.
                It works even while a lot is suspended, which is exactly why it is not one click
                away from a list of other people&rsquo;s balances.
              </dd>
            </div>
            <div>
              <dt className="text-body-sm font-medium">
                <code className="t-mono">setFrozenTokens</code> — freeze part of a balance
              </dt>
              <dd className="mt-1 text-body-sm text-ink-secondary">
                Also <code className="t-mono">ENFORCER_ROLE</code>. Frozen bottles stay owned but
                cannot be sold, listed or redeemed, which is what a sanctions hit or a disputed
                sale calls for. The number is absolute, not a delta, so a mistyped value silently
                unfreezes the rest — another reason it belongs in a reviewed procedure.
              </dd>
            </div>
          </dl>
          <p className="mt-4">
            All three are executed by an operator with the right role, from the runbook, against
            the deployment addresses on this page. The result shows up here like any other state
            change.
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
          <>
            <p>
              The {formatCount(redemption.quantity)} escrowed bottles are burned as if the buyer
              had confirmed receipt. Use this only where the delivery is evidenced and the buyer
              cannot confirm — the burn cannot be undone.
            </p>
            {isZeroHash(redemption.shipmentDocsHash) ? (
              <p className="mt-2">
                The producer has attached no shipment documents to this request, so nothing on
                Base evidences that the wine left the warehouse. The contract still allows the
                burn; the evidence has to come from somewhere else, and it should exist before
                you confirm.
              </p>
            ) : null}
          </>
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
