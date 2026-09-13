import { keccak256, toHex } from 'viem';

/**
 * The AccessControl surface the three role-bearing contracts share.
 *
 * WineLotToken, PrimaryMarket and RedemptionManager each carry their own
 * `VERIFIER_ROLE`, granted by that contract's own `DEFAULT_ADMIN_ROLE`. The
 * generated ABIs all contain these three functions, but reading a role across
 * contracts through three different ABI unions buys nothing: the signatures are
 * identical because they come from the same base contract. One narrow ABI keeps
 * the call sites simple and says out loud that this is the AccessControl
 * surface, not something specific to a market.
 */
export const accessControlAbi = [
  {
    type: 'function',
    name: 'hasRole',
    stateMutability: 'view',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'grantRole',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'revokeRole',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    outputs: [],
  },
  // AccessControl's own reverts, so a rejected grant names itself in the error
  // panel instead of falling back to "the contract rejected it".
  {
    type: 'error',
    name: 'AccessControlUnauthorizedAccount',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'neededRole', type: 'bytes32' },
    ],
  },
  {
    type: 'error',
    name: 'AccessControlBadConfirmation',
    inputs: [],
  },
] as const;

/** `keccak256("VERIFIER_ROLE")`, the same value on all three contracts. */
export const VERIFIER_ROLE = keccak256(toHex('VERIFIER_ROLE'));

/** OpenZeppelin's `DEFAULT_ADMIN_ROLE` is the zero word. */
export const DEFAULT_ADMIN_ROLE = `0x${'0'.repeat(64)}` as `0x${string}`;
