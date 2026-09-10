import { baseSepolia } from 'viem/chains';
import type { Address, Chain } from 'viem';

/**
 * Network and deployment configuration.
 *
 * Palissage settles on **Base**. This release targets Base Sepolia (84532);
 * Base mainnet is not reachable from this build. A configuration error must fail
 * closed — it never falls back to demo data or to another chain (doc 00 §6).
 *
 * Earlier prototype addresses on Arbitrum Sepolia are historical. They are not
 * present in this file and must never be presented as Base.
 */

const env = import.meta.env as Record<string, string | undefined>;

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;

function addr(value: string | undefined, fallback: string): Address {
  const candidate = value && /^0x[0-9a-fA-F]{40}$/.test(value) ? value : fallback;
  return candidate as Address;
}

export const CHAIN: Chain = baseSepolia;
export const CHAIN_ID = baseSepolia.id;
export const CHAIN_LABEL = 'Base Sepolia';
export const EXPLORER_URL = 'https://sepolia.basescan.org';

/** Deployment id of the manifest this interface reads. */
export const DEPLOYMENT_ID = 'palissage-84532';

/**
 * Read endpoints, ordered by measured reliability rather than by provenance.
 *
 * Sampled on 10 September 2026 with the burst one page load produces, twelve
 * batches of twenty calls: publicnode answered 12 of 12, `sepolia.base.org`
 * 4 of 12, and the Tenderly gateway returned HTTP 429 on 10 of 12. Single
 * requests answer everywhere; it is the burst that gets throttled, which is
 * why the reads are also collapsed into one multicall (see wagmi.ts).
 *
 * A dropped read must never look like an empty catalogue, so the interface
 * falls through this list and says so when none of them answers.
 */
export const RPC_URLS: readonly string[] = [
  ...(env.VITE_BASE_SEPOLIA_RPC_URL ? [env.VITE_BASE_SEPOLIA_RPC_URL] : []),
  'https://base-sepolia-rpc.publicnode.com',
  'https://sepolia.base.org',
  'https://base-sepolia.gateway.tenderly.co',
];

/** Deployed Palissage contracts — protocolVersion 1.0.0-mvp, all verified. */
export const CONTRACTS = {
  trustedIssuersRegistry: addr(
    env.VITE_TRUSTED_ISSUERS_REGISTRY_ADDRESS,
    '0x798Cc1a405Eb3bC6179Db81De5a9d1e5b2349201',
  ),
  identityRegistry: addr(
    env.VITE_IDENTITY_REGISTRY_ADDRESS,
    '0x313d7a63c717ad25a0c49BFBaa8fe142CD28E0bd',
  ),
  claimIssuer: addr(env.VITE_CLAIM_ISSUER_ADDRESS, '0xD05a0B4B5Cd522Cc175C1eB0DA857212b42E1074'),
  roleGateway: addr(env.VITE_ROLE_GATEWAY_ADDRESS, '0x23083F4d7048B31627631510DC73a5a56D630840'),
  wineLotToken: addr(env.VITE_WINE_LOT_TOKEN_ADDRESS, '0x0fef031115E60105c09458E4e28031DaF62D1AbD'),
  primaryMarket: addr(env.VITE_PRIMARY_MARKET_ADDRESS, '0x98EDC97B03Ae9901D4Af73F62dbF3C10F3927fA1'),
  secondaryMarket: addr(
    env.VITE_SECONDARY_MARKET_ADDRESS,
    '0x4F0862a4346A3EB88545F66B3E0b423966F6aCe0',
  ),
  redemptionManager: addr(
    env.VITE_REDEMPTION_MANAGER_ADDRESS,
    '0x67C05db79223707635f9F386C57227AFe1C782aE',
  ),
  palissageLens: addr(env.VITE_PALISSAGE_LENS_ADDRESS, '0x36C5f43919CB220A7368c2E3bC373B378D0eE7B6'),
} as const;

/**
 * Settlement asset — Circle's EURC on Base Sepolia, 6 decimals. Not our
 * contract: Circle deploys, upgrades and pauses it.
 *
 * `TestEURe` (18 decimals) was the earlier faucet token. It has been removed
 * from both markets' allowlists, so nothing can be paid with it any more; it is
 * kept in the deployment for local Anvil only and is not referenced here.
 *
 * Decimals and symbol are re-read from the chain through PalissageLens.protocol()
 * so a swap of the settlement asset needs no code change.
 */
export const PAYMENT_TOKEN = {
  address: addr(env.VITE_PAYMENT_TOKEN_ADDRESS, '0x808456652fdb597867f38412077A9182bf77359F'),
  symbol: 'EURC',
  name: 'EURC (Circle)',
  decimals: 6,
  issuer: 'Circle',
  faucetUrl: 'https://faucet.circle.com',
} as const;

/** WalletConnect / mobile-QR project id. Injected wallets work without it. */
export const WALLETCONNECT_PROJECT_ID = env.VITE_WALLETCONNECT_PROJECT_ID ?? '';

/** Claim topics, from src/libraries/ClaimTopicsLib.sol. */
export const CLAIM_TOPIC = {
  kyc: 1n,
  kyb: 2n,
  winery: 3n,
  b2bBuyer: 4n,
  verifier: 5n,
} as const;

export function addressUrl(address: string): string {
  return `${EXPLORER_URL}/address/${address}`;
}

export function txUrl(hash: string): string {
  return `${EXPLORER_URL}/tx/${hash}`;
}

export function tokenUrl(tokenId: bigint | number | string): string {
  return `${EXPLORER_URL}/token/${CONTRACTS.wineLotToken}?a=${tokenId}`;
}
