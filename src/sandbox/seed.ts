import type { Address, Hex } from 'viem';
import type { RoleKey } from '@/chain/roles';
import { CONTRACTS, PAYMENT_TOKEN, CHAIN_ID, ZERO_ADDRESS } from '@/chain/config';
import type {
  AllocationView,
  LotView,
  OfferView,
  ParticipantView,
  ProtocolView,
  RedemptionView,
} from '@/chain/types';

/**
 * The invented world the simulation runs in.
 *
 * Lot ids are 1..6 on purpose: `lib/content/lots.ts` is keyed by lot id, so the
 * simulated catalogue carries the same producers, photographs and tasting notes
 * as the public site. A reader who takes the tour and then opens `/lots` sees
 * the same wine, which is the point — this is a rehearsal of the product, not a
 * different product.
 */

/** The reader, in simulation. Always shown next to the word "Demo". */
export const DEMO_WALLET = '0x5ca1ed0000000000000000000000000000000de0' as Address;
/** Palissage Operations. The tour never lets the reader be this wallet unless the operator tour is running. */
export const DEMO_OPERATOR = '0xdecafe0000000000000000000000000000000001' as Address;
export const DEMO_OTHER_WINERY = '0xdecafe0000000000000000000000000000000002' as Address;
export const DEMO_SHOP = '0xdecafe0000000000000000000000000000000003' as Address;

const NO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex;
const DOCS_HASH = '0x9d2f1c7a41b8e6530af4c2b19e7d85630bb41f2a6c8d9e0714a35c6b8f2d4e91' as Hex;

const EUR = (whole: number): bigint => BigInt(Math.round(whole * 100)) * 10n ** BigInt(PAYMENT_TOKEN.decimals - 2);

function hoursFromNow(hours: number): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + hours * 3600);
}

/**
 * Claims are seeded from the role the reader chose, not handed out wholesale.
 * A winery that could also verify its own lot would teach the wrong lesson: the
 * separation between publishing and verifying is the thing the tour exists to
 * show.
 */
export function demoParticipant(role: RoleKey): ParticipantView {
  const base: ParticipantView = {
    wallet: DEMO_WALLET,
    identity: '0xdecafe00000000000000000000000000000000ff' as Address,
    gatewayRole: 0,
    country: 250,
    registered: true,
    isVerified: true,
    kyc: true,
    kyb: true,
    wineryClaim: false,
    b2bClaim: false,
    tokenVerifier: false,
    tokenEnforcer: false,
    tokenAdmin: false,
    primaryVerifier: false,
    primaryPauser: false,
    secondaryPauser: false,
    redemptionVerifier: false,
    primaryAdmin: false,
    gatewayAdmin: false,
    gatewayOwner: false,
    canSend: true,
    canReceive: true,
  };

  switch (role) {
    case 'winery':
      return { ...base, gatewayRole: 2, wineryClaim: true };
    case 'shop':
      return { ...base, gatewayRole: 3, b2bClaim: true };
    case 'admin':
      return {
        ...base,
        gatewayRole: 1,
        tokenVerifier: true,
        primaryVerifier: true,
        redemptionVerifier: true,
        gatewayAdmin: true,
      };
    case 'collector':
    default:
      return { ...base, gatewayRole: 4 };
  }
}

export function operatorParticipant(): ParticipantView {
  return {
    ...demoParticipant('admin'),
    wallet: DEMO_OPERATOR,
    identity: DEMO_OPERATOR,
  };
}

export function seedProtocol(): ProtocolView {
  return {
    chainId: BigInt(CHAIN_ID),
    version: '1.1.0',
    wineLotToken: CONTRACTS.wineLotToken,
    primaryMarket: CONTRACTS.primaryMarket,
    secondaryMarket: CONTRACTS.secondaryMarket,
    redemptionManager: CONTRACTS.redemptionManager,
    identityRegistry: CONTRACTS.identityRegistry,
    trustedIssuersRegistry: CONTRACTS.trustedIssuersRegistry,
    roleGateway: CONTRACTS.roleGateway,
    primaryFeeBps: 300,
    secondaryFeeBps: 200,
    primaryTreasury: DEMO_OPERATOR,
    secondaryTreasury: DEMO_OPERATOR,
    primaryPaused: false,
    secondaryPaused: false,
    testMode: true,
    lotCount: 6n,
    offerCount: 3n,
    allocationCount: 1n,
    listingCount: 0n,
    redemptionCount: 0n,
    paymentToken: PAYMENT_TOKEN.address,
    paymentDecimals: PAYMENT_TOKEN.decimals,
    paymentSymbol: PAYMENT_TOKEN.symbol,
    paymentAllowedPrimary: true,
    paymentAllowedSecondary: true,
    paymentMetadataOk: true,
  };
}

