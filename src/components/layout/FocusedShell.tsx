import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BrandMark } from '@/components/ui/Logo';
import { NetworkChip } from '@/components/ui/NetworkChip';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SimulationBar } from '@/sandbox/SimulationBar';

/**
 * A single-purpose flow drops the sidebar and runs as a focused route — the
 * `App shell` entry's own veto covers checkout-shaped screens (doc 03). Reserve,
 * the create-lot wizard and the offer form use this.
 *
 * Cancelling returns to where the reader came from; it is never a dead end.
 */
export function FocusedShell({
  title,
  step,
  unsaved,
  onClose,
  children,
}: {
  title: string;
  step?: string;
  unsaved?: boolean;
  onClose?: () => void;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-page">
      <a href="#focused-main" className="skip-link text-body-sm font-medium">
        Skip to the main content
      </a>
      <SimulationBar />
      <header className="sticky top-0 z-40 flex h-[var(--topbar-h)] items-center gap-3 border-b border-edge-subtle bg-surface px-4">
        <BrandMark size={22} />
        <h1 className="t-h3 truncate">{title}</h1>
        {step ? <StatusBadge tone="neutral">{step}</StatusBadge> : null}
        <div className="ml-auto flex items-center gap-2">
          {unsaved ? <StatusBadge tone="warning">Unsaved changes</StatusBadge> : null}
          <NetworkChip className="hidden sm:inline-flex" />
          <button
            type="button"
            aria-label="Close and go back"
            onClick={() => (onClose ? onClose() : navigate(-1))}
            className="grid size-9 place-items-center rounded-md text-ink-secondary hover:bg-surface-sunken hover:text-ink"
          >
            <X aria-hidden className="size-5" strokeWidth={1.75} />
          </button>
        </div>
      </header>
      <main id="focused-main" tabIndex={-1} className="outline-none">
        {children}
      </main>
    </div>
  );
}
