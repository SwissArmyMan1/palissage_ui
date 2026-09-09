import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, TextInput } from '@/components/ui/Field';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CabinetPage, PageHeader } from '@/components/layout/PageHeader';
import { ConnectPrompt } from '@/components/layout/ConnectPrompt';
import { ActionReview } from '@/components/patterns/ActionReview';
import { FeeBreakdown } from '@/components/patterns/FeeBreakdown';
import {
  useActiveListings,
  useListingsOfSeller,
  useLots,
  useMyParticipant,
  usePaymentAllowance,
  usePaymentBalance,
  useProtocol,
} from '@/chain/lens';
import { erc20Abi, secondaryMarketAbi } from '@/chain/abis';
import { CONTRACTS, PAYMENT_TOKEN } from '@/chain/config';
import { useTx } from '@/chain/tx';
import { formatBps, formatCount, formatMoney, parseBottles } from '@/lib/format';
import type { ListingView } from '@/chain/types';

/**
 * SHO-09 and SHO-10. Resale between qualified buyers.
 *
 * The purchase carries a price cap and a deadline, both required by the
 * contract, so a listing cannot be repriced under a buyer mid-transaction.
 */
export default function Secondary() {
  const { address, isConnected } = useAccount();
  const listings = useActiveListings();
  const mine = useListingsOfSeller(address);
  const lots = useLots();
  const protocol = useProtocol();
  const participant = useMyParticipant();

  const [buying, setBuying] = useState<ListingView | null>(null);
  const [cancelling, setCancelling] = useState<ListingView | null>(null);

  const decimals = protocol.data?.paymentDecimals ?? PAYMENT_TOKEN.decimals;
  const lotName = useMemo(() => {
    const byId = new Map(lots.items.map((lot) => [String(lot.id), lot.name]));
    return (id: bigint) => byId.get(String(id)) ?? `Lot #${String(id)}`;
  }, [lots.items]);

  const others = listings.items.filter(
    (listing) => !address || listing.seller.toLowerCase() !== address.toLowerCase(),
  );

  return (
    <CabinetPage>
      <PageHeader
        title="Secondary market"
        lede="Bottles other qualified buyers are reselling, and the listings you have posted. The producer's royalty is paid automatically at purchase."
      />

      <div className="mt-8 space-y-12">
        <section aria-labelledby="open-listings">
          <h2 id="open-listings" className="t-h3">
            Open listings
          </h2>
          {!listings.hasData ? (
            <SkeletonRows count={2} label="Loading listings…" />
          ) : others.length === 0 ? (
            <EmptyState
              className="mt-4"
              title="No listings are open right now."
              body="A holder can list bottles they already hold, at a price they choose, to other qualified buyers."
              action={{ label: 'Open your portfolio', to: '/app/shop/portfolio' }}
            />
          ) : (
            <ul className="mt-4 space-y-4">
              {others.map((listing) => (
                <li key={String(listing.id)} className="card flex flex-wrap items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/lots/${listing.lotId}`}
                      className="text-body font-medium underline decoration-transparent underline-offset-4 hover:decoration-current"
                    >
                      {lotName(listing.lotId)}
                    </Link>
                    <p className="text-body-sm text-ink-secondary tabular-nums">
                      {formatCount(listing.quantity)} bottles ·{' '}
                      {formatMoney(listing.pricePerBottle, decimals)} per bottle · listing #
                      {String(listing.id)}
                    </p>
                  </div>
                  {!listing.sellerApproved ? (
                    <StatusBadge tone="warning">Seller approval missing</StatusBadge>
                  ) : !listing.lotVerified ? (
                    <StatusBadge tone="danger">Lot not verified</StatusBadge>
                  ) : (
                    <StatusBadge tone="success">Buyable</StatusBadge>
                  )}
                  <Button
                    size="sm"
                    disabled={!listing.sellerApproved || !listing.lotVerified}
                    onClick={() => setBuying(listing)}
                  >
                    Buy bottles
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="my-listings">
          <h2 id="my-listings" className="t-h3">
            Your listings
          </h2>
          {!isConnected ? (
            <ConnectPrompt what="your listings" className="mt-4" />
          ) : mine.items.length === 0 ? (
            <p className="mt-3 text-body-sm text-ink-secondary">
              You have not listed anything. Listings are created from your portfolio.
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {mine.items.map((listing) => (
                <li key={String(listing.id)} className="card flex flex-wrap items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-medium">{lotName(listing.lotId)}</p>
                    <p className="text-body-sm text-ink-secondary tabular-nums">
                      {formatCount(listing.quantity)} bottles at{' '}
                      {formatMoney(listing.pricePerBottle, decimals)} · royalty{' '}
                      {formatBps(listing.royaltyBps)} · fee {formatBps(listing.feeBps)}
                    </p>
                  </div>
                  <StatusBadge tone={listing.active ? 'success' : 'neutral'}>
                    {listing.active ? 'Active' : 'Closed'}
                  </StatusBadge>
                  {listing.active ? (
                    <Button size="sm" kind="danger" onClick={() => setCancelling(listing)}>
                      Cancel listing
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        {!participant.data?.b2bClaim && isConnected ? (
          <Callout tone="warning" title="This wallet cannot buy on the secondary market yet">
            Bottles can only be received by a wallet the registry has verified.
          </Callout>
        ) : null}
      </div>

      {buying ? (
        <BuyListing
          listing={buying}
          lotName={lotName(buying.lotId)}
          decimals={decimals}
          onClose={() => setBuying(null)}
        />
      ) : null}
      {cancelling ? (
        <CancelListing listing={cancelling} onClose={() => setCancelling(null)} />
      ) : null}
    </CabinetPage>
  );
}

function BuyListing({
  listing,
  lotName,
  decimals,
  onClose,
}: {
  listing: ListingView;
  lotName: string;
  decimals: number;
  onClose: () => void;
}) {
  const { address } = useAccount();
  const [quantity, setQuantity] = useState(String(listing.quantity));
  const balance = usePaymentBalance(address);
  const allowance = usePaymentAllowance(address, CONTRACTS.secondaryMarket);
  const approveTx = useTx();
  const buyTx = useTx();

  const bottles = parseBottles(quantity);
  const valid = bottles !== null && bottles > 0 && bottles <= listing.quantity;
  const total = valid ? listing.pricePerBottle * BigInt(bottles!) : 0n;
  const fee = (total * BigInt(listing.feeBps)) / 10_000n;
  const royalty = (total * BigInt(listing.royaltyBps)) / 10_000n;
  const proceeds = total - fee - royalty;

  const needsApproval = (allowance.data ?? 0n) < total;

  const blocked = !valid
    ? 'Enter how many bottles you want.'
    : (balance.data ?? 0n) < total
      ? `You need ${formatMoney(total, decimals)}. This wallet holds ${formatMoney(
          balance.data ?? 0n,
          decimals,
        )}.`
      : undefined;

  return (
    <ActionReview
      open
      onClose={onClose}
      title="Buy from this listing"
      object={
        <div className="space-y-3">
          <p className="text-body font-medium">{lotName}</p>
          <Field
            label="Bottles to buy"
            hint={`Up to ${formatCount(listing.quantity)} in this listing.`}
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
        </div>
      }
      summary={
        <FeeBreakdown
          lines={[
            {
              label: `${formatCount(bottles ?? 0)} bottles × ${formatMoney(
                listing.pricePerBottle,
                decimals,
              )}`,
              value: formatMoney(total, decimals),
              emphasis: true,
            },
            {
              label: `Protocol fee ${formatBps(listing.feeBps)}`,
              value: formatMoney(fee, decimals),
              muted: true,
            },
            {
              label: `Producer royalty ${formatBps(listing.royaltyBps)}`,
              value: formatMoney(royalty, decimals),
              muted: true,
            },
            {
              label: 'Seller receives',
              value: formatMoney(proceeds, decimals),
              muted: true,
            },
          ]}
          footnotes={[
            'The fee and the royalty come out of the price you pay; they are not added to it.',
            'This purchase carries a price cap and a ten-minute deadline, so the listing cannot be repriced under you.',
          ]}
        />
      }
      consequence={
        <p>
          {formatCount(bottles ?? 0)} bottles move from the seller to your wallet and{' '}
          {formatMoney(total, decimals)} is split between the seller, the producer and the
          protocol treasury.
        </p>
      }
      steps={[
        {
          id: 'approve',
          label: `Allow the market to use ${formatMoney(total, decimals)}`,
          required: needsApproval,
          run: () =>
            approveTx.send({
              address: PAYMENT_TOKEN.address,
              abi: erc20Abi,
              functionName: 'approve',
              args: [CONTRACTS.secondaryMarket, total],
            }),
          tx: approveTx,
        },
        {
          id: 'buy',
          label: `Buy ${formatCount(bottles ?? 0)} bottles for ${formatMoney(total, decimals)}`,
          required: true,
          run: () =>
            buyTx.send({
              address: CONTRACTS.secondaryMarket,
              abi: secondaryMarketAbi,
              functionName: 'buy',
              args: [
                listing.id,
                bottles!,
                listing.pricePerBottle,
                // The contract takes a price cap and a deadline. Ten minutes is
                // generous for Base and short enough that a stale confirmation
                // fails closed. Read at send time, not at render time.
                BigInt(Math.floor(Date.now() / 1000) + 600),
              ],
            }),
          tx: buyTx,
        },
      ]}
      blocked={blocked}
    />
  );
}

function CancelListing({ listing, onClose }: { listing: ListingView; onClose: () => void }) {
  const tx = useTx();
  return (
    <ActionReview
      open
      onClose={onClose}
      destructive
      title={`Cancel listing #${String(listing.id)}`}
      object={<p className="text-body">{formatCount(listing.quantity)} bottles</p>}
      consequence={
        <p>
          The listing closes and the bottles stay in your wallet. Nothing is transferred. This is a
          transaction, so it cannot be undone with an undo.
        </p>
      }
      steps={[
        {
          id: 'cancel',
          label: 'Cancel the listing',
          required: true,
          run: () =>
            tx.send({
              address: CONTRACTS.secondaryMarket,
              abi: secondaryMarketAbi,
              functionName: 'cancelListing',
              args: [listing.id],
            }),
          tx,
        },
      ]}
    />
  );
}
