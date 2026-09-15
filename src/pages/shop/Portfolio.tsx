import { useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { Button, LinkButton } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, TextArea, TextInput } from '@/components/ui/Field';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { LotThumb } from '@/components/ui/LotThumb';
import { CabinetPage, PageHeader } from '@/components/layout/PageHeader';
import { ConnectPrompt } from '@/components/layout/ConnectPrompt';
import { ActionReview } from '@/components/patterns/ActionReview';
import { useAllLots, useApprovedForAll, usePositions, useProtocol } from '@/chain/lens';
import { redemptionManagerAbi, secondaryMarketAbi, wineLotTokenAbi } from '@/chain/abis';
import { CONTRACTS, PAYMENT_TOKEN } from '@/chain/config';
import { useTx } from '@/chain/tx';
import { formatCount, formatMoney, parseAmount, parseBottles } from '@/lib/format';
import {
  EMPTY_DELIVERY,
  canonicalDelivery,
  deliveryHash,
  isDeliveryEmpty,
  type DeliveryDetails,
} from '@/lib/delivery';
import { productionStage } from '@/lib/enums';
import type { LotView, PositionView } from '@/chain/types';

interface Holding {
  lot: LotView;
  position: PositionView;
}

/**
 * SHO-07. `Data table` with a three-value cell: balance, frozen and
 * transferable stay three numbers. Collapsing them would be a correctness bug.
 *
 * The two actions a holding can carry are here rather than on separate routes,
 * because both are one decision with one confirmation.
 */
export default function Portfolio() {
  const { address, isConnected } = useAccount();
  const lots = useAllLots();
  const protocol = useProtocol();
  const ids = useMemo(() => lots.items.map((lot) => lot.id), [lots.items]);
  const positions = usePositions(address, ids);

  const decimals = protocol.data?.paymentDecimals ?? PAYMENT_TOKEN.decimals;
  const symbol = protocol.data?.paymentSymbol ?? PAYMENT_TOKEN.symbol;

  const [delivery, setDelivery] = useState<Holding | null>(null);
  const [listing, setListing] = useState<Holding | null>(null);

  const holdings = useMemo<Holding[]>(() => {
    const byId = new Map(lots.items.map((lot) => [String(lot.id), lot]));
    return positions.items
      .filter((position) => position.balance > 0n)
      .map((position) => ({ position, lot: byId.get(String(position.lotId))! }))
      .filter((holding) => holding.lot !== undefined);
  }, [positions.items, lots.items]);

  if (!isConnected) {
    return (
      <CabinetPage>
        <PageHeader title="Portfolio" />
        <ConnectPrompt what="your bottles" className="mt-8" />
      </CabinetPage>
    );
  }

  const columns: Column<Holding>[] = [
    {
      id: 'lot',
      header: 'Lot',
      cell: (row) => (
        <span className="flex items-center gap-3">
          <LotThumb lotId={row.lot.id} />
          {row.lot.name}
        </span>
      ),
    },
    { id: 'vintage', header: 'Vintage', numeric: true, cell: (row) => String(row.lot.vintage) },
    {
      id: 'balance',
      header: 'You hold',
      numeric: true,
      cell: (row) => formatCount(row.position.balance),
    },
    {
      id: 'frozen',
      header: 'Frozen',
      numeric: true,
      cell: (row) => formatCount(row.position.frozen),
    },
    {
      id: 'transferable',
      header: 'Transferable',
      numeric: true,
      cell: (row) => formatCount(row.position.transferable),
    },
    {
      id: 'stage',
      header: 'Production',
      cell: (row) => productionStage(row.lot.production),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (row) => (
        <span className="flex flex-wrap justify-end gap-2">
          {row.lot.production === 6 ? (
            <Button size="sm" kind="secondary" onClick={() => setDelivery(row)}>
              Request delivery
            </Button>
          ) : null}
          {row.position.transferable > 0n && row.lot.status === 1 ? (
            <Button size="sm" kind="ghost" onClick={() => setListing(row)}>
              List for resale
            </Button>
          ) : null}
          <LinkButton to={`/lots/${row.lot.id}`} size="sm" kind="ghost">
            The lot
          </LinkButton>
        </span>
      ),
    },
  ];

  const anyFrozen = holdings.some((holding) => holding.position.frozen > 0n);

  return (
    <CabinetPage>
      <PageHeader
        title="Portfolio"
        lede="Bottles minted to this wallet, per lot. A deposit reserves bottles but does not mint them, so a reserved allocation is not here until it is paid in full."
      />

      <div className="mt-8 space-y-8">
        {anyFrozen ? (
          <Callout tone="info">
            Frozen bottles are owned but not transferable right now. Actions are capped at what is
            transferable.
          </Callout>
        ) : null}

        {!lots.hasData || (ids.length > 0 && !positions.hasData) ? (
          <SkeletonRows count={4} label="Loading your positions…" />
        ) : holdings.length === 0 ? (
          <EmptyState
            title="No bottles yet."
            body="Bottles appear here once an allocation is paid in full — a deposit reserves them but does not mint them."
            action={{ label: 'Browse lots', to: '/app/shop/market' }}
          />
        ) : (
          <DataTable
            caption="Bottles held by this wallet, per lot"
            columns={columns}
            rows={holdings}
            rowKey={(row) => String(row.lot.id)}
            rowTitle={(row) => row.lot.name}
          />
        )}
      </div>

      {delivery ? (
        <RequestDeliveryDialog
          holding={delivery}
          onClose={() => setDelivery(null)}
          owner={address!}
        />
      ) : null}

      {listing ? (
        <CreateListingDialog
          holding={listing}
          onClose={() => setListing(null)}
          owner={address!}
          decimals={decimals}
          symbol={symbol}
        />
      ) : null}
    </CabinetPage>
  );
}

