import { connect, disconnect, getAccount } from 'wagmi/actions';
import { wagmiConfig } from '@/chain/wagmi';

/**
 * Wallet identity in simulation.
 *
 * Twenty-seven files call `useAccount()`. Rather than edit any of them, the
 * simulation connects a wagmi **mock connector** holding a fixed demo address —
 * every one of those call sites then reports a connected wallet on the right
 * chain and needs no change at all.
 *
 * The connector itself is declared in `wagmi.ts` — it has to be, because the
 * config is built there and this module reads the config back. It is appended
 * last, so `connectors[0]` is still the injected one the connect button uses,
 * and it is never auto-reconnected: the only way in is starting a simulation.
 */
export async function connectDemoWallet(): Promise<void> {
  const account = getAccount(wagmiConfig);
  if (account.connector?.id === 'mock') return;
  const connector = wagmiConfig.connectors.find((c) => c.id === 'mock');
  if (!connector) return;
  try {
    await connect(wagmiConfig, { connector });
  } catch (cause) {
    // The simulation still reads from the store if the mock never connects,
    // but every screen that needs an address then shows its disconnected
    // state — which looks like a broken tour. Say so in development.
    if (import.meta.env.DEV) console.error('[sandbox] demo wallet did not connect', cause);
  }
}

export async function disconnectDemoWallet(): Promise<void> {
  const account = getAccount(wagmiConfig);
  if (account.connector?.id !== 'mock') return;
  try {
    await disconnect(wagmiConfig, { connector: account.connector });
  } catch {
    /* ignore */
  }
}

export function isDemoWalletConnected(): boolean {
  return getAccount(wagmiConfig).connector?.id === 'mock';
}
