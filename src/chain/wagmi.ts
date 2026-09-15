import { http, fallback, createConfig } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { injected, mock } from 'wagmi/connectors';
import { DEMO_WALLET } from '@/sandbox/seed';
import { RPC_URLS, WALLETCONNECT_PROJECT_ID } from './config';

/**
 * One chain, one settlement asset, no chain picker.
 *
 * Only the injected connector is configured statically. WalletConnect pulls in
 * roughly 200 KB of connector code, and the public site's job is comprehension,
 * not connection — so it is imported on demand by `connectWalletConnect()` and
 * never appears in the initial bundle (doc 06 §4).
 */
export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  /**
   * The demo connector is appended last on purpose: `connectors[0]` is what the
   * connect button uses, and that must stay the injected wallet. Nothing
   * reaches the mock unless a simulation explicitly connects it.
   *
   * It is built here rather than imported from `sandbox/connector.ts`, which
   * needs `wagmiConfig` itself — importing it back would be a module cycle, and
   * the config would be read before it was initialised.
   */
  connectors: [
    injected({ shimDisconnect: true }),
    /**
     * Never auto-reconnected. `SandboxWalletBridge` connects it while a
     * simulation is running and disconnects it when one is not, so the only
     * thing that can produce a demo wallet is a running simulation.
     */
    mock({ accounts: [DEMO_WALLET], features: { reconnect: false } }),
  ],

  /**
   * Every screen read collapses into one `multicall3` call per tick.
   *
   * Measured against the public endpoints: single requests always answer, but a
   * burst of a dozen batched ones gets rate-limited, and `sepolia.base.org`
   * failed 8 of 12 under exactly the load one catalogue page produces. That is
   * why lots sometimes did not appear. Multicall turns those reads into one
   * request, which is both faster and well under any burst limit.
   */
  batch: {
    multicall: {
      batchSize: 1024 * 8,
      wait: 24,
    },
  },

  transports: {
    // Ordered by measured reliability, not by whose name is on the chain.
    // publicnode answered 12 of 12; base.org 4 of 12; tenderly returned 429.
    [baseSepolia.id]: fallback(
      RPC_URLS.map((url) => http(url, { batch: { wait: 24 }, retryCount: 3, timeout: 12_000 })),
      { rank: false, retryCount: 2 },
    ),
  },
  ssr: false,
});

export const hasWalletConnect = WALLETCONNECT_PROJECT_ID !== '';

/** Loads the WalletConnect connector the first time someone asks for the QR. */
export async function walletConnectConnector() {
  const { walletConnect } = await import('wagmi/connectors');
  return walletConnect({
    projectId: WALLETCONNECT_PROJECT_ID,
    showQrModal: true,
    metadata: {
      name: 'Palissage',
      description: 'Direct wine trade, verified on Base.',
      url: 'https://palissage.net',
      icons: ['https://palissage.net/img/brand/mark-on-light.png'],
    },
  });
}

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}
