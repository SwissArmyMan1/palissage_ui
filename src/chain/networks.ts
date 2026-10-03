import { defineChain } from 'viem';
import { arbitrumSepolia } from 'viem/chains';

export const robinhoodTestnet = defineChain({
  id: 46630,
  name: 'Robinhood Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.chain.robinhood.com'] } },
  blockExplorers: { default: { name: 'Robinhood Explorer', url: 'https://explorer.testnet.chain.robinhood.com' } },
  testnet: true,
});

export const NETWORKS = {
  421614: {
    chain: arbitrumSepolia,
    label: 'Arbitrum Sepolia',
    explorer: 'https://sepolia.arbiscan.io',
    gasFaucet: 'https://arbitrum.faucet.dev',
    rpcs: ['https://sepolia-rollup.arbitrum.io/rpc', 'https://arbitrum-sepolia-rpc.publicnode.com'],
    usdg: '0xFFC95faa3d63Cde504a05B567C600B78C0b41892',
  },
  46630: {
    chain: robinhoodTestnet,
    label: 'Robinhood Testnet',
    explorer: 'https://explorer.testnet.chain.robinhood.com',
    gasFaucet: 'https://faucet.testnet.chain.robinhood.com',
    rpcs: ['https://rpc.testnet.chain.robinhood.com'],
    usdg: '0x7E955252E15c84f5768B83c41a71F9eba181802F',
  },
} as const;

export type SupportedChainId = keyof typeof NETWORKS;
export type SettlementAsset = 'eur' | 'usdg';

export function isSupportedChain(id: number): id is SupportedChainId {
  return Object.hasOwn(NETWORKS, id);
}
