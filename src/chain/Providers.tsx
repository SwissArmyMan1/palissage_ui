import { Outlet } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from './wagmi';
import { ChainGuard } from './ChainGuard';
import { SandboxWalletBridge } from '@/sandbox/WalletBridge';

/**
 * A layout route that mounts everything chain-related.
 *
 * It is loaded lazily, so the pages that read nothing from Base — the landing
 * page, the audience pages, how-it-works, the pilot page and the legal pages —
 * never download wagmi, viem or the read model at all. That is what keeps
 * PUB-01 inside its 90 KB budget on a phone (doc 06 §4).
 *
 * The config and the query client are module-level, so remounting this layout
 * while navigating costs nothing and loses no connection state.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 8_000,
    },
  },
});

export default function ChainProviders() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ChainGuard />
        <SandboxWalletBridge />
        <Outlet />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
