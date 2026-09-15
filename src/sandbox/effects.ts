import type { Address } from 'viem';
import { gatewayRoleKey } from '@/chain/roles';
import { dispatchSandbox, sandboxState, scheduleSandbox, type SandboxAction } from './store';

/**
 * Every write the screens make, as a change to the invented world.
 *
 * The table is keyed by the contract function name only. That is deliberate: it
 * is the same key the screens already pass to `writeContract`, so a new action
 * is one row here and nothing else.
 *
 * An unmapped write still confirms. A screen left hanging on a transaction
 * nobody modelled yet would be a worse failure than a state change that did not
 * happen — and the warning says which one to add.
 */

type Args = readonly unknown[];

interface CreateLotInput {
  totalBottles: number;
  vintage: number;
  royaltyBps: number;
  bottleSizeMl: number;
  name: string;
  region: string;
}

const num = (v: unknown): number => Number(v ?? 0);
const big = (v: unknown): bigint => (typeof v === 'bigint' ? v : BigInt(num(v)));

const EFFECTS: Record<string, (args: Args) => SandboxAction | null> = {
  assumeRole: (args) => {
    const role = gatewayRoleKey(num(args[0]));
    return role ? { type: 'role.take', role } : null;
  },
  assignRole: (args) => {
    const role = gatewayRoleKey(num(args[1]));
    return role ? { type: 'role.take', role } : null;
  },

  createLot: (args) => {
    const input = args[0] as CreateLotInput | undefined;
    if (!input) return null;
    return {
      type: 'lot.create',
      name: input.name || 'Untitled lot',
      region: input.region || 'Cabardès',
      vintage: num(input.vintage),
      totalBottles: num(input.totalBottles),
      bottleSizeMl: num(input.bottleSizeMl) || 750,
      royaltyBps: num(input.royaltyBps),
    };
  },
  verifyLot: (args) => ({ type: 'lot.verify', id: big(args[0]) }),
  unsuspendLot: (args) => ({ type: 'lot.verify', id: big(args[0]) }),
  closeLot: (args) => ({ type: 'lot.close', id: big(args[0]) }),
  setProductionStatus: (args) => ({
    type: 'lot.advance',
    id: big(args[0]),
    production: num(args[1]),
  }),

  createOffer: (args) => ({
    type: 'offer.publish',
    lotId: big(args[0]),
    pricePerBottle: big(args[2]),
    quantity: num(args[3]),
    endTime: big(args[5]),
    depositBps: num(args[6]),
    kind: num(args[8]),
  }),
  cancelOffer: (args) => ({ type: 'offer.cancel', id: big(args[0]) }),

  approve: (args) => ({
    type: 'payment.approve',
    spender: args[0] as Address,
    amount: big(args[1]),
  }),
  setApprovalForAll: (args) => ({
    type: 'bottles.approve',
    operator: args[0] as Address,
    approved: Boolean(args[1]),
  }),
  reserve: (args) => ({
    type: 'allocation.reserve',
    offerId: big(args[0]),
    quantity: num(args[1]),
  }),
  payRemainder: (args) => ({ type: 'allocation.settle', id: big(args[0]) }),
  confirmMilestone: (args) => ({
    type: 'milestone.confirm',
    offerId: big(args[0]),
    index: num(args[1]),
  }),

  requestRedemption: (args) => ({
    type: 'redemption.request',
    lotId: big(args[0]),
    quantity: num(args[1]),
  }),
  markShipped: (args) => ({ type: 'redemption.ship', id: big(args[0]) }),
};

/** How long the simulated operator takes to look at a new lot. */
const OPERATOR_REVIEW_MS = 4200;

export function applySandboxWrite(functionName: string, args: Args = []): void {
  const build = EFFECTS[functionName];
  if (!build) {
    if (import.meta.env.DEV) {
      console.warn(
        `[sandbox] "${functionName}" is not modelled yet: the transaction confirms but nothing changed. Add a row to src/sandbox/effects.ts.`,
      );
    }
    return;
  }

  // The id the reducer is about to assign, read before it is consumed.
  const pendingLotId = functionName === 'createLot' ? sandboxState()?.nextId.lot : undefined;

  const action = build(args);
  if (action) dispatchSandbox(action);

  /**
   * The operator reviews the lot a few seconds later.
   *
   * This is the one scripted reaction that carries a lesson rather than
   * convenience: a winery cannot verify its own wine, and a lot that simply
   * appeared verified would teach the opposite.
   */
  if (pendingLotId !== undefined) {
    scheduleSandbox({ type: 'lot.verify', id: pendingLotId }, OPERATOR_REVIEW_MS);
  }
}
