import { useSyncExternalStore } from 'react';
import type { Address } from 'viem';
import type { RoleKey } from '@/chain/roles';
import { PAYMENT_TOKEN, ZERO_ADDRESS } from '@/chain/config';
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
import { emitSandboxEvent, type SandboxEventName } from './events';
import {
  DEMO_OPERATOR,
  DEMO_SHOP,
  DEMO_WALLET,
  SEED_GAS_BALANCE,
  SEED_PAYMENT_BALANCE,
  demoParticipant,
  operatorParticipant,
  seedAllocations,
  seedLots,
  seedOffers,
  seedProtocol,
  seedRedemptions,
} from './seed';

/**
 * The simulated world.
 *
 * It is a plain reducer with a subscription, deliberately outside React: every
 * read hook in `chain/lens.ts` subscribes to it, and a context would put a
 * provider between the store and 25 hooks for no gain. `active: false` is the
 * default, so the store is always mounted and the hook count never changes —
 * that is what lets `chain/lens.ts` branch without breaking the rules of hooks.
 */

export interface SandboxState {
  role: RoleKey;
  protocol: ProtocolView;
  participants: Record<string, ParticipantView>;
  lots: LotView[];
  offers: OfferView[];
  allocations: AllocationView[];
  listings: ListingView[];
  redemptions: RedemptionView[];
  settlements: Record<string, SettlementView>;
  positions: Record<string, PositionView>;
  paymentBalance: Record<string, bigint>;
  gasBalance: Record<string, bigint>;
  allowance: Record<string, bigint>;
  /** `${owner}:${operator}` for WineLotToken.setApprovalForAll. */
  approvals: Record<string, boolean>;
  nextId: { lot: bigint; offer: bigint; allocation: bigint; listing: bigint; redemption: bigint };
}

export type SandboxAction =
  | { type: 'role.take'; role: RoleKey }
  | {
      type: 'lot.create';
      name: string;
      region: string;
      vintage: number;
      totalBottles: number;
      bottleSizeMl: number;
      royaltyBps: number;
    }
  | { type: 'lot.verify'; id: bigint }
  | { type: 'lot.advance'; id: bigint; production: number }
  | { type: 'lot.close'; id: bigint }
  | {
      type: 'offer.publish';
      lotId: bigint;
      pricePerBottle: bigint;
      quantity: number;
      depositBps: number;
      kind: number;
      endTime: bigint;
    }
  | { type: 'offer.cancel'; id: bigint }
  | { type: 'allocation.reserve'; offerId: bigint; quantity: number }
  | { type: 'allocation.settle'; id: bigint }
  | { type: 'milestone.confirm'; offerId: bigint; index: number }
  | { type: 'redemption.request'; lotId: bigint; quantity: number }
  | { type: 'redemption.ship'; id: bigint }
  | { type: 'payment.approve'; spender: Address; amount: bigint }
  | { type: 'bottles.approve'; operator: Address; approved: boolean }
  | { type: 'reset' };

const KEY = 'palissage.sandbox.v2';
const key = (a: Address | string) => String(a).toLowerCase();
const posKey = (a: Address | string, lotId: bigint) => `${key(a)}:${lotId}`;

/* ------------------------------------------------------------------ seeding */

export function seedState(role: RoleKey): SandboxState {
  const lots = seedLots(role === 'winery' ? DEMO_WALLET : DEMO_OPERATOR);
  const offers = seedOffers(role === 'winery' ? DEMO_WALLET : DEMO_OPERATOR);
  const holder = role === 'collector' || role === 'shop' ? DEMO_WALLET : DEMO_SHOP;
  const allocations = role === 'shop' || role === 'collector' ? seedAllocations(DEMO_WALLET) : [];

  const positions: Record<string, PositionView> = {};
  if (role === 'collector' || role === 'shop') {
    for (const [lotId, balance] of [
      [3n, 60n],
      [5n, 12n],
    ] as const) {
      positions[posKey(holder, lotId)] = { lotId, balance, frozen: 0n, transferable: balance };
    }
  }

  return {
    role,
    protocol: seedProtocol(),
    participants: {
      [key(DEMO_WALLET)]: demoParticipant(role),
      [key(DEMO_OPERATOR)]: operatorParticipant(),
    },
    lots,
    offers,
    allocations,
    listings: [],
    redemptions: seedRedemptions(),
    settlements: Object.fromEntries(offers.map((o) => [String(o.id), settlementFor(o)])),
    positions,
    paymentBalance: { [key(DEMO_WALLET)]: SEED_PAYMENT_BALANCE },
    gasBalance: { [key(DEMO_WALLET)]: SEED_GAS_BALANCE },
    allowance: {},
    approvals: {},
    nextId: { lot: 7n, offer: 4n, allocation: 2n, listing: 1n, redemption: 1n },
  };
}

