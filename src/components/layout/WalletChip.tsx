import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { LogOut, Wallet } from 'lucide-react';
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
      <span className="flex shrink-0 items-center gap-2">
        <Button
          size="sm"
          kind="secondary"
          pending={isPending}
          aria-label="Connect wallet"
          // Connecting does not ask for the chain: wagmi treats a declined
          // network prompt as a failed connection, which leaves the reader with
          // nothing. ChainGuard switches straight after, and the write path
          // switches again at the moment it matters.
          onClick={() => injectedConnector && connect({ connector: injectedConnector })}
        >
          <Wallet aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
          {/* The label is dropped below 640 px so the bar cannot overflow; the
              icon keeps its accessible name. */}
          <span className="hidden sm:inline">Connect wallet</span>
        </Button>
        {hasWalletConnect ? (
          <Button
            size="sm"
            kind="ghost"
            className="hidden sm:inline-flex"
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
      <Button
        size="sm"
        kind="danger"
        className="shrink-0"
        onClick={() => switchChain({ chainId: CHAIN_ID })}
      >
        {/* Two whole labels rather than one split across flex items, which
            put a gap in the middle of the sentence. */}
        <span className="sm:hidden">Switch network</span>
        <span className="hidden sm:inline">Switch to {CHAIN_LABEL}</span>
      </Button>
    );
  }

  return (
    <span className="flex shrink-0 items-center gap-2">
      <span className="min-h-[34px] rounded-md border border-edge-subtle bg-surface-sunken px-3 py-1.5 text-body-sm tabular-nums">
        {truncateAddress(address)}
      </span>
      {/* Leaving has to be as visible as arriving. The label drops below
          640 px, where the drawer carries the same control. */}
      <Button
        size="sm"
        kind="ghost"
        aria-label="Disconnect this wallet"
        onClick={() => disconnect()}
      >
        <LogOut aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
        <span className="hidden sm:inline">Disconnect</span>
      </Button>
    </span>
  );
}
