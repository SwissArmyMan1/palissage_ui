import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WagmiContext, useAccount } from 'wagmi';
import { cn } from '@/lib/cn';
import { useLocale } from '@/lib/i18n/context';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { CHAIN_LABEL } from '@/chain/config';
import { useTestMode } from '@/chain/roles';
import type { RoleKey } from '@/chain/roles';
import { useTour } from '../context';
import type { TourId, TourMode } from '../engine/types';
import { CATALOGUE } from '../tours/catalogue';

/**
 * Opens from an explicit control only — never on load.
 *
 * Two decisions in one dialog: which cabinet, and whether this is a rehearsal
 * or the real thing. Live is offered only when it would actually work: a wallet
 * is connected and the gateway's public window is open. When it is not, the
 * reason shown is the true one.
 */
export default function TourLauncher({ role }: { role: RoleKey | null }) {
  const { t } = useLocale();
  const { closeLauncher, start } = useTour();
  const navigate = useNavigate();

  /**
   * The launcher opens from the public site as well as from a cabinet, and the
   * chain providers are a lazy layout route — on `/how-it-works` there is no
   * `WagmiProvider` above this component at all. Reading the live-mode
   * conditions has to be gated on that, or the dialog throws on a marketing
   * page. `WagmiContext` is the honest test; a try/catch around a hook is not.
   */
  const chainReady = useContext(WagmiContext) != null;

  const preferred = CATALOGUE.find((entry) => entry.role === role) ?? CATALOGUE[1];
  const [chosen, setChosen] = useState<TourId>(preferred.id);
  const [mode, setMode] = useState<TourMode>('sim');

  const selected = CATALOGUE.find((entry) => entry.id === chosen) ?? preferred;

  return (
    <Dialog
      open
      onClose={closeLauncher}
      size="lg"
      title={t('Show me how this works')}
      description={t(
        'Pick a cabinet. The tour points at the real controls and waits while you press them.',
      )}
      footer={
        <>
          <Button kind="secondary" onClick={closeLauncher}>
            {t('Not now')}
          </Button>
          <Button
            onClick={() => {
              if (mode === 'live') navigate(selected.route);
              start(selected.id, mode);
            }}
          >
            {t('Start the tour')}
          </Button>
        </>
      }
    >
      <fieldset className="mt-1">
        <legend className="t-caption text-ink-secondary">{t('How it runs')}</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <ModeOption
            selected={mode === 'sim'}
            onSelect={() => setMode('sim')}
            label={t('Simulation')}
            note={t('No wallet. The data is invented and nothing is sent.')}
          />
          {chainReady ? (
            <LiveMode selected={mode === 'live'} onSelect={() => setMode('live')} />
          ) : (
            <ModeOption
              selected={false}
              disabled
              onSelect={() => {}}
              label={t('Live')}
              note={t('Open a cabinet first — the live tour needs a wallet and the read model.')}
            />
          )}
        </div>
      </fieldset>

      <fieldset className="mt-6">
        <legend className="t-caption text-ink-secondary">{t('Which cabinet')}</legend>
        <div className="mt-3 space-y-2">
          {CATALOGUE.map((entry) => (
            <button
              key={entry.id}
              type="button"
              aria-pressed={chosen === entry.id}
              onClick={() => setChosen(entry.id)}
              className={cn(
                'flex w-full items-center gap-4 rounded-md border p-3 text-left transition-colors duration-fast ease-out',
                chosen === entry.id
                  ? 'border-accent bg-accent-subtle'
                  : 'border-edge-subtle hover:bg-surface-sunken',
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-body-sm font-semibold text-ink">{t(entry.title)}</span>
                <span className="block text-caption normal-case tracking-normal text-ink-secondary">
                  {t(entry.purpose)}
                </span>
              </span>
              <span className="shrink-0 text-caption normal-case tracking-normal text-ink-secondary">
                {t('{count} steps', { count: entry.steps })}
              </span>
            </button>
          ))}
        </div>
      </fieldset>
    </Dialog>
  );
}

/**
 * Split out so the wagmi hooks only run where a `WagmiProvider` exists. A
 * conditional hook would be the other way to write this, and it would be wrong.
 */
function LiveMode({ selected, onSelect }: { selected: boolean; onSelect: () => void }) {
  const { t } = useLocale();
  const { isConnected } = useAccount();
  const testMode = useTestMode();

  const blocked = !isConnected
    ? t('Connect a wallet to run the tour against the real deployment.')
    : !testMode
      ? t('The gateway’s public window is closed right now, so roles cannot be self-assigned.')
      : null;

  return (
    <ModeOption
      selected={selected}
      disabled={Boolean(blocked)}
      onSelect={() => !blocked && onSelect()}
      label={t('Live')}
      note={blocked ?? t('Your wallet on {chain}. Real transactions.', { chain: CHAIN_LABEL })}
    />
  );
}

function ModeOption({
  label,
  note,
  selected,
  disabled,
  onSelect,
}: {
  label: string;
  note: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'rounded-md border p-3 text-left transition-colors duration-fast ease-out',
        selected ? 'border-accent bg-accent-subtle' : 'border-edge-subtle',
        disabled ? 'cursor-not-allowed opacity-70' : 'hover:bg-surface-sunken',
      )}
    >
      <span
        className={cn('block text-body-sm font-semibold', selected ? 'text-accent' : 'text-ink')}
      >
        {label}
      </span>
      <span className="mt-0.5 block text-caption normal-case tracking-normal text-ink-secondary">
        {note}
      </span>
    </button>
  );
}
