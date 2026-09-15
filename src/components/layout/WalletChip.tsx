import { useEffect, useState } from 'react';
import type { Connector } from 'wagmi';
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
/**
 * Is there an extension to talk to at all?
 *
 * On a phone browser there is no injected provider, so the injected connector
 * has nothing to connect to and pressing its button does nothing whatsoever —
 * which is exactly how it behaved in production. Some wallets inject late, so
 * the answer is re-checked once after a beat rather than decided on the first
 * frame. `null` means "not known yet", and while it is null the button is
 * offered, because refusing a wallet that is merely slow is worse.
 */
function useInjectedProvider(connector?: Connector): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (!connector) return;
    let cancelled = false;
    const check = async () => {
      try {
        const provider = await connector.getProvider();
        if (!cancelled) setAvailable(Boolean(provider));
      } catch {
        if (!cancelled) setAvailable(false);
      }
    };
    void check();
    const retry = window.setTimeout(() => void check(), 900);
    return () => {
      cancelled = true;
      window.clearTimeout(retry);
    };
  }, [connector]);

  return available;
}

export function WalletChip({ layout = 'bar' }: { layout?: 'bar' | 'prompt' }) {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const prompt = layout === 'prompt';
  const injectedConnector = connectors[0];
  const injectedAvailable = useInjectedProvider(injectedConnector);

  if (!isConnected) {
    /**
     * With no extension in this browser, WalletConnect is not the alternative —
     * it is the only way in, so it is the primary button and carries the plain
     * label. Offering "Connect wallet" that cannot connect is worse than
     * offering nothing.
     */
    if (injectedAvailable === false && hasWalletConnect) {
      return (
        <span
          className={cn('flex items-center gap-2', prompt ? 'flex-wrap justify-center' : 'min-w-0')}
        >
          <Button
            size="sm"
            pending={isPending}
            onClick={async () => connect({ connector: await walletConnectConnector() })}
          >
            <Wallet aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
            <span className={prompt ? 'inline' : 'hidden sm:inline'}>Connect wallet</span>
          </Button>
          {prompt ? (
            <span className="w-full text-caption normal-case tracking-normal text-ink-secondary">
              No wallet extension in this browser, so this opens your wallet app.
            </span>
          ) : null}
        </span>
      );
    }

    // No extension and no WalletConnect id configured: there is nothing that
    // could connect. Say so rather than offering a button that does nothing.
    const dead = injectedAvailable === false && !hasWalletConnect;

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
          disabled={dead}
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
        {dead && prompt ? (
          <span className="w-full text-caption normal-case tracking-normal text-ink-secondary">
            No wallet extension was found in this browser.
          </span>
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
    <span className={cn('flex items-center gap-2', prompt ? 'flex-wrap justify-center' : 'min-w-0')}>
      <span
        className={cn(
          'min-h-[34px] truncate rounded-md border border-edge-subtle bg-surface-sunken px-3 py-1.5 text-body-sm tabular-nums',
          !prompt && 'min-w-0',
        )}
      >
        {truncateAddress(address)}
      </span>
      {/*
        Leaving has to be as visible as arriving — but not at the cost of the
        bar. At 360 px the row was overflowing and the role switcher was
        painting on top of the help button, so below `sm` the bar keeps the
        address only and the drawer carries the action at full width.
      */}
      <Button
        size="sm"
        kind="ghost"
        className={prompt ? undefined : 'hidden shrink-0 sm:inline-flex'}
        aria-label="Disconnect this wallet"
        onClick={() => disconnect()}
      >
        <LogOut aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
        <span className={prompt ? 'inline' : 'hidden sm:inline'}>Disconnect</span>
      </Button>
    </span>
  );
}
