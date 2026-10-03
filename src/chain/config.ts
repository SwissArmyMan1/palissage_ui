import type { Address, Chain } from 'viem';
import manifests from './deployments.json';
import { NETWORKS, isSupportedChain, type SettlementAsset } from './networks';

const env = import.meta.env as Record<string, string | undefined>;
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;

const CONTRACT_KEYS = [
  'trustedIssuersRegistry', 'identityRegistry', 'claimIssuer', 'roleGateway',
  'wineLotToken', 'primaryMarket', 'secondaryMarket', 'redemptionManager', 'palissageLens',
] as const;
export type ContractName = typeof CONTRACT_KEYS[number];
type Deployment = {
  deploymentId: string;
  chainId: number;
  status: string;
  contracts: Record<ContractName | 'testEURe', Address>;
  usdgEnabled: boolean;
  runtimeCodeHashes: Partial<Record<ContractName, `0x${string}`>>;
};

function preference(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
const requested = Number(params.get('chain') ?? preference('palissage.chain') ?? env.VITE_DEFAULT_CHAIN_ID ?? 421614);
export const CONFIG_ERROR = isSupportedChain(requested) ? null : 'This network is not supported by this release.';
export const CHAIN_ID = isSupportedChain(requested) ? requested : 421614;
export const NETWORK = NETWORKS[CHAIN_ID];
export const CHAIN: Chain = NETWORK.chain;
export const CHAIN_LABEL = NETWORK.label;
export const EXPLORER_URL = NETWORK.explorer;
export const GAS_FAUCET_URL = NETWORK.gasFaucet;
if (isSupportedChain(requested)) {
  try { localStorage.setItem('palissage.chain', String(requested)); } catch { /* URL selection still works. */ }
}
export const ASSET: SettlementAsset = (params.get('asset') ?? preference('palissage.asset')) === 'usdg' ? 'usdg' : 'eur';
try { localStorage.setItem('palissage.asset', ASSET); } catch { /* URL selection still works. */ }

const deployment = (manifests as Record<string, Deployment>)[String(CHAIN_ID)];
export const DEPLOYMENT_ID = deployment?.deploymentId ?? `palissage-${CHAIN_ID}-unpublished`;
export const DEPLOYMENT_READY = !CONFIG_ERROR && deployment?.chainId === CHAIN_ID && deployment.status === 'verified';
export const RUNTIME_CODE_HASHES = deployment?.runtimeCodeHashes ?? {};
export const CONTRACTS = Object.fromEntries(CONTRACT_KEYS.map((name) => [name, deployment?.contracts[name] ?? ZERO_ADDRESS])) as Record<ContractName, Address>;
export const TEST_EUR_ADDRESS = deployment?.contracts.testEURe ?? ZERO_ADDRESS;

const overrideRpc = CHAIN_ID === 421614 ? env.VITE_ARBITRUM_SEPOLIA_RPC_URL : env.VITE_ROBINHOOD_TESTNET_RPC_URL;
export const RPC_URLS: readonly string[] = [...(overrideRpc ? [overrideRpc] : []), ...NETWORK.rpcs];

export const PAYMENT_TOKEN = ASSET === 'usdg' ? {
  address: NETWORK.usdg as Address,
  symbol: 'USDG', name: 'Test USDG (Paxos)', decimals: 6, issuer: 'Paxos',
  faucetUrl: 'https://faucet.paxos.com', currency: 'USD' as const, selfService: false,
} : {
  address: deployment?.contracts.testEURe ?? ZERO_ADDRESS,
  symbol: 'tEURe', name: 'Palissage Test EUR', decimals: 18, issuer: 'Palissage',
  faucetUrl: '/app/testnet', currency: 'EUR' as const, selfService: true,
};

export const USDG_ENABLED = DEPLOYMENT_READY && deployment.usdgEnabled;
export const WALLETCONNECT_PROJECT_ID = env.VITE_WALLETCONNECT_PROJECT_ID ?? '';
export const CLAIM_TOPIC = { kyc: 1n, kyb: 2n, winery: 3n, b2bBuyer: 4n, verifier: 5n } as const;

export function addressUrl(address: string): string { return `${EXPLORER_URL}/address/${address}`; }
export function txUrl(hash: string): string { return `${EXPLORER_URL}/tx/${hash}`; }
export function tokenUrl(tokenId: bigint | number | string): string { return `${EXPLORER_URL}/token/${CONTRACTS.wineLotToken}?a=${tokenId}`; }
