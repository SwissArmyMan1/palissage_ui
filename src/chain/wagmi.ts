import { http, fallback, createConfig } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import { injected, mock } from 'wagmi/connectors';
import { DEMO_WALLET } from '@/sandbox/seed';
import { CHAIN_ID, RPC_URLS, WALLETCONNECT_PROJECT_ID } from './config';
import { NETWORKS, robinhoodTestnet } from './networks';

function transport(id: 421614 | 46630) {
  const urls = id === CHAIN_ID ? RPC_URLS : NETWORKS[id].rpcs;
  return fallback(urls.map((url) => http(url, { batch: { wait: 24 }, retryCount: 2, timeout: 12_000 })), { rank: false, retryCount: 1 });
}

export const wagmiConfig = createConfig({
  chains: [arbitrumSepolia, robinhoodTestnet],
  connectors: [
    injected({ shimDisconnect: true }),
    mock({ accounts: [DEMO_WALLET], features: { reconnect: false } }),
  ],
  batch: { multicall: { batchSize: 8192, wait: 24 } },
  transports: { [arbitrumSepolia.id]: transport(421614), [robinhoodTestnet.id]: transport(46630) },
  ssr: false,
});

export const hasWalletConnect = WALLETCONNECT_PROJECT_ID !== '';

/** Mobile QR connection is loaded only when requested. */
export async function walletConnectConnector() {
  const { walletConnect } = await import('wagmi/connectors');
  return walletConnect({
    projectId: WALLETCONNECT_PROJECT_ID,
    showQrModal: true,
    metadata: {
      name: 'Palissage',
      description: 'Direct wine trade on Arbitrum and Robinhood Chain.',
      url: 'https://palissage.net',
      icons: ['https://palissage.net/img/brand/mark-on-light.png'],
    },
  });
}

declare module 'wagmi' { interface Register { config: typeof wagmiConfig; } }
