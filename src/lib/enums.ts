/**
 * The five enumerations, with the labels doc 01 section 1 fixes. A lot has a
 * lot state; a lot has a production stage; an offer has a phase; an allocation
 * has an allocation state; a redemption has a redemption state. Five different
 * things, five different words — `status` is never a universal field name.
 */

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent';

export interface EnumLabel {
  label: string;
  tone: Tone;
}

/** WineLotToken.LotStatus */
export const LOT_STATE: readonly EnumLabel[] = [
  { label: 'Draft', tone: 'neutral' },
  { label: 'Verified', tone: 'success' },
  { label: 'Suspended', tone: 'danger' },
  { label: 'Closed', tone: 'neutral' },
];

/** WineLotToken.ProductionStatus — forward only, never rendered as reversible. */
export const PRODUCTION_STAGES = [
  'Announced',
  'In the vineyard',
  'Harvested',
  'Vinification',
  'Ageing',
  'Bottled',
  'Ready for delivery',
] as const;

export type ProductionStage = (typeof PRODUCTION_STAGES)[number];

/** Short forms for the vertical lifecycle below 520 px of container width. */
export const PRODUCTION_STAGES_SHORT = [
  'Announced',
  'Vineyard',
  'Harvested',
  'Vinification',
  'Ageing',
  'Bottled',
  'Ready',
] as const;

/** PalissageLens.OfferView.phase */
export const OFFER_PHASE: readonly EnumLabel[] = [
  { label: 'Scheduled', tone: 'neutral' },
  { label: 'Open', tone: 'success' },
  { label: 'Sold out', tone: 'neutral' },
  { label: 'Closed', tone: 'neutral' },
  { label: 'Cancelled', tone: 'neutral' },
];

/** PrimaryMarket.AllocationState */
export const ALLOCATION_STATE: readonly EnumLabel[] = [
  { label: 'Deposit paid', tone: 'warning' },
  { label: 'Paid in full', tone: 'success' },
  { label: 'Cancelled', tone: 'neutral' },
  { label: 'Defaulted', tone: 'danger' },
];

/** RedemptionManager.RedemptionState — "Delivered" and "Returned" in buyer copy. */
export const REDEMPTION_STATE: readonly EnumLabel[] = [
  { label: 'Requested', tone: 'warning' },
  { label: 'Shipped', tone: 'info' },
  { label: 'Delivered', tone: 'success' },
  { label: 'Returned', tone: 'neutral' },
];

/** RoleGateway.Role */
export const GATEWAY_ROLE = ['None', 'Admin', 'Winery', 'Shop', 'Collector'] as const;
export type GatewayRoleName = (typeof GATEWAY_ROLE)[number];

/** PrimaryMarket.OfferKind */
export const OFFER_KIND = ['Current release', 'En Primeur'] as const;

export function lotState(index: number): EnumLabel {
  return LOT_STATE[index] ?? { label: 'Unknown', tone: 'neutral' };
}

export function productionStage(index: number): ProductionStage {
  return PRODUCTION_STAGES[index] ?? 'Announced';
}

export function offerPhase(index: number): EnumLabel {
  return OFFER_PHASE[index] ?? { label: 'Unknown', tone: 'neutral' };
}

export function allocationState(index: number): EnumLabel {
  return ALLOCATION_STATE[index] ?? { label: 'Unknown', tone: 'neutral' };
}

export function redemptionState(index: number): EnumLabel {
  return REDEMPTION_STATE[index] ?? { label: 'Unknown', tone: 'neutral' };
}

export function offerKindLabel(index: number): string {
  return OFFER_KIND[index] ?? 'Current release';
}

export function isEnPrimeur(kind: number): boolean {
  return kind === 1;
}

/** The seven-stage sequence is forward only; index 6 is terminal. */
export function nextProductionStage(current: number): ProductionStage | null {
  return current >= PRODUCTION_STAGES.length - 1 ? null : PRODUCTION_STAGES[current + 1];
}
