import { useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useMyParticipant, useProtocol } from './lens';
import type { ParticipantView } from './types';

/**
 * Role, verification, capability and mode are independent facts (doc 00 §6).
 * Reaching a cabinet grants nothing: every action re-reads what this wallet can
 * genuinely do from `ParticipantView`, and the UI disables what the contract
 * would reject.
 */

export type RoleKey = 'winery' | 'shop' | 'admin' | 'collector';

export interface RoleOffer {
  key: RoleKey;
  title: string;
  purpose: string;
  /** Why this wallet may or may not enter, in the reader's words. */
  standing: string;
  tone: 'success' | 'warning' | 'neutral';
  /** True when the contracts would accept this role's core action. */
  qualified: boolean;
}

/** RoleGateway.Role -> our route key. */
export function gatewayRoleKey(role: number): RoleKey | null {
  switch (role) {
    case 1:
      return 'admin';
    case 2:
      return 'winery';
    case 3:
      return 'shop';
    case 4:
      return 'collector';
    default:
      return null;
  }
}

export interface Capabilities {
  /** WineLotToken.createLot requires TOPIC_WINERY. */
  canPublishLot: boolean;
  /** PrimaryMarket.reserve requires TOPIC_B2B_BUYER; minting also needs canReceive. */
  canReserve: boolean;
  /** WineLotToken.verifyLot / suspendLot require VERIFIER_ROLE on the token. */
  canVerifyLot: boolean;
  /** PrimaryMarket.confirmMilestone requires VERIFIER_ROLE on the market. */
  canConfirmMilestone: boolean;
  /** RedemptionManager dispute paths require its VERIFIER_ROLE. */
  canResolveRedemption: boolean;
  /** RoleGateway.assignRole is onlyGatewayAdmin and works in any mode. */
  canAssignRoles: boolean;
  /** RoleGateway.setTestMode is onlyOwner. */
  ownsGateway: boolean;
  canReceiveBottles: boolean;
  canSendBottles: boolean;
}

export function capabilitiesOf(p?: ParticipantView): Capabilities {
  return {
    canPublishLot: Boolean(p?.wineryClaim),
    canReserve: Boolean(p?.b2bClaim && p?.canReceive),
    canVerifyLot: Boolean(p?.tokenVerifier),
    canConfirmMilestone: Boolean(p?.primaryVerifier),
    canResolveRedemption: Boolean(p?.redemptionVerifier),
    canAssignRoles: Boolean(p?.gatewayAdmin),
    ownsGateway: Boolean(p?.gatewayOwner),
    canReceiveBottles: Boolean(p?.canReceive),
    canSendBottles: Boolean(p?.canSend),
  };
}

export function useCapabilities() {
  const { data } = useMyParticipant();
  return useMemo(() => capabilitiesOf(data), [data]);
}

/**
 * Which cabinets this wallet may enter, and why. Ordering is stable so the
 * role-select screen does not reshuffle between reads.
 */
export function useRoleOffers(): { offers: RoleOffer[]; participant?: ParticipantView; loading: boolean } {
  const { address } = useAccount();
  const { data: participant, isLoading } = useMyParticipant();
  const caps = capabilitiesOf(participant);

  const offers = useMemo<RoleOffer[]>(() => {
    const gateway = participant ? gatewayRoleKey(participant.gatewayRole) : null;

    return [
      {
        key: 'winery',
        title: 'Winery',
        purpose: 'Publish lots, run En Primeur, follow finance',
        qualified: caps.canPublishLot,
        tone: caps.canPublishLot ? 'success' : 'neutral',
        standing: caps.canPublishLot
          ? 'Winery claim issued — you can create lots and publish offers.'
          : 'Needs the winery claim. Take the role on the readiness screen while test mode is open.',
      },
      {
        key: 'shop',
        title: 'Shop',
        purpose: 'Buy verified lots, track your portfolio',
        qualified: caps.canReserve,
        tone: caps.canReserve ? 'success' : 'neutral',
        standing: caps.canReserve
          ? 'B2B buyer claim issued and bottles can be minted to this wallet.'
          : 'Needs the B2B buyer claim. Take the role on the readiness screen while test mode is open.',
      },
      {
        key: 'admin',
        title: 'Operations',
        purpose: 'Verify lots, confirm milestones, manage members',
        qualified: caps.canVerifyLot || caps.canConfirmMilestone || caps.canAssignRoles,
        tone:
          caps.canVerifyLot && caps.canConfirmMilestone && caps.canResolveRedemption
            ? 'success'
            : caps.canVerifyLot || caps.canConfirmMilestone || caps.canAssignRoles
              ? 'warning'
              : 'neutral',
        standing: describeOperator(caps),
      },
      {
        key: 'collector',
        title: 'Collector',
        purpose: 'Scan bottles, keep a shelf',
        qualified: true,
        tone: 'neutral',
        standing:
          gateway === 'collector'
            ? 'Collector role set in the gateway. No claim is needed to read a passport.'
            : 'No claim needed. A passport reads without a wallet at all.',
      },
    ];
  }, [participant, caps]);

  return { offers, participant, loading: Boolean(address) && isLoading };
}

function describeOperator(caps: Capabilities): string {
  const held: string[] = [];
  if (caps.canVerifyLot) held.push('lot verifier');
  if (caps.canConfirmMilestone) held.push('milestone verifier');
  if (caps.canResolveRedemption) held.push('redemption verifier');
  if (caps.canAssignRoles) held.push('gateway admin');
  if (held.length === 0) {
    return 'This wallet holds no operator role. Operations cannot be self-assigned — a gateway admin grants it.';
  }
  return `This wallet holds ${held.join(', ')}. Every decision re-reads the specific role it needs.`;
}

/** True while the gateway's public self-service window is open. */
export function useTestMode(): boolean {
  const { data } = useProtocol();
  return Boolean(data?.testMode);
}
