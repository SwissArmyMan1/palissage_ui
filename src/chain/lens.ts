import { useMemo } from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { keepPreviousData } from '@tanstack/react-query';
import type { Address } from 'viem';
import { erc20Abi, palissageLensAbi, primaryMarketAbi, wineLotTokenAbi } from './abis';
import { accessControlAbi } from './access';
import { useSandbox, type SandboxState } from '@/sandbox/store';
import * as sim from '@/sandbox/select';
import { CHAIN_ID, DEPLOYMENT_READY, CONTRACTS, PAYMENT_TOKEN } from './config';
import type { AllocationView, LotView, PositionView, SettlementView } from './types';
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

const lens = { chainId: CHAIN_ID, address: CONTRACTS.palissageLens, abi: palissageLensAbi } as const;

/** Poll cadence. the selected network blocks land every ~2 s; a screen does not need each one. */
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

/**
 * The one seam the simulation needs on the read side.
 *
 * In simulation the chain query is **disabled**, not merely ignored — a demo
 * must generate no RPC traffic — and the selector answers in the Lens's own
 * shape, so every hook below keeps its existing post-processing. `useSandbox`
 * is always called, on a module-level store that is inactive by default, so the
 * hook count never changes and there is no conditional-hook hazard.
 */
function merge<
  Q extends { data: unknown; isLoading: boolean; isError: boolean; isFetching: boolean },
  D,
>(query: Q, sandbox: SandboxState | null, simulated: D | undefined) {
  return {
    ...query,
    data: (sandbox ? simulated : query.data) as D | undefined,
    isLoading: sandbox ? false : query.isLoading,
    isError: sandbox ? false : query.isError,
    isFetching: sandbox ? false : query.isFetching,
    hasData: sandbox ? simulated !== undefined : query.data !== undefined,
  };
}

export function useProtocol() {
  const sandbox = useSandbox();
  const query = useReadContract({
    ...lens,
    functionName: 'protocol',
    args: [PAYMENT_TOKEN.address],
    query: { enabled: !sandbox && DEPLOYMENT_READY, refetchInterval: REFRESH_MS, staleTime: 30_000 },
  });
  const result = merge(
    query,
    sandbox,
    sandbox ? sim.selectProtocol(sandbox) : undefined,
  );
  return result;
}

export function useParticipant(wallet?: Address) {
  const sandbox = useSandbox();
  const query = useReadContract({
    ...lens,
    functionName: 'participant',
    args: wallet ? [wallet] : undefined,
    query: { enabled: !sandbox && DEPLOYMENT_READY && (Boolean(wallet)), refetchInterval: REFRESH_MS },
  });
  const result = merge(
    query,
    sandbox,
    sandbox ? sim.selectParticipant(sandbox, wallet) : undefined,
  );
  return result;
}

/** The connected wallet's participant record, or undefined when disconnected. */
export function useMyParticipant() {
  const { address } = useAccount();
  return useParticipant(address);
}

export function useLots(cursor = 0n, limit = PAGE_LIMIT) {
  const sandbox = useSandbox();
  const query = useReadContract({
    ...lens,
    functionName: 'lots',
    args: [cursor, limit],
    query: { ...listQuery, enabled: !sandbox && DEPLOYMENT_READY },
  });
  const result = merge(
    query,
    sandbox,
    sandbox ? sim.selectLots(sandbox, cursor, limit) : undefined,
  );
  const [items, nextCursor] = result.data ?? [];
  return { ...result, items: items ?? [], nextCursor: nextCursor ?? 0n };
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
  const sandbox = useSandbox();
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
    query: { ...listQuery, enabled: !sandbox && DEPLOYMENT_READY && cursors.length > 0 },
  });

  const items = useMemo(() => {
    if (sandbox) return sandbox.lots;
    if (!query.data) return [];
    return query.data.flatMap((entry) =>
      entry.status === 'success'
        ? ((entry.result as readonly [readonly LotView[], bigint])[0] ?? [])
        : [],
    );
  }, [query.data, sandbox]);

  return {
    ...query,
    items,
    isLoading: sandbox ? false : query.isLoading,
    isError: sandbox ? false : query.isError,
    isFetching: sandbox ? false : query.isFetching,
    hasData: sandbox
      ? true
      : protocol.data !== undefined &&
        (cursors.length === 0 ||
          Boolean(query.data?.every((entry) => entry.status === 'success'))),
  };
}

