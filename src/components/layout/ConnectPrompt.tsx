import { cn } from '@/lib/cn';
import { LinkButton } from '@/components/ui/Button';
import { WalletChip } from './WalletChip';

/** ST-A. The screen is preserved; connecting does not submit anything. */
export function ConnectPrompt({ what, className }: { what: string; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-dashed border-edge-strong p-8 text-center', className)}>
      <h2 className="t-h3">Connect a wallet to see {what}</h2>
      <p className="mx-auto mt-2 max-w-reading text-body-sm text-ink-secondary">
        This screen reads records that belong to one wallet, so there is nothing to show until a
        wallet is connected. Connecting submits nothing.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <WalletChip />
        <LinkButton to="/lots" kind="ghost" size="sm">
          Browse the catalogue instead
        </LinkButton>
      </div>
    </div>
  );
}
