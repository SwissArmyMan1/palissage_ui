import { useMemo } from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
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

/** `PalissageLens.positions` reverts above this many ids in one call. */
const POSITIONS_PER_CALL = 50;

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

/**
 * Every lot in the catalogue, however many pages that takes.
 *
 * A portfolio has to be complete or it is misleading, and one `lots()` call
 * returns at most `MAX_LIMIT` rows. The unfiltered listing is id-ordered with
 * no rows dropped, so its page boundaries are known in advance from
 * `lotCount`: cursors are 1, 51, 101 … and every page can be requested in the
 * same multicall instead of chained round trips.
 *
 * Screens that browse rather than account for holdings should keep using
 * `useLots` with visible pagination — this one grows with the catalogue.
 *
 * The ceiling is real and worth naming: the Lens has no "what does this wallet
 * hold" query, so a complete portfolio means scanning every lot. At a few
 * hundred lots that is a handful of calls in one multicall; far beyond that it
 * needs an index the Lens does not have. It is left uncapped on purpose — a
 * capped read would go back to hiding someone's bottles without telling them,
 * and a read that fails loudly is better than one that lies quietly.
 */
export function useAllLots() {
  const protocol = useProtocol();
  const count = protocol.data?.lotCount ?? 0n;

  const cursors = useMemo(() => {
    const out: bigint[] = [];
    for (let cursor = 1n; cursor <= count; cursor += PAGE_LIMIT) out.push(cursor);
    return out;
  }, [count]);

  const query = useReadContracts({
    contracts: cursors.map((cursor) => ({
      ...lens,
      functionName: 'lots' as const,
      args: [cursor, PAGE_LIMIT] as const,
    })),
    query: { ...listQuery, enabled: cursors.length > 0 },
  });

  const items = useMemo(() => {
    if (!query.data) return [];
    return query.data.flatMap((entry) =>
      entry.status === 'success'
        ? ((entry.result as readonly [readonly LotView[], bigint])[0] ?? [])
        : [],
    );
  }, [query.data]);

  return {
    ...query,
    items,
    hasData:
      protocol.data !== undefined &&
      (cursors.length === 0 ||
        Boolean(query.data?.every((entry) => entry.status === 'success'))),
  };
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

/**
 * Holdings across any number of lots.
 *
 * `PalissageLens.positions` reverts with `TooManyPositionIds` above 50 ids, so
 * this used to slice the list and read the first 50. That silently hid a
 * holder's own bottles the moment the catalogue passed fifty lots — the worst
 * possible thing for a portfolio to do quietly. The ids are chunked instead and
 * the chunks are read together in one multicall, so the answer covers every lot
 * it was asked about.
 */
export function usePositions(account?: Address, lotIds: readonly bigint[] = []) {
  const chunks = useMemo(() => {
    const out: bigint[][] = [];
    for (let i = 0; i < lotIds.length; i += POSITIONS_PER_CALL) {
      out.push(lotIds.slice(i, i + POSITIONS_PER_CALL));
    }
    return out;
  }, [lotIds]);

  const query = useReadContracts({
    contracts: chunks.map((chunk) => ({
      ...lens,
      functionName: 'positions' as const,
      args: [account as Address, chunk] as const,
    })),
    query: { ...listQuery, enabled: Boolean(account) && chunks.length > 0 },
  });

  const items = useMemo(() => {
    if (!query.data) return [];
    return query.data.flatMap((entry) =>
      entry.status === 'success' ? ((entry.result as readonly PositionView[]) ?? []) : [],
    );
  }, [query.data]);

  return {
    ...query,
    items,
    // Every chunk has to have answered, or the portfolio would present a
    // partial holding as a complete one.
    hasData: chunks.length === 0 || Boolean(query.data?.every((entry) => entry.status === 'success')),
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
