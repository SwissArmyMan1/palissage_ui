import { useAccount, useReadContract } from 'wagmi';
import { keepPreviousData } from '@tanstack/react-query';
import type { Address } from 'viem';
import { palissageLensAbi, erc20Abi } from './abis';
import { CONTRACTS, PAYMENT_TOKEN } from './config';
import type {
  AllocationView,
  ListingView,
  LotView,
  OfferView,
  ParticipantView,
  PositionView,
  ProtocolView,
  RedemptionView,
  SettlementView,
} from './types';
import { PAGE_LIMIT } from './types';

/**
 * Every screen reads through PalissageLens. The interface derives no financial
 * value the Lens already computes (doc 00 §5), and it never asks for more than
 * MAX_LIMIT rows in one call.
 *
 * A block-triggered re-read is a *refresh*, never an initial load: the numbers
 * on screen stay and `isFetching` drives the 2 px progress line under the top
 * bar. That is why `placeholderData` keeps the previous page.
 *
 * Every list hook also returns `hasData`. Screens must branch on that, not on
 * `isLoading`: React Query clears `isLoading` when a read *fails*, so a slow or
 * blocked RPC would otherwise fall straight through to the empty state and
 * claim there are no lots. An empty collection and an unanswered read are
 * different facts and the interface may not confuse them.
 */

const lens = { address: CONTRACTS.palissageLens, abi: palissageLensAbi } as const;

/** Poll cadence. Base blocks land every ~2 s; a screen does not need each one. */
const REFRESH_MS = 12_000;

const listQuery = {
  refetchInterval: REFRESH_MS,
  staleTime: 8_000,
  // Keeps the previous page on screen while the next read lands, so a refresh
  // never blanks a list that already has rows in it.
  placeholderData: keepPreviousData,
} as const;

export function useProtocol() {
  const query = useReadContract({
    ...lens,
    functionName: 'protocol',
    args: [PAYMENT_TOKEN.address],
    query: { refetchInterval: REFRESH_MS, staleTime: 30_000 },
  });
  return { ...query, data: query.data as ProtocolView | undefined };
}

export function useParticipant(wallet?: Address) {
  const query = useReadContract({
    ...lens,
    functionName: 'participant',
    args: wallet ? [wallet] : undefined,
    query: { enabled: Boolean(wallet), refetchInterval: REFRESH_MS },
  });
  return { ...query, data: query.data as ParticipantView | undefined };
}

/** The connected wallet's participant record, or undefined when disconnected. */
export function useMyParticipant() {
  const { address } = useAccount();
  return useParticipant(address);
}

export function useLots(cursor = 0n, limit = PAGE_LIMIT) {
  const query = useReadContract({
    ...lens,
    functionName: 'lots',
    args: [cursor, limit],
    query: listQuery,
  });
  const [items, nextCursor] = (query.data as readonly [readonly LotView[], bigint] | undefined) ?? [];
  return { ...query, items: items ?? [], nextCursor: nextCursor ?? 0n, hasData: query.data !== undefined };
}

export function useLot(id?: bigint) {
  const query = useReadContract({
    ...lens,
    functionName: 'lot',
    args: id !== undefined ? [id] : undefined,
    query: { enabled: id !== undefined, refetchInterval: REFRESH_MS },
  });
  const [exists, view] = (query.data as readonly [boolean, LotView] | undefined) ?? [];
  return { ...query, exists: exists ?? false, lot: view };
}

export function useLotsOfWinery(winery?: Address, cursor = 0n, limit = PAGE_LIMIT) {
  const query = useReadContract({
    ...lens,
    functionName: 'lotsOfWinery',
    args: winery ? [winery, cursor, limit] : undefined,
    query: { ...listQuery, enabled: Boolean(winery) },
  });
  const [items, nextCursor] = (query.data as readonly [readonly LotView[], bigint] | undefined) ?? [];
  return { ...query, items: items ?? [], nextCursor: nextCursor ?? 0n, hasData: query.data !== undefined };
}

