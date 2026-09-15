import type { Address } from 'viem';
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
} from '@/chain/types';
import type { SandboxState } from './store';

/**
 * Selectors that return exactly what `PalissageLens` returns.
 *
 * That is the whole trick: the simulation answers in the contract's own shape,
 * so every hook in `chain/lens.ts` keeps its existing post-processing and no
 * screen changes at all. A selector that returned a convenient shape instead
 * would have meant editing every caller.
 */

type Page<T> = readonly [readonly T[], bigint];

const same = (a: Address | string | undefined, b: Address | string | undefined) =>
  Boolean(a && b && String(a).toLowerCase() === String(b).toLowerCase());

/** The Lens pages by id, cursor-in / next-cursor-out. Cursor 0 means "from the start". */
function page<T extends { id: bigint }>(rows: readonly T[], cursor: bigint, limit: bigint): Page<T> {
  const from = cursor > 0n ? cursor : 0n;
  const ordered = [...rows].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const eligible = ordered.filter((row) => row.id >= from);
  const slice = eligible.slice(0, Number(limit));
  const exhausted = slice.length === eligible.length;
  const last = slice[slice.length - 1];
  return [slice, exhausted || !last ? 0n : last.id + 1n];
}

export function selectProtocol(s: SandboxState): ProtocolView {
  return s.protocol;
}

export function selectParticipant(s: SandboxState, wallet?: Address): ParticipantView | undefined {
  if (!wallet) return undefined;
  return (
    s.participants[String(wallet).toLowerCase()] ?? {
      ...s.participants[Object.keys(s.participants)[0]],
      wallet,
      registered: false,
      isVerified: false,
      kyc: false,
      kyb: false,
      wineryClaim: false,
      b2bClaim: false,
      gatewayRole: 0,
    }
  );
}

export function selectLots(s: SandboxState, cursor: bigint, limit: bigint): Page<LotView> {
  return page(s.lots, cursor, limit);
}

export function selectLot(s: SandboxState, id?: bigint): readonly [boolean, LotView] | undefined {
  if (id === undefined) return undefined;
  const found = s.lots.find((l) => l.id === id);
  return found ? [true, found] : [false, s.lots[0]];
}

export function selectLotsOfWinery(
  s: SandboxState,
  winery: Address | undefined,
  cursor: bigint,
  limit: bigint,
): Page<LotView> {
  return page(s.lots.filter((l) => same(l.winery, winery)), cursor, limit);
}

export function selectOffers(s: SandboxState, cursor: bigint, limit: bigint): Page<OfferView> {
  return page(s.offers, cursor, limit);
}

export function selectOffersOfLot(
  s: SandboxState,
  lotId: bigint | undefined,
  cursor: bigint,
  limit: bigint,
): Page<OfferView> {
  return page(s.offers.filter((o) => o.lotId === lotId), cursor, limit);
}

export function selectOffersOfWinery(
  s: SandboxState,
  winery: Address | undefined,
  cursor: bigint,
  limit: bigint,
): Page<OfferView> {
  return page(s.offers.filter((o) => same(o.winery, winery)), cursor, limit);
}

export function selectOffer(s: SandboxState, id?: bigint): OfferView | undefined {
  return id === undefined ? undefined : s.offers.find((o) => o.id === id);
}

export function selectAllocation(s: SandboxState, id?: bigint): AllocationView | undefined {
  return id === undefined ? undefined : s.allocations.find((a) => a.id === id);
}

export function selectAllocationsOfBuyer(
  s: SandboxState,
  buyer: Address | undefined,
  cursor: bigint,
  limit: bigint,
): Page<AllocationView> {
  return page(s.allocations.filter((a) => same(a.buyer, buyer)), cursor, limit);
}

export function selectAllocationsOfOffer(
  s: SandboxState,
  offerId: bigint | undefined,
  cursor: bigint,
  limit: bigint,
): Page<AllocationView> {
  return page(s.allocations.filter((a) => a.offerId === offerId), cursor, limit);
}

export function selectActiveListings(
  s: SandboxState,
  cursor: bigint,
  limit: bigint,
): Page<ListingView> {
  return page(s.listings.filter((l) => l.active), cursor, limit);
}

export function selectListingsOfSeller(
  s: SandboxState,
  seller: Address | undefined,
  cursor: bigint,
  limit: bigint,
): Page<ListingView> {
  return page(s.listings.filter((l) => same(l.seller, seller)), cursor, limit);
}

export function selectListing(s: SandboxState, id?: bigint): ListingView | undefined {
  return id === undefined ? undefined : s.listings.find((l) => l.id === id);
}

export function selectRedemption(s: SandboxState, id?: bigint): RedemptionView | undefined {
  return id === undefined ? undefined : s.redemptions.find((r) => r.id === id);
}

export function selectRedemptions(
  s: SandboxState,
  cursor: bigint,
  limit: bigint,
): Page<RedemptionView> {
  return page(s.redemptions, cursor, limit);
}

export function selectRedemptionsOfBuyer(
  s: SandboxState,
  buyer: Address | undefined,
  cursor: bigint,
  limit: bigint,
): Page<RedemptionView> {
  return page(s.redemptions.filter((r) => same(r.buyer, buyer)), cursor, limit);
}

export function selectRedemptionsOfWinery(
  s: SandboxState,
  winery: Address | undefined,
  cursor: bigint,
  limit: bigint,
): Page<RedemptionView> {
  return page(s.redemptions.filter((r) => same(r.winery, winery)), cursor, limit);
}

export function selectPositions(
  s: SandboxState,
  account: Address | undefined,
  lotIds: readonly bigint[],
): readonly PositionView[] {
  if (!account) return [];
  return lotIds.map(
    (lotId) =>
      s.positions[`${String(account).toLowerCase()}:${lotId}`] ?? {
        lotId,
        balance: 0n,
        frozen: 0n,
        transferable: 0n,
      },
  );
}

export function selectSettlement(s: SandboxState, offerId?: bigint): SettlementView | undefined {
  return offerId === undefined ? undefined : s.settlements[String(offerId)];
}

export function selectPaymentBalance(s: SandboxState, owner?: Address): bigint | undefined {
  return owner ? (s.paymentBalance[String(owner).toLowerCase()] ?? 0n) : undefined;
}

export function selectAllowance(
  s: SandboxState,
  owner?: Address,
  spender?: Address,
): bigint | undefined {
  if (!owner || !spender) return undefined;
  return s.allowance[`${String(owner).toLowerCase()}:${String(spender).toLowerCase()}`] ?? 0n;
}

export function selectGasBalance(s: SandboxState, owner?: Address): bigint {
  return owner ? (s.gasBalance[String(owner).toLowerCase()] ?? 0n) : 0n;
}

export function selectApprovedForAll(
  s: SandboxState,
  owner?: Address,
  operator?: Address,
): boolean | undefined {
  if (!owner || !operator) return undefined;
  return s.approvals[`${String(owner).toLowerCase()}:${String(operator).toLowerCase()}`] ?? false;
}

/** The market locks a milestone plan once money has settled against the offer. */
export function selectMilestonesLocked(s: SandboxState, offerId?: bigint): boolean | undefined {
  if (offerId === undefined) return undefined;
  return (s.settlements[String(offerId)]?.settledFunds ?? 0n) > 0n;
}

/** In simulation the reader holds exactly the roles their chosen cabinet has. */
export function selectHasAdminRole(s: SandboxState): boolean {
  return s.role === 'admin';
}
