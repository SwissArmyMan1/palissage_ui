import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import type { Hex } from 'viem';
import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from 'viem';
import { CHAIN_ID, CHAIN_LABEL } from './config';

/**
 * The write lifecycle, as the states in doc 05 §1 name them.
 *
 * Money writes are never optimistic and never auto-retried. Closing the dialog
 * does not cancel a submitted transaction, and a second click while a signature
 * is pending does not duplicate it.
 */
export type TxStage =
  | 'idle'
  /** ST-H — the wallet is holding the request. */
  | 'awaitingSignature'
  /** ST-J — broadcast, waiting for inclusion. */
  | 'confirming'
  /** ST-K — mined and successful; the read model may still be behind. */
  | 'confirmed'
  /** ST-I — declined in the wallet. Nothing was submitted. */
  | 'rejected'
  /** ST-L — mined and reverted. */
  | 'reverted'
  /** ST-M — we did not get an answer. */
  | 'unknown';

export interface TxError {
  /** What happened, then why, then what to do — doc 07 §4. */
  message: string;
  action?: string;
  /** Copyable technical detail, behind a disclosure. */
  detail?: string;
}

/** Maps a wallet or node error onto the message pattern. Never "Invalid input". */
export function describeWriteError(error: unknown, chainLabel = CHAIN_LABEL): TxError {
  if (!error) return { message: 'The request did not complete.' };

  if (error instanceof BaseError) {
    const rejected = error.walk((e) => e instanceof UserRejectedRequestError);
    if (rejected) {
      return {
        message: 'Request declined in your wallet. Nothing was submitted and nothing was charged.',
        action: 'Try again',
      };
    }

    const reverted = error.walk((e) => e instanceof ContractFunctionRevertedError);
    if (reverted instanceof ContractFunctionRevertedError) {
      const name = reverted.data?.errorName ?? reverted.reason ?? 'the contract rejected it';
      return {
        message: `The contract did not accept this transaction (${name}). Nothing was charged.`,
        action: 'Review the terms',
        detail: reverted.shortMessage,
      };
    }

    if (/insufficient funds/i.test(error.message)) {
      return {
        message: `This wallet does not hold enough ${chainLabel} ETH to pay for gas.`,
        action: 'Get test ETH',
        detail: error.shortMessage,
      };
    }

    if (/chain|network/i.test(error.shortMessage ?? '')) {
      return {
        message: `Your wallet is on a different network. Palissage runs on ${chainLabel} for this release.`,
        action: `Switch to ${chainLabel}`,
        detail: error.shortMessage,
      };
    }

    return { message: error.shortMessage || error.message, detail: error.message };
  }

  return { message: error instanceof Error ? error.message : 'The request did not complete.' };
}

export interface TxState {
  stage: TxStage;
  hash?: Hex;
  error?: TxError;
  /** True from the moment the wallet is asked until the receipt is in. */
  busy: boolean;
  reset: () => void;
}

/**
 * One transaction.
 *
 * `send` is wagmi's own `writeContract`, handed back unwrapped on purpose: that
 * keeps full ABI inference at the call site, so a wrong argument type is a
 * compile error rather than a revert. The duplicate-submit guard lives in the
 * confirmation dialog, which disables its button while `busy` is true.
 */
export function useTx() {
  const { chainId } = useAccount();
  const queryClient = useQueryClient();
  const { writeContract, data: hash, error: writeError, isPending, reset: resetWrite } =
    useWriteContract();

  const receipt = useWaitForTransactionReceipt({
    hash,
    confirmations: 1,
    query: { enabled: Boolean(hash) },
  });

  const invalidated = useRef<string | null>(null);

  // A confirmed write means the read model is behind, not that the screen is
  // wrong: repeat the read, never the write (ST-K).
  useEffect(() => {
    if (receipt.data?.status === 'success' && invalidated.current !== hash) {
      invalidated.current = hash ?? null;
      void queryClient.invalidateQueries({ queryKey: ['readContract'] });
    }
  }, [receipt.data?.status, hash, queryClient]);

  const stage: TxStage = useMemo(() => {
    if (writeError) return 'rejected';
    if (isPending) return 'awaitingSignature';
    if (hash && receipt.isLoading) return 'confirming';
    if (receipt.data?.status === 'success') return 'confirmed';
    if (receipt.data?.status === 'reverted') return 'reverted';
    if (hash && receipt.isError) return 'unknown';
    return 'idle';
  }, [writeError, isPending, hash, receipt.isLoading, receipt.isError, receipt.data?.status]);

  const error = useMemo<TxError | undefined>(() => {
    if (writeError) return describeWriteError(writeError);
    if (receipt.data?.status === 'reverted') {
      return {
        message: 'The transaction was included but reverted, so nothing changed.',
        action: 'Review and try again',
        detail: hash,
      };
    }
    if (hash && receipt.isError) {
      return {
        message:
          'We have not confirmed the result yet. Check the transaction before submitting it again.',
        action: 'View transaction',
        detail: hash,
      };
    }
    if (chainId && chainId !== CHAIN_ID) {
      return {
        message: `Your wallet is on another network. Palissage runs on ${CHAIN_LABEL} for this release.`,
        action: `Switch to ${CHAIN_LABEL}`,
      };
    }
    return undefined;
  }, [writeError, receipt.data?.status, receipt.isError, hash, chainId]);

  const reset = useCallback(() => {
    resetWrite();
    invalidated.current = null;
  }, [resetWrite]);

  return {
    stage,
    hash,
    error,
    busy: stage === 'awaitingSignature' || stage === 'confirming',
    reset,
    send: writeContract,
  };
}

/** Copy for each stage, so every dialog says the same thing. */
export const STAGE_COPY: Record<TxStage, { title: string; body?: string }> = {
  idle: { title: '' },
  awaitingSignature: {
    title: 'Waiting for your wallet',
    body: 'Approve the request in your wallet. Nothing has been submitted yet.',
  },
  confirming: {
    title: 'Submitted — waiting for Base',
    body: 'Closing this dialog does not cancel the transaction.',
  },
  confirmed: { title: 'Confirmed', body: 'Updating your records from the chain…' },
  rejected: { title: 'Request declined' },
  reverted: { title: 'The transaction reverted' },
  unknown: { title: 'Result not confirmed' },
};