export function useOffers(cursor = 0n, limit = PAGE_LIMIT) {
  const query = useReadContract({
    ...lens,
    functionName: 'offers',
    args: [cursor, limit],
    query: listQuery,
  });
  const [items, nextCursor] =
    (query.data as readonly [readonly OfferView[], bigint] | undefined) ?? [];
  return { ...query, items: items ?? [], nextCursor: nextCursor ?? 0n, hasData: query.data !== undefined };
}

export function useOffersOfLot(lotId?: bigint, cursor = 0n, limit = PAGE_LIMIT) {
  const query = useReadContract({
    ...lens,
    functionName: 'offersOfLot',
    args: lotId !== undefined ? [lotId, cursor, limit] : undefined,
    query: { ...listQuery, enabled: lotId !== undefined },
  });
  const [items, nextCursor] =
    (query.data as readonly [readonly OfferView[], bigint] | undefined) ?? [];
  return { ...query, items: items ?? [], nextCursor: nextCursor ?? 0n, hasData: query.data !== undefined };
}

export function useOffersOfWinery(winery?: Address, cursor = 0n, limit = PAGE_LIMIT) {
  const query = useReadContract({
    ...lens,
    functionName: 'offersOfWinery',
    args: winery ? [winery, cursor, limit] : undefined,
    query: { ...listQuery, enabled: Boolean(winery) },
  });
  const [items, nextCursor] =
    (query.data as readonly [readonly OfferView[], bigint] | undefined) ?? [];
  return { ...query, items: items ?? [], nextCursor: nextCursor ?? 0n, hasData: query.data !== undefined };
}

export function useOffer(id?: bigint) {
  const query = useReadContract({
    ...lens,
    functionName: 'offer',
    args: id !== undefined ? [id] : undefined,
    query: { enabled: id !== undefined, refetchInterval: REFRESH_MS },
  });
  return { ...query, data: query.data as OfferView | undefined };
}

export function useAllocation(id?: bigint) {
  const query = useReadContract({
    ...lens,
    functionName: 'allocation',
    args: id !== undefined ? [id] : undefined,
    query: { enabled: id !== undefined, refetchInterval: REFRESH_MS },
  });
  return { ...query, data: query.data as AllocationView | undefined };
}

export function useAllocationsOfBuyer(buyer?: Address, cursor = 0n, limit = PAGE_LIMIT) {
  const query = useReadContract({
    ...lens,
    functionName: 'allocationsOfBuyer',
    args: buyer ? [buyer, cursor, limit] : undefined,
    query: { ...listQuery, enabled: Boolean(buyer) },
  });
  const [items, nextCursor] =
    (query.data as readonly [readonly AllocationView[], bigint] | undefined) ?? [];
  return { ...query, items: items ?? [], nextCursor: nextCursor ?? 0n, hasData: query.data !== undefined };
}

export function useAllocationsOfOffer(offerId?: bigint, cursor = 0n, limit = PAGE_LIMIT) {
  const query = useReadContract({
    ...lens,
    functionName: 'allocationsOfOffer',
    args: offerId !== undefined ? [offerId, cursor, limit] : undefined,
    query: { ...listQuery, enabled: offerId !== undefined },
  });
  const [items, nextCursor] =
    (query.data as readonly [readonly AllocationView[], bigint] | undefined) ?? [];
  return { ...query, items: items ?? [], nextCursor: nextCursor ?? 0n, hasData: query.data !== undefined };
}

export function useActiveListings(cursor = 0n, limit = PAGE_LIMIT) {
  const query = useReadContract({
    ...lens,
    functionName: 'activeListings',
    args: [cursor, limit],
    query: listQuery,
  });
  const [items, nextCursor] =
    (query.data as readonly [readonly ListingView[], bigint] | undefined) ?? [];
  return { ...query, items: items ?? [], nextCursor: nextCursor ?? 0n, hasData: query.data !== undefined };
}

export function useListingsOfSeller(seller?: Address, cursor = 0n, limit = PAGE_LIMIT) {
  const query = useReadContract({
    ...lens,
    functionName: 'listingsOfSeller',
    args: seller ? [seller, cursor, limit] : undefined,
    query: { ...listQuery, enabled: Boolean(seller) },
  });
  const [items, nextCursor] =
    (query.data as readonly [readonly ListingView[], bigint] | undefined) ?? [];
  return { ...query, items: items ?? [], nextCursor: nextCursor ?? 0n, hasData: query.data !== undefined };
}