export function useLot(id?: bigint) {
  const sandbox = useSandbox();
  const query = useReadContract({
    ...lens,
    functionName: 'lot',
    args: id !== undefined ? [id] : undefined,
    query: { enabled: !sandbox && DEPLOYMENT_READY && (id !== undefined), refetchInterval: REFRESH_MS },
  });
  const result = merge(
    query,
    sandbox,
    sandbox ? sim.selectLot(sandbox, id) : undefined,
  );
  const [exists, view] = result.data ?? [];
  return { ...result, exists: exists ?? false, lot: view };
}

export function useLotsOfWinery(winery?: Address, cursor = 0n, limit = PAGE_LIMIT) {
  const sandbox = useSandbox();
  const query = useReadContract({
    ...lens,
    functionName: 'lotsOfWinery',
    args: winery ? [winery, cursor, limit] : undefined,
    query: { ...listQuery, enabled: !sandbox && DEPLOYMENT_READY && (Boolean(winery))},
  });
  const result = merge(
    query,
    sandbox,
    sandbox ? sim.selectLotsOfWinery(sandbox, winery, cursor, limit) : undefined,
  );
  const [items, nextCursor] = result.data ?? [];
  return { ...result, items: items ?? [], nextCursor: nextCursor ?? 0n };
}

export function useOffers(cursor = 0n, limit = PAGE_LIMIT) {
  const sandbox = useSandbox();
  const query = useReadContract({
    ...lens,
    functionName: 'offers',
    args: [cursor, limit],
    query: { ...listQuery, enabled: !sandbox && DEPLOYMENT_READY },
  });
  const result = merge(
    query,
    sandbox,
    sandbox ? sim.selectOffers(sandbox, cursor, limit) : undefined,
  );
  const [items, nextCursor] = result.data ?? [];
  return { ...result, items: items ?? [], nextCursor: nextCursor ?? 0n };
}

export function useOffersOfLot(lotId?: bigint, cursor = 0n, limit = PAGE_LIMIT) {
  const sandbox = useSandbox();
  const query = useReadContract({
    ...lens,
    functionName: 'offersOfLot',
    args: lotId !== undefined ? [lotId, cursor, limit] : undefined,
    query: { ...listQuery, enabled: !sandbox && DEPLOYMENT_READY && (lotId !== undefined)},
  });
  const result = merge(
    query,
    sandbox,
    sandbox ? sim.selectOffersOfLot(sandbox, lotId, cursor, limit) : undefined,
  );
  const [items, nextCursor] = result.data ?? [];
  return { ...result, items: items ?? [], nextCursor: nextCursor ?? 0n };
}

export function useOffersOfWinery(winery?: Address, cursor = 0n, limit = PAGE_LIMIT) {
  const sandbox = useSandbox();
  const query = useReadContract({
    ...lens,
    functionName: 'offersOfWinery',
    args: winery ? [winery, cursor, limit] : undefined,
    query: { ...listQuery, enabled: !sandbox && DEPLOYMENT_READY && (Boolean(winery))},
  });
  const result = merge(
    query,
    sandbox,
    sandbox ? sim.selectOffersOfWinery(sandbox, winery, cursor, limit) : undefined,
  );
  const [items, nextCursor] = result.data ?? [];
  return { ...result, items: items ?? [], nextCursor: nextCursor ?? 0n };
}

export function useOffer(id?: bigint) {
  const sandbox = useSandbox();
  const query = useReadContract({
    ...lens,
    functionName: 'offer',
    args: id !== undefined ? [id] : undefined,
    query: { enabled: !sandbox && DEPLOYMENT_READY && (id !== undefined), refetchInterval: REFRESH_MS },
  });
  const result = merge(
    query,
    sandbox,
    sandbox ? sim.selectOffer(sandbox, id) : undefined,
  );
  return result;
}

export function useAllocation(id?: bigint) {
  const sandbox = useSandbox();
  const query = useReadContract({
    ...lens,
    functionName: 'allocation',
    args: id !== undefined ? [id] : undefined,
    query: { enabled: !sandbox && DEPLOYMENT_READY && (id !== undefined), refetchInterval: REFRESH_MS },
  });
  const result = merge(
    query,
    sandbox,
    sandbox ? sim.selectAllocation(sandbox, id) : undefined,
  );
  return result;
}

