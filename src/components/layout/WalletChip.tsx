import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { LogOut, Wallet } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { truncateAddress } from '@/lib/format';
import { CHAIN_ID, CHAIN_LABEL } from '@/chain/config';
import { hasWalletConnect, walletConnectConnector } from '@/chain/wagmi';

/**
 * Wallet connection lives inside /app, never in the public header.
 *
 * `layout` is about the space available, not the viewport. The top bar is a
 * fixed 56 px row that a second button would overflow on a phone, so there it
 * stays compact. Everywhere else — the connect prompt, the role screen, the
 * readiness screen, the drawer — both ways in are offered at every width.
 *
 * That distinction matters: hiding WalletConnect below 640 px removed the only
 * route into a wallet for someone on a phone, where there is no extension to
 * inject and the wallet lives in another app.
 */
export function WalletChip({ layout = 'bar' }: { layout?: 'bar' | 'prompt' }) {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const prompt = layout === 'prompt';

  if (!isConnected) {
    const injectedConnector = connectors[0];
    return (
      <span
        className={cn(
          'flex items-center gap-2',
          prompt ? 'flex-wrap justify-center' : 'shrink-0',
        )}
      >
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
          {/* In the bar the label is dropped below 640 px so it cannot
              overflow; the icon keeps its accessible name. */}
          <span className={prompt ? 'inline' : 'hidden sm:inline'}>Connect wallet</span>
        </Button>
        {hasWalletConnect ? (
          <Button
            size="sm"
            kind="ghost"
            className={prompt ? undefined : 'hidden sm:inline-flex'}
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
