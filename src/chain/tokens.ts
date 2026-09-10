import type { Address } from 'viem';
import { PAYMENT_TOKEN } from './config';
import type { ProtocolView } from './types';

/**
 * How to read an amount that belongs to a record rather than to the deployment.
 *
 * Offers, allocations and listings each store their own `paymentToken`. The
 * deployment has been through one settlement-asset change, so historical
 * records are denominated in an 18-decimal token while current ones are in
 * 6-decimal EURC. Formatting every amount with the *current* decimals turned
 * €7 440.00 of legacy escrow into €7 440 000 000 000 000.00 on screen.
 *
 * The legacy entry exists only so those records read correctly. It is never
 * offered as a way to pay: both markets removed it from their allowlists.
 */
const LEGACY = {
  '0xfdfe0aec7689a31c07c1f9ddded9040c01ef2e12': { symbol: 'tEURe', decimals: 18 },
} as const;

export interface TokenMeta {
  symbol: string;
  decimals: number;
  /** True when this is the asset the markets currently accept. */
  settlement: boolean;
  /** True when the amount can be shown, false when the token is unknown. */
  known: boolean;
}

export function tokenMeta(token: Address | undefined, protocol?: ProtocolView): TokenMeta {
  const key = token?.toLowerCase();

  if (key && key === PAYMENT_TOKEN.address.toLowerCase()) {
    return {
      symbol: protocol?.paymentSymbol ?? PAYMENT_TOKEN.symbol,
      decimals: protocol?.paymentDecimals ?? PAYMENT_TOKEN.decimals,
      settlement: true,
      known: true,
    };
  }

  const legacy = key ? LEGACY[key as keyof typeof LEGACY] : undefined;
  if (legacy) return { ...legacy, settlement: false, known: true };

  return { symbol: 'an unknown token', decimals: 0, settlement: false, known: false };
}
