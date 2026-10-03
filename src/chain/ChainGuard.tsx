import { useEffect, useRef } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { useSandbox } from '@/sandbox/store';
import { CHAIN_ID } from './config';

/** One wallet switch attempt per connection; declining leaves the manual switch available. */
export function ChainGuard() {
  const sandbox = useSandbox();
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const attempted = useRef(new Set<string>());

  useEffect(() => {
    if (sandbox || !isConnected || !address || chainId === undefined || chainId === CHAIN_ID) return;
    const key = `${address}:${chainId}`;
    if (attempted.current.has(key)) return;
    attempted.current.add(key);
    switchChain({ chainId: CHAIN_ID });
  }, [sandbox, isConnected, address, chainId, switchChain]);

  return null;
}
