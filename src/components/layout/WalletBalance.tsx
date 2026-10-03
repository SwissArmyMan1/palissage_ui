import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { cn } from '@/lib/cn';
import { Skeleton } from '@/components/ui/Skeleton';
import { usePaymentBalance, useProtocol } from '@/chain/lens';
import { useGasBalance } from '@/chain/balance';
import { PAYMENT_TOKEN } from '@/chain/config';
import { formatAmount, formatMoney } from '@/lib/format';

/**
 * What the connected wallet holds, pinned above Account in the sidebar footer.
 *
 * Two numbers, because they gate two different things: the settlement asset
 * buys bottles and ETH pays for the signature. A wallet with one and not the
 * other fails at a different point, so they are never merged.
 *
 * Deliberately not a `Stat tile row` — this is persistent chrome, not a
 * dashboard headline, and a tile's large value would outweigh the navigation
 * it sits under.
 *
 * Both balances are read from the selected network directly rather than from whichever network
 * the wallet is pointed at, so they stay correct while the network is wrong —
 * the same rule the readiness screen states.
 */
export function WalletBalance({ onNavigate }: { onNavigate?: () => void }) {
  const { address, isConnected } = useAccount();
  const protocol = useProtocol();
  const payment = usePaymentBalance(address);
  const gas = useGasBalance(address);

  const decimals = protocol.data?.paymentDecimals ?? PAYMENT_TOKEN.decimals;
  const symbol = protocol.data?.paymentSymbol ?? PAYMENT_TOKEN.symbol;

  if (!isConnected) {
    return (
      <div className="border-t border-edge-subtle px-3 py-3">
        <p className="t-caption text-ink-secondary">Test balances</p>
        <p className="mt-2 text-body-sm text-ink-secondary">No wallet connected</p>
      </div>
    );
  }

  const paymentEmpty = payment.data !== undefined && payment.data === 0n;
  const gasEmpty = gas.data !== undefined && gas.data.value === 0n;

  return (
    <div className="border-t border-edge-subtle px-3 py-3">
      <p className="t-caption text-ink-secondary">Test balances</p>

      <dl className="mt-2 space-y-1">
        {/* A read that failed shows a dash, never a skeleton that never
            resolves — a loader with no end reads as a hung interface. */}
        <BalanceRow
          label={symbol}
          empty={paymentEmpty}
          value={
            payment.data !== undefined
              ? formatMoney(payment.data, decimals)
              : payment.isError
                ? '—'
                : undefined
          }
        />
        <BalanceRow
          label="Gas"
          empty={gasEmpty}
          value={
            gas.data !== undefined
              ? `${formatAmount(gas.data.value, 18, 4)} ETH`
              : gas.isError
                ? '—'
                : undefined
          }
        />
      </dl>

      {paymentEmpty || gasEmpty ? (
        <Link
          to="/app/testnet"
          onClick={onNavigate}
          className="mt-1 inline-flex min-h-[24px] items-center text-body-sm font-medium text-accent hover:underline"
        >
          Top up this wallet
        </Link>
      ) : null}
    </div>
  );
}

/**
 * The value column keeps its width while the read is in flight, so the sidebar
 * footer does not reflow when the balances land.
 */
function BalanceRow({
  label,
  value,
  empty,
}: {
  label: string;
  value?: string;
  empty: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="min-w-0 truncate text-body-sm text-ink-secondary">{label}</dt>
      {/* A truncated balance is a wrong balance, so the value never clips: the
          label gives way instead, and the minimum width holds the skeleton's
          geometry so nothing shifts when the read lands. */}
      <dd className="min-w-[7ch] shrink-0 text-right">
        {value === undefined ? (
          <Skeleton className="ml-auto h-4 w-full rounded" />
        ) : (
          <span
            className={cn('block text-body-sm tabular-nums', empty ? 'text-warning' : 'text-ink')}
          >
            {value}
          </span>
        )}
      </dd>
    </div>
  );
}
