/**
 * The sandbox emits one event per state change. A tour step can wait on an
 * event rather than on a click, which is what lets the coach mark say "press
 * this" and then advance because the thing actually happened — not because a
 * button was pressed and might have failed.
 *
 * The names mirror the domain, not the contract call: a step waits for a lot to
 * exist, and does not care that it took `createLot` to get there.
 */
export type SandboxEventName =
  | 'role.taken'
  | 'lot.created'
  | 'lot.verified'
  | 'offer.published'
  | 'allocation.reserved'
  | 'allocation.settled'
  | 'milestone.confirmed'
  | 'redemption.requested'
  | 'redemption.shipped'
  | 'listing.created'
  | 'sandbox.reset';

export interface SandboxEvent {
  name: SandboxEventName;
  /** The id of the record the change produced, where there is one. */
  id?: bigint;
}

type Listener = (event: SandboxEvent) => void;

const listeners = new Set<Listener>();

export function onSandboxEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitSandboxEvent(name: SandboxEventName, id?: bigint): void {
  for (const listener of [...listeners]) listener({ name, id });
}