function lot(
  id: number,
  winery: Address,
  name: string,
  region: string,
  vintage: number,
  totalBottles: number,
  status: number,
  production: number,
  extra: Partial<LotView> = {},
): LotView {
  return {
    id: BigInt(id),
    winery,
    status,
    production,
    totalBottles,
    mintedBottles: 0,
    redeemedBottles: 0,
    vintage,
    royaltyBps: 250,
    bottleSizeMl: 750,
    exportAllowed: true,
    verifier: status === 1 ? DEMO_OPERATOR : ZERO_ADDRESS,
    docsHash: status === 1 ? DOCS_HASH : NO_HASH,
    name,
    region,
    grapes: '',
    metadataURI: '',
    offeredBottles: 0n,
    circulating: 0n,
    ...extra,
  };
}

export function seedLots(owner: Address): LotView[] {
  return [
    lot(1, owner, 'Demoiselle', 'Cabardès', 2023, 1200, 1, 4, {
      mintedBottles: 240,
      offeredBottles: 600n,
      circulating: 240n,
    }),
    lot(2, DEMO_OTHER_WINERY, 'Rissac', 'Cabardès', 2023, 900, 1, 5, {
      mintedBottles: 180,
      offeredBottles: 400n,
      circulating: 180n,
    }),
    lot(3, DEMO_OTHER_WINERY, 'Galea blanc', 'Cabardès', 2022, 1400, 1, 6, {
      mintedBottles: 320,
      offeredBottles: 500n,
      circulating: 320n,
    }),
    lot(4, owner, 'Niange', 'Cabardès', 2023, 800, 0, 3),
    lot(5, DEMO_OTHER_WINERY, 'Villemartin', 'Cabardès', 2021, 1100, 1, 6, {
      mintedBottles: 90,
      circulating: 90n,
    }),
    lot(6, owner, 'Naissance', 'Cabardès', 2024, 600, 0, 1),
  ];
}

export function seedOffers(owner: Address): OfferView[] {
  return [
    {
      id: 1n,
      lotId: 1n,
      winery: owner,
      paymentToken: PAYMENT_TOKEN.address,
      pricePerBottle: EUR(24),
      quantity: 600,
      reserved: 120,
      available: 480,
      startTime: hoursFromNow(-48),
      endTime: hoursFromNow(24 * 30),
      depositBps: 3000,
      fullPaymentDeadline: hoursFromNow(24 * 90),
      kind: 1,
      active: true,
      phase: 1,
    },
    {
      id: 2n,
      lotId: 2n,
      winery: DEMO_OTHER_WINERY,
      paymentToken: PAYMENT_TOKEN.address,
      pricePerBottle: EUR(31.5),
      quantity: 400,
      reserved: 0,
      available: 400,
      startTime: hoursFromNow(-6),
      endTime: hoursFromNow(24 * 45),
      depositBps: 0,
      fullPaymentDeadline: 0n,
      kind: 0,
      active: true,
      phase: 1,
    },
    {
      id: 3n,
      lotId: 3n,
      winery: DEMO_OTHER_WINERY,
      paymentToken: PAYMENT_TOKEN.address,
      pricePerBottle: EUR(18),
      quantity: 500,
      reserved: 500,
      available: 0,
      startTime: hoursFromNow(-240),
      endTime: hoursFromNow(24 * 10),
      depositBps: 0,
      fullPaymentDeadline: 0n,
      kind: 0,
      active: true,
      phase: 2,
    },
  ];
}

export function seedAllocations(buyer: Address): AllocationView[] {
  return [
    {
      id: 1n,
      offerId: 3n,
      lotId: 3n,
      buyer,
      paymentToken: PAYMENT_TOKEN.address,
      quantity: 60,
      pricePerBottle: EUR(18),
      totalDue: EUR(1080),
      paidAmount: EUR(1080),
      remaining: 0n,
      createdAt: hoursFromNow(-200),
      state: 1,
      fullPaymentDeadline: 0n,
      overdue: false,
    },
  ];
}

export function seedRedemptions(): RedemptionView[] {
  return [];
}

/** Enough payment tokens to run a reservation, and enough gas that no step is blocked. */
export const SEED_PAYMENT_BALANCE = EUR(8500);
export const SEED_GAS_BALANCE = 42_000_000_000_000_000n;
