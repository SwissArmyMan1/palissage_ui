import { cn } from '@/lib/cn';
import { CHAIN_LABEL } from '@/chain/config';
import { MODE_MARKERS } from '@/lib/content/copy';

/**
 * Permanent, not dismissible (doc 07 §1). The Base blue is used here and on the
 * /network page only — it is a fact about the deployment, not a brand accent.
 */
export function NetworkChip({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full bg-chain-subtle px-3 py-1 text-body-sm text-info',
        className,
      )}
    >
      <span aria-hidden className="size-2 rounded-full bg-chain" />
      <span className="sr-only">Network: </span>
      {MODE_MARKERS.testnet}
      <span className="sr-only"> — {CHAIN_LABEL}</span>
    </span>
  );
}
