import { keccak256, toHex } from 'viem';
import { ZERO_HASH } from './format';

/**
 * What a buyer tells the producer when asking for physical delivery, and how
 * that becomes the one 32-byte value the chain keeps.
 *
 * `RedemptionManager.requestRedemption` stores a `deliveryDataHash` and nothing
 * else. It is an anchor, not an address book: the contract never reads it, and
 * publishing a shipping address on a public chain would be the wrong thing to
 * do even if it did. So the details stay with the buyer and the producer, and
 * the hash is what proves later that neither side changed them.
 *
 * This interface runs no backend, so it cannot deliver the details for the
 * buyer. What it can do is make the hash reproducible: serialise in a fixed key
 * order, trim every value, and collapse internal whitespace, so that the same
 * details typed on another day produce the same hash.
 */
export interface DeliveryDetails {
  recipient: string;
  address: string;
  contact: string;
  notes: string;
}

export const EMPTY_DELIVERY: DeliveryDetails = {
  recipient: '',
  address: '',
  contact: '',
  notes: '',
};

const FIELDS: readonly (keyof DeliveryDetails)[] = ['recipient', 'address', 'contact', 'notes'];

function normalise(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function isDeliveryEmpty(details: DeliveryDetails): boolean {
  return FIELDS.every((field) => normalise(details[field]) === '');
}

/**
 * The exact bytes that are hashed. Also what the buyer copies and sends on, so
 * the producer can recompute the hash and check it against the chain.
 */
export function canonicalDelivery(details: DeliveryDetails): string {
  const canonical: Record<string, string> = {};
  for (const field of FIELDS) canonical[field] = normalise(details[field]);
  return JSON.stringify(canonical);
}

/** Zero when nothing was entered — an empty object still has a hash, and
 *  anchoring "nothing" to a real-looking value would be a lie. */
export function deliveryHash(details: DeliveryDetails): `0x${string}` {
  if (isDeliveryEmpty(details)) return ZERO_HASH;
  return keccak256(toHex(canonicalDelivery(details)));
}
