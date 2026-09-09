import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { truncateAddress } from '@/lib/format';
import { CHAIN_ID, CHAIN_LABEL } from '@/chain/config';
import { hasWalletConnect, walletConnectConnector } from '@/chain/wagmi';

/** Wallet connection lives inside /app, never in the public header. */
export function WalletChip() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  if (!isConnected) {
    const injectedConnector = connectors[0];
    return (
      <span className="flex items-center gap-2">
        <Button
          size="sm"
          kind="secondary"
          pending={isPending}
          onClick={() => injectedConnector && connect({ connector: injectedConnector })}
        >
          <Wallet aria-hidden className="size-4" strokeWidth={1.75} />
          Connect wallet
        </Button>
        {hasWalletConnect ? (
          <Button
            size="sm"
            kind="ghost"
            onClick={async () => connect({ connector: await walletConnectConnector() })}
          >
            Use a phone
          </Button>
        ) : null}
      </span>
    );
  }

  if (chainId !== CHAIN_ID) {
    return (
      <Button size="sm" kind="danger" onClick={() => switchChain({ chainId: CHAIN_ID })}>
        Switch to {CHAIN_LABEL}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => disconnect()}
      title="Disconnect"
      className="min-h-[34px] rounded-md border border-edge-subtle bg-surface-sunken px-3 text-body-sm tabular-nums"
    >
      {truncateAddress(address)}
    </button>
  );
}
