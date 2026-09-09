import { http, fallback, createConfig } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
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
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [baseSepolia.id]: fallback(
      RPC_URLS.map((url) => http(url, { batch: true, retryCount: 2 })),
      { rank: false },
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
