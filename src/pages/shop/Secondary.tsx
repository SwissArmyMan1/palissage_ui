import { useMemo, useState } from 'react';
import { LotThumb } from '@/components/ui/LotThumb';
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
import { CONTRACTS } from '@/chain/config';
import { formatTokenAmount, tokenMeta, type TokenMeta } from '@/chain/tokens';
import { useTx } from '@/chain/tx';
import { formatAmount, formatBps, formatCount, parseAmount, parseBottles } from '@/lib/format';
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
  const [repricing, setRepricing] = useState<ListingView | null>(null);

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
                  <LotThumb lotId={listing.lotId} size={52} />
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/lots/${listing.lotId}`}
                      className="text-body font-medium underline decoration-transparent underline-offset-4 hover:decoration-current"
                    >
                      {lotName(listing.lotId)}
                    </Link>
                    <p className="text-body-sm text-ink-secondary tabular-nums">
                      {formatCount(listing.quantity)} bottles ·{' '}
                      {formatTokenAmount(
                        listing.pricePerBottle,
                        tokenMeta(listing.paymentToken, protocol.data),
                      )}{' '}
                      per bottle · listing #{String(listing.id)}
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
                  <LotThumb lotId={listing.lotId} size={52} />
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-medium">{lotName(listing.lotId)}</p>
                    <p className="text-body-sm text-ink-secondary tabular-nums">
                      {formatCount(listing.quantity)} bottles at{' '}
                      {formatTokenAmount(
                        listing.pricePerBottle,
                        tokenMeta(listing.paymentToken, protocol.data),
                      )}{' '}
                      · royalty{' '}
                      {formatBps(listing.royaltyBps)} · fee {formatBps(listing.feeBps)}
                    </p>
                  </div>
                  <StatusBadge tone={listing.active ? 'success' : 'neutral'}>
                    {listing.active ? 'Active' : 'Closed'}
                  </StatusBadge>
                  {listing.active ? (
                    <>
                      <Button size="sm" kind="secondary" onClick={() => setRepricing(listing)}>
                        Change price
                      </Button>
                      <Button size="sm" kind="danger" onClick={() => setCancelling(listing)}>
                        Cancel listing
                      </Button>
                    </>
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
          meta={tokenMeta(buying.paymentToken, protocol.data)}
          onClose={() => setBuying(null)}
        />
      ) : null}
      {cancelling ? (
        <CancelListing listing={cancelling} onClose={() => setCancelling(null)} />
      ) : null}
      {repricing ? (
        <RepriceListing
          listing={repricing}
          lotName={lotName(repricing.lotId)}
          meta={tokenMeta(repricing.paymentToken, protocol.data)}
          onClose={() => setRepricing(null)}
        />
      ) : null}
    </CabinetPage>
  );
}

/**
 * SHO-10a. Repricing a live listing.
 *
 * `updateListingPrice` keeps the listing and its quantity and changes only the
 * unit price, so this is not a destructive action and does not dress itself as
 * one. What it does need is the buyer-side consequence stated: every open
 * purchase carries a price cap, so raising the price does not catch anyone —
 * it simply stops matching the caps already out there.
 */
function RepriceListing({
  listing,
  lotName,
  meta,
  onClose,
}: {
  listing: ListingView;
  lotName: string;
  meta: TokenMeta;
  onClose: () => void;
}) {
  const decimals = meta.decimals;
  const symbol = meta.symbol;
  const [price, setPrice] = useState(formatAmount(listing.pricePerBottle, decimals, 2));
  const [touched, setTouched] = useState(false);
  const tx = useTx();

  const unit = parseAmount(price, decimals);
  const invalid = price !== '' && (unit === null || unit <= 0n);
  const unchanged = unit !== null && unit === listing.pricePerBottle;
  const gross = unit !== null && unit > 0n ? unit * BigInt(listing.quantity) : 0n;
  const fee = (gross * BigInt(listing.feeBps)) / 10_000n;
  const royalty = (gross * BigInt(listing.royaltyBps)) / 10_000n;

  return (
    <ActionReview
      open
      onClose={onClose}
      title="Change the price of this listing"
      object={
        <div className="space-y-4">
          <p className="text-body font-medium">
            {lotName} · {formatCount(listing.quantity)} bottles · listing #{String(listing.id)}
          </p>
          <Field
            label={`New price per bottle (${symbol})`}
            hint={`Currently ${formatTokenAmount(listing.pricePerBottle, meta)} per bottle.`}
            // The field opens at the current price on purpose, so "unchanged"
            // is only an error once the reader has been in it.
            error={
              invalid
                ? `Enter a price in ${symbol}, greater than zero.`
                : touched && unchanged
                  ? 'This is the price the listing already carries.'
                  : undefined
            }
          >
            {(props) => (
              <TextInput
                {...props}
                inputMode="decimal"
                value={price}
                onChange={(event) => {
                  setTouched(true);
                  setPrice(event.target.value);
                }}
                className="tabular-nums"
              />
            )}
          </Field>
        </div>
      }
      consequence={
        <>
          <p>
            The listing keeps its {formatCount(listing.quantity)} bottles and its place on the
            market; only the unit price changes. At the new price the full listing is{' '}
            {formatTokenAmount(gross, meta)} gross — {formatTokenAmount(fee, meta)} protocol fee,{' '}
            {formatTokenAmount(royalty, meta)} producer royalty, {' '}
            {formatTokenAmount(gross - fee - royalty, meta)} to you.
          </p>
          <p className="mt-2">
            Buyers purchase with a price cap of their own, so a raised price cannot be charged to
            someone who agreed to less — their purchase simply stops going through.
          </p>
        </>
      }
      steps={[
        {
          id: 'reprice',
          label: `Set the price to ${formatTokenAmount(unit ?? 0n, meta)}`,
          required: true,
          run: () =>
            tx.send({
              address: CONTRACTS.secondaryMarket,
              abi: secondaryMarketAbi,
              functionName: 'updateListingPrice',
              args: [listing.id, unit!],
            }),
          tx,
        },
      ]}
      blocked={
        unit === null || unit <= 0n
          ? 'Enter a new price per bottle.'
          : unchanged
            ? 'The price is unchanged, so there is nothing to send.'
            : undefined
      }
    />
  );
}

function BuyListing({
  listing,
  lotName,
  meta,
  onClose,
}: {
  listing: ListingView;
  lotName: string;
  meta: TokenMeta;
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
    : // The listing's own asset is what `buy` pulls. If it is not the one the
      // markets settle in, this wallet's balance and allowance are for the
      // wrong token and the purchase cannot be prepared here.
      !meta.settlement
      ? meta.known
        ? `This listing is priced in ${meta.symbol}, which differs from your selected payment asset. Select that asset on the readiness page before buying.`
        : 'This listing is priced in an asset this interface cannot read, so it will not offer a purchase it cannot describe.'
      : (balance.data ?? 0n) < total
        ? `You need ${formatTokenAmount(total, meta)}. This wallet holds ${formatTokenAmount(balance.data ?? 0n, meta)}.`
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
              label: `${formatCount(bottles ?? 0)} bottles × ${formatTokenAmount(listing.pricePerBottle, meta)}`,
              value: formatTokenAmount(total, meta),
              emphasis: true,
            },
            {
              label: `Protocol fee ${formatBps(listing.feeBps)}`,
              value: formatTokenAmount(fee, meta),
              muted: true,
            },
            {
              label: `Producer royalty ${formatBps(listing.royaltyBps)}`,
              value: formatTokenAmount(royalty, meta),
              muted: true,
            },
            {
              label: 'Seller receives',
              value: formatTokenAmount(proceeds, meta),
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
          {formatTokenAmount(total, meta)} is split between the seller, the producer and the
          protocol treasury.
        </p>
      }
      steps={[
        {
          id: 'approve',
          label: `Allow the market to use ${formatTokenAmount(total, meta)}`,
          required: needsApproval,
          run: () =>
            approveTx.send({
              // The listing's own asset — see `blocked` above.
              address: listing.paymentToken,
              abi: erc20Abi,
              functionName: 'approve',
              args: [CONTRACTS.secondaryMarket, total],
            }),
          tx: approveTx,
        },
        {
          id: 'buy',
          label: `Buy ${formatCount(bottles ?? 0)} bottles for ${formatTokenAmount(total, meta)}`,
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
                // generous for the selected network and short enough that a stale confirmation
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
