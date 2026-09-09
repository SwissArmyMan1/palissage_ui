import type { Address, Hex } from 'viem';

/**
 * The read model, mirroring the structs in src/periphery/PalissageLens.sol.
 *
 * Hand-written rather than inferred so a contract change produces a readable
 * type error at the call site instead of an unresolvable inference failure.
 * Field names match the Solidity struct exactly.
 */

export interface LotView {
  id: bigint;
  winery: Address;
  status: number;
  production: number;
  totalBottles: number;
  mintedBottles: number;
  redeemedBottles: number;
  vintage: number;
  royaltyBps: number;
  bottleSizeMl: number;
  exportAllowed: boolean;
  verifier: Address;
  docsHash: Hex;
  name: string;
  region: string;
  grapes: string;
  metadataURI: string;
  offeredBottles: bigint;
  circulating: bigint;
}

export interface OfferView {
  id: bigint;
  lotId: bigint;
  winery: Address;
  paymentToken: Address;
  pricePerBottle: bigint;
  quantity: number;
  reserved: number;
  available: number;
  startTime: bigint;
  endTime: bigint;
  depositBps: number;
  fullPaymentDeadline: bigint;
  kind: number;
  active: boolean;
  /** 0 Scheduled, 1 Open, 2 SoldOut, 3 Ended, 4 Cancelled. */
  phase: number;
}

export interface AllocationView {
  id: bigint;
  offerId: bigint;
  lotId: bigint;
  buyer: Address;
  paymentToken: Address;
  quantity: number;
  pricePerBottle: bigint;
  totalDue: bigint;
  paidAmount: bigint;
  remaining: bigint;
  createdAt: bigint;
  state: number;
  fullPaymentDeadline: bigint;
  overdue: boolean;
}

export interface ListingView {
  id: bigint;
  seller: Address;
  lotId: bigint;
  quantity: number;
  pricePerBottle: bigint;
  paymentToken: Address;
  active: boolean;
  sellerBalance: bigint;
  sellerTransferable: bigint;
  sellerApproved: boolean;
  royaltyBps: number;
  feeBps: number;
  lotVerified: boolean;
}

export interface RedemptionView {
  id: bigint;
  buyer: Address;
  lotId: bigint;
  quantity: number;
  deliveryDataHash: Hex;
  shipmentDocsHash: Hex;
  requestedAt: bigint;
  state: number;
  winery: Address;
  lotProduction: number;
}

export interface PositionView {
  lotId: bigint;
  balance: bigint;
  frozen: bigint;
  transferable: bigint;
}

export interface MilestoneView {
  bps: number;
  released: boolean;
  description: string;
}

export interface SettlementView {
  offerId: bigint;
  winery: Address;
  paymentToken: Address;
  settledFunds: bigint;
  withdrawnGross: bigint;
  releasedBps: bigint;
  withdrawable: bigint;
  primaryFeeBps: number;
  milestones: readonly MilestoneView[];
}

export interface ParticipantView {
  wallet: Address;
  identity: Address;
  gatewayRole: number;
  country: number;
  registered: boolean;
  isVerified: boolean;
  kyc: boolean;
  /** Read by the Lens but never required by any contract — doc 10 M5. */
  kyb: boolean;
  wineryClaim: boolean;
  b2bClaim: boolean;
  tokenVerifier: boolean;
  tokenEnforcer: boolean;
  tokenAdmin: boolean;
  primaryVerifier: boolean;
  primaryPauser: boolean;
  secondaryPauser: boolean;
  redemptionVerifier: boolean;
  primaryAdmin: boolean;
  gatewayAdmin: boolean;
  gatewayOwner: boolean;
  canSend: boolean;
  canReceive: boolean;
}

export interface ProtocolView {
  chainId: bigint;
  version: string;
  wineLotToken: Address;
  primaryMarket: Address;
  secondaryMarket: Address;
  redemptionManager: Address;
  identityRegistry: Address;
  trustedIssuersRegistry: Address;
  roleGateway: Address;
  primaryFeeBps: number;
  secondaryFeeBps: number;
  primaryTreasury: Address;
  secondaryTreasury: Address;
  primaryPaused: boolean;
  secondaryPaused: boolean;
  testMode: boolean;
  lotCount: bigint;
  offerCount: bigint;
  allocationCount: bigint;
  listingCount: bigint;
  redemptionCount: bigint;
  paymentToken: Address;
  paymentDecimals: number;
  paymentSymbol: string;
  paymentAllowedPrimary: boolean;
  paymentAllowedSecondary: boolean;
  paymentMetadataOk: boolean;
}

/** PalissageLens.MAX_LIMIT — the interface never asks for more in one call. */
export const PAGE_LIMIT = 50n;
