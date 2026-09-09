import { useEffect, useRef } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { CHAIN_ID } from './config';

/**
 * Puts the wallet on the target chain as soon as it connects.
 *
 * Palissage is a single-chain product, so being on another network is never a
 * choice the reader made on purpose — and some wallets do not offer a network
 * picker at all. Asking someone to find one is a dead end, which is what the
 * "wrong network" state had become.
 *
 * One attempt per wallet-and-chain pair. Declining does not start a loop of
 * wallet prompts; the manual button on the readiness screen stays as the way
 * back, and the write path switches again at the moment it matters.
 */
export function ChainGuard() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const attempted = useRef(new Set<string>());

  useEffect(() => {
    if (!isConnected || !address || chainId === undefined || chainId === CHAIN_ID) return;
    const key = `${address}:${chainId}`;
    if (attempted.current.has(key)) return;
    attempted.current.add(key);
    switchChain({ chainId: CHAIN_ID });
  }, [isConnected, address, chainId, switchChain]);

  return null;
}