export function useListing(id?: bigint) {
  const query = useReadContract({
    ...lens,
    functionName: 'listing',
    args: id !== undefined ? [id] : undefined,
    query: { enabled: id !== undefined, refetchInterval: REFRESH_MS },
  });
  return { ...query, data: query.data as ListingView | undefined };
}

export function useRedemption(id?: bigint) {
  const query = useReadContract({
    ...lens,
    functionName: 'redemption',
    args: id !== undefined ? [id] : undefined,
    query: { enabled: id !== undefined, refetchInterval: REFRESH_MS },
  });
  return { ...query, data: query.data as RedemptionView | undefined };
}

export function useRedemptions(cursor = 0n, limit = PAGE_LIMIT) {
  const query = useReadContract({
    ...lens,
    functionName: 'redemptions',
    args: [cursor, limit],
    query: listQuery,
  });
  const [items, nextCursor] =
    (query.data as readonly [readonly RedemptionView[], bigint] | undefined) ?? [];
  return { ...query, items: items ?? [], nextCursor: nextCursor ?? 0n, hasData: query.data !== undefined };
}

export function useRedemptionsOfBuyer(buyer?: Address, cursor = 0n, limit = PAGE_LIMIT) {
  const query = useReadContract({
    ...lens,
    functionName: 'redemptionsOfBuyer',
    args: buyer ? [buyer, cursor, limit] : undefined,
    query: { ...listQuery, enabled: Boolean(buyer) },
  });
  const [items, nextCursor] =
    (query.data as readonly [readonly RedemptionView[], bigint] | undefined) ?? [];
  return { ...query, items: items ?? [], nextCursor: nextCursor ?? 0n, hasData: query.data !== undefined };
}

export function useRedemptionsOfWinery(winery?: Address, cursor = 0n, limit = PAGE_LIMIT) {
  const query = useReadContract({
    ...lens,
    functionName: 'redemptionsOfWinery',
    args: winery ? [winery, cursor, limit] : undefined,
    query: { ...listQuery, enabled: Boolean(winery) },
  });
  const [items, nextCursor] =
    (query.data as readonly [readonly RedemptionView[], bigint] | undefined) ?? [];
  return { ...query, items: items ?? [], nextCursor: nextCursor ?? 0n, hasData: query.data !== undefined };
}

/** Positions are capped at 50 lot ids per call by the Lens. */
export function usePositions(account?: Address, lotIds: readonly bigint[] = []) {
  const capped = lotIds.slice(0, 50);
  const query = useReadContract({
    ...lens,
    functionName: 'positions',
    args: account && capped.length > 0 ? [account, capped] : undefined,
    query: { ...listQuery, enabled: Boolean(account) && capped.length > 0 },
  });
  return {
    ...query,
    items: (query.data as readonly PositionView[] | undefined) ?? [],
    hasData: query.data !== undefined,
  };
}

export function useSettlement(offerId?: bigint) {
  const query = useReadContract({
    ...lens,
    functionName: 'settlement',
    args: offerId !== undefined ? [offerId] : undefined,
    query: { enabled: offerId !== undefined, refetchInterval: REFRESH_MS },
  });
  return { ...query, data: query.data as SettlementView | undefined };
}

/** Settlement-asset balance of a wallet, in base units. */
export function usePaymentBalance(owner?: Address) {
  const query = useReadContract({
    address: PAYMENT_TOKEN.address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: owner ? [owner] : undefined,
    query: { enabled: Boolean(owner), refetchInterval: REFRESH_MS },
  });
  return { ...query, data: query.data as bigint | undefined };
}

/** How much of the settlement asset a spender may already move. */
export function usePaymentAllowance(owner?: Address, spender?: Address) {
  const query = useReadContract({
    address: PAYMENT_TOKEN.address,
    abi: erc20Abi,
    functionName: 'allowance',
    args: owner && spender ? [owner, spender] : undefined,
    query: { enabled: Boolean(owner && spender), refetchInterval: REFRESH_MS },
  });
  return { ...query, data: query.data as bigint | undefined };
}
