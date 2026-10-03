import type { Address, Hex } from 'viem';
import { CHAIN_ID } from './config';

const key = 'palissage.pending.' + CHAIN_ID;
type Pending = { hash: Hex; sender: Address };
let pending: Pending | null = (() => {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? 'null');
    return /^0x[0-9a-f]{64}$/i.test(value?.hash) && /^0x[0-9a-f]{40}$/i.test(value?.sender) ? value : null;
  } catch { return null; }
})();
const listeners = new Set<() => void>();
let requesting = false;
export function beginTransactionRequest() {
  if (requesting) return false;
  requesting = true;
  return true;
}
export function finishTransactionRequest() { requesting = false; }
export const pendingTransaction = () => pending;
export function savePendingTransaction(value: Pending | null) {
  pending = value;
  try { if (value) localStorage.setItem(key, JSON.stringify(value)); else localStorage.removeItem(key); } catch { /* Keep the in-memory duplicate guard. */ }
  listeners.forEach((listener) => listener());
}
export const subscribePending = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

if (typeof window !== 'undefined') window.addEventListener('storage', (event) => {
  if (event.key !== key) return;
  try {
    const value = JSON.parse(event.newValue ?? 'null');
    pending = /^0x[0-9a-f]{64}$/i.test(value?.hash) && /^0x[0-9a-f]{40}$/i.test(value?.sender) ? value : null;
    listeners.forEach((listener) => listener());
  } catch { /* Ignore a malformed external value. */ }
});