function settlementFor(offer: OfferView): SettlementView {
  const enPrimeur = offer.kind === 1;
  return {
    offerId: offer.id,
    winery: offer.winery,
    paymentToken: offer.paymentToken,
    settledFunds: 0n,
    withdrawnGross: 0n,
    releasedBps: enPrimeur ? 3000n : 10000n,
    withdrawable: 0n,
    primaryFeeBps: 150,
    milestones: enPrimeur
      ? [
          { bps: 3000, released: true, description: 'Deposit, released on reservation' },
          { bps: 4000, released: false, description: 'Bottling confirmed by an operator' },
          { bps: 3000, released: false, description: 'Delivery confirmed' },
        ]
      : [{ bps: 10000, released: true, description: 'Released in full on settlement' }],
  };
}

/* ----------------------------------------------------------------- reducer */

export function reduceSandbox(
  state: SandboxState,
  action: SandboxAction,
): { state: SandboxState; event?: { name: SandboxEventName; id?: bigint } } {
  switch (action.type) {
    case 'role.take': {
      const participant = demoParticipant(action.role);
      return {
        state: {
          ...state,
          role: action.role,
          participants: { ...state.participants, [key(DEMO_WALLET)]: participant },
        },
        event: { name: 'role.taken' },
      };
    }

    case 'lot.create': {
      const id = state.nextId.lot;
      const created: LotView = {
        id,
        winery: DEMO_WALLET,
        status: 0,
        production: 0,
        totalBottles: action.totalBottles,
        mintedBottles: 0,
        redeemedBottles: 0,
        vintage: action.vintage,
        royaltyBps: action.royaltyBps,
        bottleSizeMl: action.bottleSizeMl,
        exportAllowed: true,
        verifier: ZERO_ADDRESS,
        docsHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
        name: action.name,
        region: action.region,
        grapes: '',
        metadataURI: '',
        offeredBottles: 0n,
        circulating: 0n,
      };
      return {
        state: {
          ...state,
          lots: [created, ...state.lots],
          protocol: { ...state.protocol, lotCount: state.protocol.lotCount + 1n },
          nextId: { ...state.nextId, lot: id + 1n },
        },
        event: { name: 'lot.created', id },
      };
    }

    case 'lot.verify':
      return {
        state: {
          ...state,
          lots: state.lots.map((l) =>
            l.id === action.id ? { ...l, status: 1, verifier: DEMO_OPERATOR } : l,
          ),
        },
        event: { name: 'lot.verified', id: action.id },
      };

    case 'lot.advance':
      return {
        state: {
          ...state,
          lots: state.lots.map((l) =>
            l.id === action.id ? { ...l, production: action.production } : l,
          ),
        },
      };

    case 'lot.close':
      return {
        state: {
          ...state,
          lots: state.lots.map((l) => (l.id === action.id ? { ...l, status: 3 } : l)),
        },
      };

    case 'offer.publish': {
      const id = state.nextId.offer;
      const offer: OfferView = {
        id,
        lotId: action.lotId,
        winery: DEMO_WALLET,
        paymentToken: PAYMENT_TOKEN.address,
        pricePerBottle: action.pricePerBottle,
        quantity: action.quantity,
        reserved: 0,
        available: action.quantity,
        startTime: BigInt(Math.floor(Date.now() / 1000)),
        endTime: action.endTime,
        depositBps: action.depositBps,
        fullPaymentDeadline: action.depositBps > 0 ? action.endTime + 86400n * 60n : 0n,
        kind: action.kind,
        active: true,
        phase: 1,
      };
      return {
        state: {
          ...state,
          offers: [offer, ...state.offers],
          settlements: { ...state.settlements, [String(id)]: settlementFor(offer) },
          lots: state.lots.map((l) =>
            l.id === action.lotId
              ? { ...l, offeredBottles: l.offeredBottles + BigInt(action.quantity) }
              : l,
          ),
          protocol: { ...state.protocol, offerCount: state.protocol.offerCount + 1n },
          nextId: { ...state.nextId, offer: id + 1n },
        },
        event: { name: 'offer.published', id },
      };
    }

    case 'offer.cancel':
      return {
        state: {
          ...state,
          offers: state.offers.map((o) =>
            o.id === action.id ? { ...o, active: false, phase: 4 } : o,
          ),
        },
      };

    case 'allocation.reserve': {
      const offer = state.offers.find((o) => o.id === action.offerId);
      if (!offer) return { state };
      const id = state.nextId.allocation;
      const quantity = Math.min(action.quantity, offer.available);
      const totalDue = offer.pricePerBottle * BigInt(quantity);
      const deposit =
        offer.depositBps > 0 ? (totalDue * BigInt(offer.depositBps)) / 10000n : totalDue;
      const allocation: AllocationView = {
        id,
        offerId: offer.id,
        lotId: offer.lotId,
        buyer: DEMO_WALLET,
        paymentToken: offer.paymentToken,
        quantity,
        pricePerBottle: offer.pricePerBottle,
        totalDue,
        paidAmount: deposit,
        remaining: totalDue - deposit,
        createdAt: BigInt(Math.floor(Date.now() / 1000)),
        state: offer.depositBps > 0 ? 0 : 1,
        fullPaymentDeadline: offer.fullPaymentDeadline,
        overdue: false,
      };
      return {
        state: {
          ...state,
          allocations: [allocation, ...state.allocations],
          offers: state.offers.map((o) =>
            o.id === offer.id
              ? {
                  ...o,
                  reserved: o.reserved + quantity,
                  available: o.available - quantity,
                  phase: o.available - quantity <= 0 ? 2 : o.phase,
                }
              : o,
          ),
          paymentBalance: debit(state.paymentBalance, DEMO_WALLET, deposit),
          positions: creditPosition(state.positions, DEMO_WALLET, offer.lotId, BigInt(quantity)),
          lots: state.lots.map((l) =>
            l.id === offer.lotId
              ? {
                  ...l,
                  mintedBottles: l.mintedBottles + quantity,
                  circulating: l.circulating + BigInt(quantity),
                }
              : l,
          ),
          settlements: addSettled(state.settlements, offer.id, deposit),
          protocol: { ...state.protocol, allocationCount: state.protocol.allocationCount + 1n },
          nextId: { ...state.nextId, allocation: id + 1n },
        },
        event: { name: 'allocation.reserved', id },
      };
    }

    case 'allocation.settle': {
      const allocation = state.allocations.find((a) => a.id === action.id);
      if (!allocation || allocation.remaining === 0n) return { state };
      return {
        state: {
          ...state,
          allocations: state.allocations.map((a) =>
            a.id === action.id
              ? { ...a, paidAmount: a.totalDue, remaining: 0n, state: 1, overdue: false }
              : a,
          ),
          paymentBalance: debit(state.paymentBalance, DEMO_WALLET, allocation.remaining),
          settlements: addSettled(state.settlements, allocation.offerId, allocation.remaining),
        },
        event: { name: 'allocation.settled', id: action.id },
      };
    }

    case 'milestone.confirm': {
      const settlement = state.settlements[String(action.offerId)];
      if (!settlement) return { state };
      const milestones = settlement.milestones.map((m, i) =>
        i === action.index ? { ...m, released: true } : m,
      );
      const releasedBps = milestones.reduce(
        (sum, m) => (m.released ? sum + BigInt(m.bps) : sum),
        0n,
      );
      return {
        state: {
          ...state,
          settlements: {
            ...state.settlements,
            [String(action.offerId)]: withdrawableOf({ ...settlement, milestones, releasedBps }),
          },
        },
        event: { name: 'milestone.confirmed', id: action.offerId },
      };
    }

    case 'redemption.request': {
      const id = state.nextId.redemption;
      const lot = state.lots.find((l) => l.id === action.lotId);
      const redemption: RedemptionView = {
        id,
        buyer: DEMO_WALLET,
        lotId: action.lotId,
        quantity: action.quantity,
        deliveryDataHash:
          '0x7c1e4a9b35d6f80213ac5e4b9d7f0a6182c3e5d4b7a9f0c1e2d3a4b5c6d7e8f9',
        shipmentDocsHash:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
        requestedAt: BigInt(Math.floor(Date.now() / 1000)),
        state: 0,
        winery: lot?.winery ?? DEMO_OPERATOR,
        lotProduction: lot?.production ?? 0,
      };
      return {
        state: {
          ...state,
          redemptions: [redemption, ...state.redemptions],
          protocol: { ...state.protocol, redemptionCount: state.protocol.redemptionCount + 1n },
          nextId: { ...state.nextId, redemption: id + 1n },
        },
        event: { name: 'redemption.requested', id },
      };
    }

    case 'redemption.ship':
      return {
        state: {
          ...state,
          redemptions: state.redemptions.map((r) =>
            r.id === action.id ? { ...r, state: 1 } : r,
          ),
        },
        event: { name: 'redemption.shipped', id: action.id },
      };

    case 'payment.approve':
      return {
        state: {
          ...state,
          allowance: {
            ...state.allowance,
            [`${key(DEMO_WALLET)}:${key(action.spender)}`]: action.amount,
          },
        },
      };

    case 'bottles.approve':
      return {
        state: {
          ...state,
          approvals: {
            ...state.approvals,
            [`${key(DEMO_WALLET)}:${key(action.operator)}`]: action.approved,
          },
        },
      };

    case 'reset':
      return { state: seedState(state.role), event: { name: 'sandbox.reset' } };

    default:
      return { state };
  }
}