export function useAllocationsOfBuyer(buyer?: Address, cursor = 0n, limit = PAGE_LIMIT) {
  const sandbox = useSandbox();
  const query = useReadContract({
    ...lens,
    functionName: 'allocationsOfBuyer',
    args: buyer ? [buyer, cursor, limit] : undefined,
    query: { ...listQuery, enabled: !sandbox && DEPLOYMENT_READY && (Boolean(buyer))},
  });
  const result = merge(
    query,
    sandbox,
    sandbox ? sim.selectAllocationsOfBuyer(sandbox, buyer, cursor, limit) : undefined,
  );
  const [items, nextCursor] = result.data ?? [];
  return { ...result, items: items ?? [], nextCursor: nextCursor ?? 0n };
}

export function useAllocationsOfOffer(offerId?: bigint, cursor = 0n, limit = PAGE_LIMIT) {
  const sandbox = useSandbox();
  const query = useReadContract({
    ...lens,
    functionName: 'allocationsOfOffer',
    args: offerId !== undefined ? [offerId, cursor, limit] : undefined,
    query: { ...listQuery, enabled: !sandbox && DEPLOYMENT_READY && (offerId !== undefined)},
  });
  const result = merge(
    query,
    sandbox,
    sandbox ? sim.selectAllocationsOfOffer(sandbox, offerId, cursor, limit) : undefined,
  );
  const [items, nextCursor] = result.data ?? [];
  return { ...result, items: items ?? [], nextCursor: nextCursor ?? 0n };
}

export function useActiveListings(cursor = 0n, limit = PAGE_LIMIT) {
  const sandbox = useSandbox();
  const query = useReadContract({
    ...lens,
    functionName: 'activeListings',
    args: [cursor, limit],
    query: { ...listQuery, enabled: !sandbox && DEPLOYMENT_READY },
  });
  const result = merge(
    query,
    sandbox,
    sandbox ? sim.selectActiveListings(sandbox, cursor, limit) : undefined,
  );
  const [items, nextCursor] = result.data ?? [];
  return { ...result, items: items ?? [], nextCursor: nextCursor ?? 0n };
}

export function useListingsOfSeller(seller?: Address, cursor = 0n, limit = PAGE_LIMIT) {
  const sandbox = useSandbox();
  const query = useReadContract({
    ...lens,
    functionName: 'listingsOfSeller',
    args: seller ? [seller, cursor, limit] : undefined,
    query: { ...listQuery, enabled: !sandbox && DEPLOYMENT_READY && (Boolean(seller))},
  });
  const result = merge(
    query,
    sandbox,
    sandbox ? sim.selectListingsOfSeller(sandbox, seller, cursor, limit) : undefined,
  );
  const [items, nextCursor] = result.data ?? [];
  return { ...result, items: items ?? [], nextCursor: nextCursor ?? 0n };
}

export function useListing(id?: bigint) {
  const sandbox = useSandbox();
  const query = useReadContract({
    ...lens,
    functionName: 'listing',
    args: id !== undefined ? [id] : undefined,
    query: { enabled: !sandbox && DEPLOYMENT_READY && (id !== undefined), refetchInterval: REFRESH_MS },
  });
  const result = merge(
    query,
    sandbox,
    sandbox ? sim.selectListing(sandbox, id) : undefined,
  );
  return result;
}

export function useRedemption(id?: bigint) {
  const sandbox = useSandbox();
  const query = useReadContract({
    ...lens,
    functionName: 'redemption',
    args: id !== undefined ? [id] : undefined,
    query: { enabled: !sandbox && DEPLOYMENT_READY && (id !== undefined), refetchInterval: REFRESH_MS },
  });
  const result = merge(
    query,
    sandbox,
    sandbox ? sim.selectRedemption(sandbox, id) : undefined,
  );
  return result;
}

export function useRedemptions(cursor = 0n, limit = PAGE_LIMIT) {
  const sandbox = useSandbox();
  const query = useReadContract({
    ...lens,
    functionName: 'redemptions',
    args: [cursor, limit],
    query: { ...listQuery, enabled: !sandbox && DEPLOYMENT_READY },
  });
  const result = merge(
    query,
    sandbox,
    sandbox ? sim.selectRedemptions(sandbox, cursor, limit) : undefined,
  );
  const [items, nextCursor] = result.data ?? [];
  return { ...result, items: items ?? [], nextCursor: nextCursor ?? 0n };
}

