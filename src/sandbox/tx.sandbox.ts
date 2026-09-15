import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Hex } from 'viem';
import type { TxError, TxStage } from '@/chain/tx';
import { applySandboxWrite } from './effects';

/**
 * A transaction that never leaves the browser, walking the same states the real
 * one does. `TxStatus`, `ActionReview` and every calling screen are untouched —
 * they are reading a `TxState`, and this produces one.
 *
 * The timings are the honest part: a signature that resolves instantly would
 * teach that signing is instant, and the first real transaction would then feel
 * broken.
 */
const SIGNATURE_MS = 900;
const CONFIRMATION_MS = 1400;

/** The entry tour arms this once, so a reader sees what a decline looks like. */
let declineOnce = false;
export function armSimulatedDecline(): void {
  declineOnce = true;
}

function simulatedHash(): Hex {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${[...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')}` as Hex;
}

interface SendVariables {
  functionName?: string;
  args?: readonly unknown[];
}

interface SendOptions {
  onSuccess?: (hash: Hex, variables: unknown, context: unknown) => void;
  onError?: (error: Error, variables: unknown, context: unknown) => void;
}

export function useSimulatedTx() {
  const [stage, setStage] = useState<TxStage>('idle');
  const [hash, setHash] = useState<Hex | undefined>(undefined);
  const timers = useRef<number[]>([]);

  const clear = useCallback(() => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
  }, []);

  useEffect(() => clear, [clear]);

  const reset = useCallback(() => {
    clear();
    setStage('idle');
    setHash(undefined);
  }, [clear]);

  const send = useMemo(() => {
    const wrapped = (variables: SendVariables, options?: SendOptions) => {
      clear();
      setStage('awaitingSignature');

      const after = (ms: number, run: () => void) => {
        timers.current.push(window.setTimeout(run, ms));
      };

      after(SIGNATURE_MS, () => {
        if (declineOnce) {
          declineOnce = false;
          setStage('rejected');
          options?.onError?.(new Error('Request declined'), variables, undefined);
          return;
        }
        const next = simulatedHash();
        setHash(next);
        setStage('confirming');
        after(CONFIRMATION_MS, () => {
          applySandboxWrite(variables.functionName ?? '', variables.args ?? []);
          setStage('confirmed');
          options?.onSuccess?.(next, variables, undefined);
        });
      });
    };
    return wrapped;
  }, [clear]);

  const error = useMemo<TxError | undefined>(() => {
    if (stage !== 'rejected') return undefined;
    return {
      message:
        'Request declined. Nothing was submitted and nothing was charged — this is what a decline looks like in your wallet.',
      action: 'Try again',
    };
  }, [stage]);

  return {
    stage,
    hash,
    error,
    busy: stage === 'awaitingSignature' || stage === 'confirming',
    reset,
    send,
  };
}