function debit(
  balances: Record<string, bigint>,
  account: Address,
  amount: bigint,
): Record<string, bigint> {
  const current = balances[key(account)] ?? 0n;
  return { ...balances, [key(account)]: current > amount ? current - amount : 0n };
}

function creditPosition(
  positions: Record<string, PositionView>,
  account: Address,
  lotId: bigint,
  quantity: bigint,
): Record<string, PositionView> {
  const id = posKey(account, lotId);
  const current = positions[id]?.balance ?? 0n;
  const balance = current + quantity;
  return { ...positions, [id]: { lotId, balance, frozen: 0n, transferable: balance } };
}

function addSettled(
  settlements: Record<string, SettlementView>,
  offerId: bigint,
  amount: bigint,
): Record<string, SettlementView> {
  const current = settlements[String(offerId)];
  if (!current) return settlements;
  return {
    ...settlements,
    [String(offerId)]: withdrawableOf({
      ...current,
      settledFunds: current.settledFunds + amount,
    }),
  };
}

function withdrawableOf(settlement: SettlementView): SettlementView {
  const gross = (settlement.settledFunds * settlement.releasedBps) / 10000n;
  const net = gross - (gross * BigInt(settlement.primaryFeeBps)) / 10000n;
  return { ...settlement, withdrawable: net > settlement.withdrawnGross ? net - settlement.withdrawnGross : 0n };
}