export function useRedemptionsOfBuyer(buyer?: Address, cursor = 0n, limit = PAGE_LIMIT) {
  const sandbox = useSandbox();
  const query = useReadContract({
    ...lens,
    functionName: 'redemptionsOfBuyer',
    args: buyer ? [buyer, cursor, limit] : undefined,
    query: { ...listQuery, enabled: !sandbox && DEPLOYMENT_READY && (Boolean(buyer))},
  });
  const result = merge(
    query,
    sandbox,
    sandbox ? sim.selectRedemptionsOfBuyer(sandbox, buyer, cursor, limit) : undefined,
  );
  const [items, nextCursor] = result.data ?? [];
  return { ...result, items: items ?? [], nextCursor: nextCursor ?? 0n };
}

export function useRedemptionsOfWinery(winery?: Address, cursor = 0n, limit = PAGE_LIMIT) {
  const sandbox = useSandbox();
  const query = useReadContract({
    ...lens,
    functionName: 'redemptionsOfWinery',
    args: winery ? [winery, cursor, limit] : undefined,
    query: { ...listQuery, enabled: !sandbox && DEPLOYMENT_READY && (Boolean(winery))},
  });
  const result = merge(
    query,
    sandbox,
    sandbox ? sim.selectRedemptionsOfWinery(sandbox, winery, cursor, limit) : undefined,
  );
  const [items, nextCursor] = result.data ?? [];
  return { ...result, items: items ?? [], nextCursor: nextCursor ?? 0n };
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
  const sandbox = useSandbox();
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
    query: { ...listQuery, enabled: !sandbox && DEPLOYMENT_READY && Boolean(account) && chunks.length > 0 },
  });

  const items = useMemo(() => {
    if (sandbox) return sim.selectPositions(sandbox, account, lotIds);
    if (!query.data) return [];
    return query.data.flatMap((entry) =>
      entry.status === 'success' ? ((entry.result as readonly PositionView[]) ?? []) : [],
    );
  }, [query.data, sandbox, account, lotIds]);

  return {
    ...query,
    items,
    isLoading: sandbox ? false : query.isLoading,
    isError: sandbox ? false : query.isError,
    isFetching: sandbox ? false : query.isFetching,
    // Every chunk has to have answered, or the portfolio would present a
    // partial holding as a complete one.
    hasData: sandbox
      ? true
      : chunks.length === 0 || Boolean(query.data?.every((entry) => entry.status === 'success')),
  };
}

export function useSettlement(offerId?: bigint) {
  const sandbox = useSandbox();
  const query = useReadContract({
    ...lens,
    functionName: 'settlement',
    args: offerId !== undefined ? [offerId] : undefined,
    query: { enabled: !sandbox && DEPLOYMENT_READY && (offerId !== undefined), refetchInterval: REFRESH_MS },
  });
  const result = merge(
    query,
    sandbox,
    sandbox ? sim.selectSettlement(sandbox, offerId) : undefined,
  );
  return result;
}

/** Settlement-asset balance of a wallet, in base units. */
export function usePaymentBalance(owner?: Address) {
  const sandbox = useSandbox();
  const query = useReadContract({
    chainId: CHAIN_ID,
    address: PAYMENT_TOKEN.address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: owner ? [owner] : undefined,
    query: { enabled: !sandbox && DEPLOYMENT_READY && (Boolean(owner)), refetchInterval: REFRESH_MS },
  });
  const result = merge(
    query,
    sandbox,
    sandbox ? sim.selectPaymentBalance(sandbox, owner) : undefined,
  );
  return result;
}

/** How much of the settlement asset a spender may already move. */
export function usePaymentAllowance(owner?: Address, spender?: Address) {
  const sandbox = useSandbox();
  const query = useReadContract({
    chainId: CHAIN_ID,
    address: PAYMENT_TOKEN.address,
    abi: erc20Abi,
    functionName: 'allowance',
    args: owner && spender ? [owner, spender] : undefined,
    query: { enabled: !sandbox && DEPLOYMENT_READY && (Boolean(owner && spender)), refetchInterval: REFRESH_MS },
  });
  const result = merge(
    query,
    sandbox,
    sandbox ? sim.selectAllowance(sandbox, owner, spender) : undefined,
  );
  return result;
}

/* -------------------------------------------------------------------------
   Batched reads that used to live in the screens.

   Seven screens called `useReadContract(s)` directly, which put them outside
   the simulation seam: in a simulated tour they issued real requests and then
   rendered empty escrow, empty milestones and an unapproved token. Reads belong
   here, where the seam is, and nowhere else.
   ------------------------------------------------------------------------- */

