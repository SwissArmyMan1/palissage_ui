import { PAYMENT_TOKEN } from './config';
import type { OfferView } from './types';

/**
 * Offer selection rules, in one place.
 *
 * Offers retain their payment asset. A buyer selects one settlement asset at
 * a time, so actions are shown only for offers in that asset.
 */
export function isPayable(offer: OfferView): boolean {
  return offer.paymentToken.toLowerCase() === PAYMENT_TOKEN.address.toLowerCase();
}

const PHASE_RANK: Record<number, number> = {
  1: 0, // Open
  0: 1, // Scheduled
  2: 2, // SoldOut
  3: 3, // Ended
  4: 4, // Cancelled
};

/** The offer a catalogue card should represent for a lot. */
export function primaryOffer(offers: readonly OfferView[], lotId: bigint): OfferView | undefined {
  return offers
    .filter((offer) => offer.lotId === lotId && isPayable(offer))
    .sort((a, b) => (PHASE_RANK[a.phase] ?? 9) - (PHASE_RANK[b.phase] ?? 9))[0];
}

/** Offers a buyer can act on right now. */
export function openOffers(offers: readonly OfferView[]): OfferView[] {
  return offers.filter((offer) => isPayable(offer) && offer.phase === 1);
}

/** Deposit due at reservation, in settlement-asset base units. */
export function depositDue(offer: OfferView, quantity: number): bigint {
  const total = offer.pricePerBottle * BigInt(quantity);
  if (offer.depositBps === 0) return total;
  return (total * BigInt(offer.depositBps) + 9_999n) / 10_000n;
}

export function offerTotal(offer: OfferView, quantity: number): bigint {
  return offer.pricePerBottle * BigInt(quantity);
}

/** Protocol fee, taken from the producer's proceeds, not added to the buyer. */
export function protocolFee(total: bigint, feeBps: number): bigint {
  return (total * BigInt(feeBps)) / 10_000n;
}