/**
 * The redemption manager pulls the bottles into escrow with
 * `safeTransferFrom(msg.sender, …)`, so it must be an approved operator first.
 * That is a second transaction and the dialog says so before anything is sent.
 */
function RequestDeliveryDialog({
  holding,
  owner,
  onClose,
}: {
  holding: Holding;
  owner: `0x${string}`;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState(String(holding.position.transferable));
  const [details, setDetails] = useState<DeliveryDetails>(EMPTY_DELIVERY);
  const [copied, setCopied] = useState(false);
  const approveTx = useTx();
  const requestTx = useTx();

  const detailsEmpty = isDeliveryEmpty(details);
  const dataHash = deliveryHash(details);
  const setField = (field: keyof DeliveryDetails) => (value: string) =>
    setDetails((current) => ({ ...current, [field]: value }));

  const approved = useApprovedForAll(owner, CONTRACTS.redemptionManager);

  const bottles = parseBottles(quantity);
  const max = Number(holding.position.transferable);
  const valid = bottles !== null && bottles > 0 && bottles <= max;

  return (
    <ActionReview
      open
      onClose={onClose}
      title="Request delivery"
      object={
        <div className="space-y-4">
          <p className="text-body font-medium">{holding.lot.name}</p>
          <Field
            label="Bottles to have delivered"
            hint={`Up to ${formatCount(holding.position.transferable)} transferable bottles.`}
            error={
              quantity !== '' && !valid
                ? `Enter a whole number between 1 and ${formatCount(max)}.`
                : undefined
            }
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

          <fieldset className="space-y-4 border-t border-edge-subtle pt-4">
            <legend className="sr-only">Delivery details</legend>
            <p className="text-body-sm text-ink-secondary">
              Where the wine should go. None of this is published: only a hash of it is recorded
              on Base, as proof that neither side changed the terms afterwards.
            </p>
            <Field label="Recipient">
              {(props) => (
                <TextInput
                  {...props}
                  value={details.recipient}
                  autoComplete="name"
                  onChange={(event) => setField('recipient')(event.target.value)}
                />
              )}
            </Field>
            <Field label="Delivery address">
              {(props) => (
                <TextArea
                  {...props}
                  rows={3}
                  value={details.address}
                  autoComplete="street-address"
                  onChange={(event) => setField('address')(event.target.value)}
                />
              )}
            </Field>
            <Field label="Contact" hint="An email or a phone number the producer can reach.">
              {(props) => (
                <TextInput
                  {...props}
                  value={details.contact}
                  onChange={(event) => setField('contact')(event.target.value)}
                />
              )}
            </Field>
            <Field label="Notes" hint="Access, delivery window, anything the carrier needs.">
              {(props) => (
                <TextArea
                  {...props}
                  rows={2}
                  value={details.notes}
                  onChange={(event) => setField('notes')(event.target.value)}
                />
              )}
            </Field>
          </fieldset>

          <div className="rounded-md bg-surface-sunken p-3">
            <p className="text-body-sm text-ink-secondary">
              {detailsEmpty ? 'Nothing to anchor yet' : 'Recorded on Base as'}
            </p>
            <p className="t-mono mt-1 break-all text-body-sm">{dataHash}</p>
            {detailsEmpty ? (
              <p className="mt-2 text-body-sm text-ink-secondary">
                A request with no details carries the zero hash. The contract accepts it — but
                then nothing on Base says what was agreed, and the producer still needs an address
                from you.
              </p>
            ) : (
              <button
                type="button"
                className="mt-3 text-body-sm font-medium text-accent underline decoration-transparent underline-offset-4 hover:decoration-current"
                onClick={() => {
                  void navigator.clipboard
                    ?.writeText(canonicalDelivery(details))
                    .then(() => setCopied(true))
                    .catch(() => setCopied(false));
                }}
              >
                {copied ? 'Copied — send this to the producer' : 'Copy the details to send'}
              </button>
            )}
          </div>
        </div>
      }
      consequence={
        <>
          <p>
            {formatCount(bottles ?? 0)} bottles move into the redemption manager’s escrow. They
            leave your balance immediately.
          </p>
          <p className="mt-2">
            The producer then attaches shipment documents. When you confirm receipt the bottles are
            burned on-chain. You can cancel and get them back up until the producer marks the
            shipment.
          </p>
          {!detailsEmpty ? (
            <p className="mt-2">
              Your delivery details are not sent by this interface — it has no server to send them
              with. Copy them above and pass them to the producer; the hash on Base is what lets
              either of you prove later that they did not change.
            </p>
          ) : null}
        </>
      }
      steps={[
        {
          id: 'approve',
          label: 'Allow the redemption manager to move these bottles',
          note: 'One approval covers every delivery request for this wallet.',
          required: approved.data === false,
          run: () =>
            approveTx.send({
              address: CONTRACTS.wineLotToken,
              abi: wineLotTokenAbi,
              functionName: 'setApprovalForAll',
              args: [CONTRACTS.redemptionManager, true],
            }),
          tx: approveTx,
        },
        {
          id: 'request',
          label: `Request delivery of ${formatCount(bottles ?? 0)} bottles`,
          note: 'Moves the bottles into escrow and opens the delivery.',
          required: true,
          run: () =>
            requestTx.send({
              address: CONTRACTS.redemptionManager,
              abi: redemptionManagerAbi,
              functionName: 'requestRedemption',
              args: [holding.lot.id, bottles!, dataHash],
            }),
          tx: requestTx,
        },
      ]}
      blocked={
        holding.lot.production !== 6
          ? 'This lot is not ready for delivery yet, so the contract would reject the request.'
          : !valid
            ? 'Enter how many bottles you want delivered.'
            : undefined
      }
    />
  );
}

/**
 * Listings are lazy: the tokens stay in the seller's wallet and the market acts
 * as operator. Without that approval a listing cannot be bought, so the
 * approval is a required step rather than a surprise at purchase time.
 */
function CreateListingDialog({
  holding,
  owner,
  decimals,
  symbol,
  onClose,
}: {
  holding: Holding;
  owner: `0x${string}`;
  decimals: number;
  symbol: string;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState(String(holding.position.transferable));
  const [price, setPrice] = useState('');
  const approveTx = useTx();
  const listTx = useTx();

  const approved = useApprovedForAll(owner, CONTRACTS.secondaryMarket);

  const bottles = parseBottles(quantity);
  const max = Number(holding.position.transferable);
  const unit = parseAmount(price, decimals);
  const valid = bottles !== null && bottles > 0 && bottles <= max && unit !== null && unit > 0n;
  const gross = valid ? unit! * BigInt(bottles!) : 0n;

  return (
    <ActionReview
      open
      onClose={onClose}
      title="List bottles for resale"
      object={
        <div className="space-y-4">
          <p className="text-body font-medium">{holding.lot.name}</p>
          <Field
            label="Bottles to list"
            hint={`Up to ${formatCount(holding.position.transferable)} transferable bottles.`}
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
            hint="Buyers see this price with the protocol fee and the producer royalty disclosed."
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
        </div>
      }
      consequence={
        <>
          <p>
            The bottles stay in your wallet until someone buys them. At {formatMoney(gross, decimals)}{' '}
            gross, the sale price splits into the protocol fee, the producer’s royalty of{' '}
            {(holding.lot.royaltyBps / 100).toFixed(2)}% and your proceeds.
          </p>
          <p className="mt-2">You can cancel or reprice the listing at any time.</p>
        </>
      }
      steps={[
        {
          id: 'approve',
          label: 'Allow the secondary market to move these bottles',
          note: 'A listing without this approval cannot be bought.',
          required: approved.data === false,
          run: () =>
            approveTx.send({
              address: CONTRACTS.wineLotToken,
              abi: wineLotTokenAbi,
              functionName: 'setApprovalForAll',
              args: [CONTRACTS.secondaryMarket, true],
            }),
          tx: approveTx,
        },
        {
          id: 'list',
          label: `List ${formatCount(bottles ?? 0)} bottles for resale`,
          required: true,
          run: () =>
            listTx.send({
              address: CONTRACTS.secondaryMarket,
              abi: secondaryMarketAbi,
              functionName: 'list',
              args: [holding.lot.id, bottles!, unit!, PAYMENT_TOKEN.address],
            }),
          tx: listTx,
        },
      ]}
      blocked={!valid ? 'Enter a quantity and a price per bottle.' : undefined}
    />
  );
}