/** One settlement per offer, aligned with the ids passed in. */
export function useSettlements(offerIds: readonly bigint[]) {
  const sandbox = useSandbox();
  const key = offerIds.join(',');
  const query = useReadContracts({
    contracts: offerIds.map((id) => ({
      ...lens,
      functionName: 'settlement' as const,
      args: [id] as const,
    })),
    query: { ...listQuery, enabled: !sandbox && DEPLOYMENT_READY && offerIds.length > 0 },
  });

  const items = useMemo<(SettlementView | undefined)[]>(() => {
    if (sandbox) return offerIds.map((id) => sim.selectSettlement(sandbox, id));
    return (query.data ?? []).map((entry) =>
      entry.status === 'success' ? (entry.result as SettlementView) : undefined,
    );
    // `key` stands in for the id array, which is rebuilt on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sandbox, query.data, key]);

  return {
    ...query,
    items,
    isLoading: sandbox ? false : query.isLoading,
    isError: sandbox ? false : query.isError,
    isFetching: sandbox ? false : query.isFetching,
  };
}

/** Every allocation against a set of offers, flattened. */
export function useAllocationsOfOffers(offerIds: readonly bigint[]) {
  const sandbox = useSandbox();
  const key = offerIds.join(',');
  const query = useReadContracts({
    contracts: offerIds.map((id) => ({
      ...lens,
      functionName: 'allocationsOfOffer' as const,
      args: [id, 0n, PAGE_LIMIT] as const,
    })),
    query: { ...listQuery, enabled: !sandbox && DEPLOYMENT_READY && offerIds.length > 0 },
  });

  const items = useMemo<AllocationView[]>(() => {
    if (sandbox) {
      return offerIds.flatMap((id) => [
        ...sim.selectAllocationsOfOffer(sandbox, id, 0n, PAGE_LIMIT)[0],
      ]);
    }
    return (query.data ?? []).flatMap((entry) => {
      const page = entry?.result as readonly [readonly AllocationView[], bigint] | undefined;
      return page ? [...page[0]] : [];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sandbox, query.data, key]);

  return { ...query, items, isLoading: sandbox ? false : query.isLoading };
}

/** WineLotToken.isApprovedForAll — the redemption manager needs it to burn. */
export function useApprovedForAll(owner?: Address, operator?: Address) {
  const sandbox = useSandbox();
  const query = useReadContract({
    chainId: CHAIN_ID,
    address: CONTRACTS.wineLotToken,
    abi: wineLotTokenAbi,
    functionName: 'isApprovedForAll',
    args: owner && operator ? [owner, operator] : undefined,
    query: { enabled: !sandbox && DEPLOYMENT_READY && Boolean(owner && operator) },
  });
  return merge(query, sandbox, sandbox ? sim.selectApprovedForAll(sandbox, owner, operator) : undefined);
}

/** PrimaryMarket.milestonesLocked — a plan is fixed once money has settled. */
export function useMilestonesLocked(offerId?: bigint) {
  const sandbox = useSandbox();
  const query = useReadContract({
    chainId: CHAIN_ID,
    address: CONTRACTS.primaryMarket,
    abi: primaryMarketAbi,
    functionName: 'milestonesLocked',
    args: offerId !== undefined ? [offerId] : undefined,
    query: { enabled: !sandbox && DEPLOYMENT_READY && offerId !== undefined },
  });
  return merge(query, sandbox, sandbox ? sim.selectMilestonesLocked(sandbox, offerId) : undefined);
}

/** `DEFAULT_ADMIN_ROLE` on each of a set of contracts. */
export function useAdminRoles(
  entries: readonly { address: Address; role: `0x${string}` }[],
  account?: Address,
) {
  const sandbox = useSandbox();
  const key = entries.map((entry) => entry.address).join(',');
  const query = useReadContracts({
    contracts: entries.map((entry) => ({
      chainId: CHAIN_ID,
      address: entry.address,
      abi: accessControlAbi,
      functionName: 'hasRole' as const,
      args: [entry.role, account as Address] as const,
    })),
    query: { ...listQuery, enabled: !sandbox && DEPLOYMENT_READY && Boolean(account) },
  });

  const items = useMemo<boolean[]>(() => {
    if (sandbox) return entries.map(() => sim.selectHasAdminRole(sandbox));
    return (query.data ?? []).map((entry) => entry.status === 'success' && entry.result === true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sandbox, query.data, key]);

  return { ...query, items, isLoading: sandbox ? false : query.isLoading };
}
