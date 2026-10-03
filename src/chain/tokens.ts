import type { Address } from 'viem';
import { PAYMENT_TOKEN, NETWORK, TEST_EUR_ADDRESS, ZERO_ADDRESS } from './config';
import { formatAmount } from '@/lib/format';
import type { ProtocolView } from './types';

/** Records retain their own asset after the network or payment selection changes. */
export interface TokenMeta {
  symbol: string;
  decimals: number;
  settlement: boolean;
  known: boolean;
  currency?: 'EUR' | 'USD';
}
export function tokenMeta(token: Address | undefined, protocol?: ProtocolView): TokenMeta {
  const address = token?.toLowerCase();
  const settlement = Boolean(address && address === PAYMENT_TOKEN.address.toLowerCase());
  if (address && address !== ZERO_ADDRESS && address === TEST_EUR_ADDRESS.toLowerCase()) return {
    symbol: 'tEURe', decimals: 18, currency: 'EUR', settlement, known: true,
  };
  if (address === NETWORK.usdg.toLowerCase()) return {
    symbol: 'USDG', decimals: 6, currency: 'USD', settlement, known: true,
  };
  if (settlement && protocol?.paymentMetadataOk) return {
    symbol: protocol.paymentSymbol, decimals: protocol.paymentDecimals, settlement, known: true,
  };
  return { symbol: 'an unknown token', decimals: 0, settlement: false, known: false };
}
export function formatTokenAmount(value: bigint, meta: TokenMeta): string {
  if (!meta.known) return `${formatAmount(value, 0, 0)} raw units of ${meta.symbol}`;
  return `${meta.currency === 'USD' ? '$' : meta.currency === 'EUR' ? '€' : ''}${formatAmount(value, meta.decimals, 2)} ${meta.symbol}`;
}
export function sameAsset(a: Address | undefined, b: Address | undefined): boolean {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}