/* ------------------------------------------------------------- the store */

let state: SandboxState | null = null;
const listeners = new Set<() => void>();
const timers = new Set<number>();

function notify(): void {
  for (const listener of [...listeners]) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): SandboxState | null {
  return state;
}

/** Always null on the server and in a non-browser render. */
function getServerSnapshot(): SandboxState | null {
  return null;
}

export function useSandbox(): SandboxState | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function sandboxActive(): boolean {
  return state !== null;
}

export function sandboxState(): SandboxState | null {
  return state;
}

export function dispatchSandbox(action: SandboxAction): void {
  if (!state) return;
  const result = reduceSandbox(state, action);
  state = result.state;
  persist();
  notify();
  if (result.event) emitSandboxEvent(result.event.name, result.event.id);
}

/**
 * A world reaction: something another actor does in response. The operator
 * verifying a freshly created lot is the important one — it is what teaches
 * that a winery cannot verify its own wine.
 */
export function scheduleSandbox(action: SandboxAction, delayMs: number): void {
  const id = window.setTimeout(() => {
    timers.delete(id);
    dispatchSandbox(action);
  }, delayMs);
  timers.add(id);
}

export function startSimulation(role: RoleKey): void {
  clearTimers();
  state = restore(role) ?? seedState(role);
  persist();
  notify();
}

export function stopSimulation(): void {
  clearTimers();
  state = null;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  notify();
}

function clearTimers(): void {
  for (const id of timers) window.clearTimeout(id);
  timers.clear();
}

/* ------------------------------------------------ session persistence */

function replacer(_k: string, value: unknown): unknown {
  return typeof value === 'bigint' ? { $bigint: value.toString() } : value;
}

function reviver(_k: string, value: unknown): unknown {
  if (value && typeof value === 'object' && '$bigint' in (value as Record<string, unknown>)) {
    return BigInt((value as { $bigint: string }).$bigint);
  }
  return value;
}

function persist(): void {
  if (!state) return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(state, replacer));
  } catch {
    // Memory-only is fine: a reload loses the run, the tour still works.
  }
}

function restore(role: RoleKey): SandboxState | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw, reviver) as SandboxState;
    return parsed.role === role ? parsed : null;
  } catch {
    return null;
  }
}

/** Restores a simulation that a page reload interrupted, before first paint. */
export function rehydrateSimulation(): boolean {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return false;
    state = JSON.parse(raw, reviver) as SandboxState;
    return true;
  } catch {
    return false;
  }
}

export { DEMO_WALLET, DEMO_OPERATOR };
