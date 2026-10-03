import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useAccount,
  useSwitchChain,
  usePublicClient,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import type { Hex } from 'viem';
import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from 'viem';
import { useDeploymentHealth } from './health';
import { CHAIN_ID, CHAIN_LABEL, DEPLOYMENT_READY } from './config';
import { beginTransactionRequest, finishTransactionRequest, pendingTransaction, savePendingTransaction } from './pending-store';
import { useSandbox } from '@/sandbox/store';
import { useSimulatedTx } from '@/sandbox/tx.sandbox';

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
        message: `The contract did not accept this transaction (${name}).`,
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
 * `send` keeps the exact signature of wagmi's `writeContract`, so ABI inference
 * survives at the call site and a wrong argument is a compile error rather than
 * a revert. It adds one thing: the wallet is put on the target chain first.
 *
 * That step is not cosmetic. A single-chain product should never make someone
 * find the network picker themselves — some wallets do not even show one — and
 * `writeContract` asserts the chain and throws rather than switching. The v1
 * interface switched inside the write path for exactly this reason; dropping it
 * turned a one-click action into a dead end.
 *
 * The duplicate-submit guard lives in the confirmation dialog, which disables
 * its button while `busy` is true.
 */
function useChainTx() {
  const { chainId, address, connector } = useAccount();
  const client = usePublicClient({ chainId: CHAIN_ID });
  const health = useDeploymentHealth();
  const inFlight = useRef(false);
  const { switchChainAsync } = useSwitchChain();
  const queryClient = useQueryClient();
  const [switchError, setSwitchError] = useState<unknown>(null);
  const [switching, setSwitching] = useState(false);
  const { writeContractAsync, data: hash, error: writeError, isPending, reset: resetWrite } =
    useWriteContract();

  const receipt = useWaitForTransactionReceipt({
    hash,
    chainId: CHAIN_ID,
    confirmations: 1,
    query: { enabled: Boolean(hash) },
  });

  const invalidated = useRef<string | null>(null);

  // A confirmed write means the read model is behind, not that the screen is
  // wrong: repeat the read, never the write (ST-K).
  useEffect(() => {
    if (receipt.data && pendingTransaction()?.hash === hash) savePendingTransaction(null);
    if (receipt.data?.status === 'success' && invalidated.current !== hash) {
      invalidated.current = hash ?? null;
      for (const key of ['readContract', 'readContracts', 'balance', 'deployment-health']) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
    }
  }, [receipt.data, hash, queryClient]);

  const stage: TxStage = useMemo(() => {
    if (writeError || switchError) return 'rejected';
    if (switching || isPending) return 'awaitingSignature';
    if (hash && receipt.isLoading) return 'confirming';
    if (receipt.data?.status === 'success') return 'confirmed';
    if (receipt.data?.status === 'reverted') return 'reverted';
    if (hash && receipt.isError) return 'unknown';
    return 'idle';
  }, [
    writeError,
    switchError,
    switching,
    isPending,
    hash,
    receipt.isLoading,
    receipt.isError,
    receipt.data?.status,
  ]);

  const error = useMemo<TxError | undefined>(() => {
    if (switchError) {
      const described = describeWriteError(switchError);
      return described;
    }
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
    return undefined;
  }, [switchError, writeError, receipt.data?.status, receipt.isError, hash]);

  const reset = useCallback(() => {
    resetWrite();
    setSwitchError(null);
    setSwitching(false);
    invalidated.current = null;
  }, [resetWrite]);

  /**
   * Same signature as `writeContract`, so every call site keeps its inference.
   * The cast is the one place that bridges the wrapper to wagmi's overloads.
   */
  const send = useMemo(() => {
    const wrapped = (variables: never, options: never) => {
      if (inFlight.current || !beginTransactionRequest()) return;
      inFlight.current = true;
      setSwitchError(null);
      setSwitching(true);
      void (async () => {
        try {
          if (pendingTransaction()) throw new Error('A previous transaction is still awaiting confirmation. Check its result before submitting another.');
          if (!DEPLOYMENT_READY || !client) throw new Error('No verified deployment is published for this network.');
          if (!address || connector?.id === 'mock') throw new Error('Connect a real wallet to submit a testnet transaction.');
          const checked = await health.refetch();
          if (!checked.data?.ready || checked.error) throw checked.error ?? new Error('The deployment checks have not passed.');
          if (chainId !== CHAIN_ID) await switchChainAsync({ chainId: CHAIN_ID });
          const supplied = variables as Parameters<typeof client.simulateContract>[0];
          const { request } = await client.simulateContract({ ...supplied, account: address });
          setSwitching(false);
          const submitted = await writeContractAsync({ ...request, chainId: CHAIN_ID } as never, options);
          savePendingTransaction({ hash: submitted, sender: address });
        } catch (cause) {
          setSwitching(false);
          setSwitchError(cause);
        } finally {
          inFlight.current = false;
          finishTransactionRequest();
        }
      })();
    };
    return wrapped as unknown as ReturnType<typeof useWriteContract>['writeContract'];
  }, [address, connector, client, health, chainId, switchChainAsync, writeContractAsync]);

  return {
    stage,
    hash,
    error,
    busy: stage === 'awaitingSignature' || stage === 'confirming',
    reset,
    send,
  };
}

/**
 * The write seam for the simulation.
 *
 * Both lifecycles are always instantiated, so the hook count never changes and
 * `useTx` stays safe to call unconditionally. Only one of them is wired to the
 * returned object. In simulation the chain lifecycle is simply never sent to,
 * so nothing reaches a wallet or an RPC.
 *
 * The result is one object type rather than a union of two, so every call site
 * keeps its inference — including `send`, whose ABI-generic signature is what
 * makes a wrong argument a compile error instead of a revert.
 */
export function useTx() {
  const sandbox = useSandbox();
  const chain = useChainTx();
  const simulated = useSimulatedTx();
  const active = sandbox !== null;

  return {
    stage: active ? simulated.stage : chain.stage,
    hash: active ? simulated.hash : chain.hash,
    error: active ? simulated.error : chain.error,
    busy: active ? simulated.busy : chain.busy,
    reset: active ? simulated.reset : chain.reset,
    send: active ? (simulated.send as unknown as typeof chain.send) : chain.send,
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
    title: `Submitted — waiting for ${CHAIN_LABEL}`,
    body: 'Closing this dialog does not cancel the transaction.',
  },
  confirmed: { title: 'Confirmed', body: 'Updating your records from the chain…' },
  rejected: { title: 'Request declined' },
  reverted: { title: 'The transaction reverted' },
  unknown: { title: 'Result not confirmed' },
};
