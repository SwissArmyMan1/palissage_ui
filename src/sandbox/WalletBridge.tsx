import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { connectDemoWallet, disconnectDemoWallet } from './connector';
import { DEMO_WALLET } from './seed';
import { useSandbox } from './store';

/**
 * Keeps the simulated wallet connected for as long as the simulation runs.
 *
 * The chain providers are a **lazy layout route**: moving from a public page
 * into a cabinet unmounts one `WagmiProvider` and mounts another, and the
 * connection made before that does not survive it. Rather than depend on how
 * wagmi persists and reconnects a mock connector, this asserts the invariant
 * directly — sandbox active means the demo wallet is connected, sandbox off
 * means it is not — and re-asserts it every time the provider mounts.
 *
 * Mounted by `ChainProviders`, which is the only place that is guaranteed to be
 * inside the provider it is correcting.
 */
export function SandboxWalletBridge() {
  const sandbox = useSandbox();
  const { address, isConnected } = useAccount();

  useEffect(() => {
    const isDemo = address?.toLowerCase() === DEMO_WALLET.toLowerCase();
    if (sandbox && !isDemo) {
      void connectDemoWallet();
      return;
    }
    // A demo wallet with no simulation behind it would read the real chain
    // with no simulation bar to say the address is invented.
    if (!sandbox && isDemo && isConnected) void disconnectDemoWallet();
  }, [sandbox, address, isConnected]);

  return null;
}
