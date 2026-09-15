import { useBalance } from 'wagmi';
import type { Address } from 'viem';
import { CHAIN_ID } from './config';
import { useSandbox } from '@/sandbox/store';
import { selectGasBalance } from '@/sandbox/select';

/**
 * Native gas balance.
 *
 * `usePaymentBalance` reads the settlement asset through the Lens and so runs
 * through the simulation seam already. Gas does not: it is a plain wagmi
 * balance read, and against a simulated wallet the real RPC would answer zero
 * and every readiness check would fail. This is the one wrapper that needs to
 * exist for the two screens that show gas.
 */
export function useGasBalance(address?: Address) {
  const sandbox = useSandbox();
  const query = useBalance({
    address,
    chainId: CHAIN_ID,
    query: { enabled: !sandbox && Boolean(address) },
  });

  if (!sandbox) return query;

  const value = selectGasBalance(sandbox, address);
  return {
    ...query,
    data: {
      value,
      decimals: 18,
      symbol: 'ETH',
      formatted: (Number(value) / 1e18).toFixed(4),
    },
    isLoading: false,
    isError: false,
    isFetching: false,
  };
}
