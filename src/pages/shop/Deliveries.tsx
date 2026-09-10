import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { HashValue } from '@/components/ui/Mono';
import { LotThumb } from '@/components/ui/LotThumb';
import { CabinetPage, PageHeader } from '@/components/layout/PageHeader';
import { ConnectPrompt } from '@/components/layout/ConnectPrompt';
import { ActionReview } from '@/components/patterns/ActionReview';
import { useLots, useRedemptionsOfBuyer } from '@/chain/lens';
import { redemptionManagerAbi } from '@/chain/abis';
import { CONTRACTS } from '@/chain/config';
import { useTx } from '@/chain/tx';
import { formatCount, formatDeadline, isZeroHash } from '@/lib/format';
import { redemptionState } from '@/lib/enums';
import type { RedemptionView } from '@/chain/types';

/**
 * SHO-12 and SHO-13 in one screen: the queue is short and the decision is one
 * button, so a separate detail route would add a hop without adding anything.
 *
 * Confirming receipt burns the bottles. Cancelling returns them. Both are
 * irreversible, so both go through the review dialog.
 */
export default function ShopDeliveries() {
  const { address, isConnected } = useAccount();
  const redemptions = useRedemptionsOfBuyer(address);
  const lots = useLots();
  const [confirming, setConfirming] = useState<RedemptionView | null>(null);
  const [cancelling, setCancelling] = useState<RedemptionView | null>(null);

  const rows = useMemo(() => {
    const byId = new Map(lots.items.map((lot) => [String(lot.id), lot]));
    return redemptions.items.map((redemption) => ({
      redemption,
      lot: byId.get(String(redemption.lotId)),
    }));
  }, [redemptions.items, lots.items]);

  if (!isConnected) {
    return (
      <CabinetPage>
        <PageHeader title="Deliveries" />
        <ConnectPrompt what="your delivery requests" className="mt-8" />
      </CabinetPage>
    );
  }

  return (
    <CabinetPage>
      <PageHeader
        title="Deliveries"
        lede="Bottles you asked to have shipped. They are held in escrow from the moment you request delivery until you confirm receipt, at which point they are burned."
      />

      <div className="mt-8">
        {!redemptions.hasData ? (
          <SkeletonRows count={2} label="Loading your deliveries…" />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No delivery requested yet."
            body="A lot has to reach Ready for delivery before its bottles can be shipped. Request delivery from your portfolio."
            action={{ label: 'Open your portfolio', to: '/app/shop/portfolio' }}
          />
        ) : (
          <ul className="enter-stagger space-y-4">
            {rows.map(({ redemption, lot }) => {
              const state = redemptionState(redemption.state);
              const shipped = !isZeroHash(redemption.shipmentDocsHash);
              return (
                <li key={String(redemption.id)} className="card p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <LotThumb lotId={redemption.lotId} size={52} />
                    <div className="min-w-0 flex-1">
                      <p className="text-body-sm text-ink-secondary">
                        Request #{String(redemption.id)} · requested{' '}
                        {formatDeadline(redemption.requestedAt)}
                      </p>
                      <h2 className="mt-1 t-h3">
                        {formatCount(redemption.quantity)} bottles ·{' '}
                        <Link to={`/lots/${redemption.lotId}`} className="underline underline-offset-4">
                          {lot?.name ?? `Lot #${String(redemption.lotId)}`}
                        </Link>
                      </h2>
                      <p className="mt-2 text-body-sm text-ink-secondary">
                        Shipment documents{' '}
                        {shipped ? (
                          <HashValue hash={redemption.shipmentDocsHash} label="shipment hash" />
                        ) : (
                          '— not attached yet'
                        )}
                      </p>
                    </div>
                    <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
                  </div>

                  {redemption.state === 0 ? (
                    <Callout tone="info" className="mt-4">
                      These {formatCount(redemption.quantity)} bottles are held in escrow. They
                      return to your balance if the delivery is cancelled.
                    </Callout>
                  ) : null}

                  {redemption.state === 0 || redemption.state === 1 ? (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button
                        size="sm"
                        disabled={!shipped}
                        onClick={() => setConfirming(redemption)}
                      >
                        Confirm you received the wine
                      </Button>
                      <Button size="sm" kind="danger" onClick={() => setCancelling(redemption)}>
                        Cancel this request
                      </Button>
                      {!shipped ? (
                        <p className="w-full text-body-sm text-ink-secondary">
                          You can confirm receipt once the producer attaches the shipment
                          documents.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {confirming ? (
        <ConfirmReceipt redemption={confirming} onClose={() => setConfirming(null)} />
      ) : null}
      {cancelling ? (
        <CancelRequest redemption={cancelling} onClose={() => setCancelling(null)} />
      ) : null}
    </CabinetPage>
  );
}

function ConfirmReceipt({
  redemption,
  onClose,
}: {
  redemption: RedemptionView;
  onClose: () => void;
}) {
  const tx = useTx();
  return (
    <ActionReview
      open
      onClose={onClose}
      title="Confirm you received the wine"
      object={
        <p className="text-body">
          {formatCount(redemption.quantity)} bottles · request #{String(redemption.id)}
        </p>
      }
      consequence={
        <p>
          The {formatCount(redemption.quantity)} escrowed bottles are destroyed on-chain, so what
          remains on-chain matches what remains in the cellar. This cannot be undone.
        </p>
      }
      steps={[
        {
          id: 'confirm',
          label: 'Confirm receipt',
          required: true,
          run: () =>
            tx.send({
              address: CONTRACTS.redemptionManager,
              abi: redemptionManagerAbi,
              functionName: 'confirmDelivery',
              args: [redemption.id],
            }),
          tx,
        },
      ]}
    />
  );
}

function CancelRequest({
  redemption,
  onClose,
}: {
  redemption: RedemptionView;
  onClose: () => void;
}) {
  const tx = useTx();
  return (
    <ActionReview
      open
      onClose={onClose}
      destructive
      title={`Cancel request #${String(redemption.id)}`}
      object={
        <p className="text-body">
          {formatCount(redemption.quantity)} bottles · request #{String(redemption.id)}
        </p>
      }
      consequence={
        <p>
          The escrowed bottles return to your balance and the delivery is closed. If the producer
          has already shipped, cancel with them first — this only changes the on-chain record.
        </p>
      }
      steps={[
        {
          id: 'cancel',
          label: 'Cancel the request',
          required: true,
          run: () =>
            tx.send({
              address: CONTRACTS.redemptionManager,
              abi: redemptionManagerAbi,
              functionName: 'cancelRedemption',
              args: [redemption.id],
            }),
          tx,
        },
      ]}
    />
  );
}
