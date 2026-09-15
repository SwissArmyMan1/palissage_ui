import { useNavigate } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';
import { useLocale } from '@/lib/i18n/context';
import { CHAIN_LABEL } from '@/chain/config';
import { endSimulation } from './index';
import { useSandbox } from './store';

/**
 * The standing statement that the numbers on screen are invented.
 *
 * It is a row in the layout, not an overlay, and it has no close button. Fake
 * money in a financial interface is only acceptable while the interface is
 * saying so — a toast that expires, or a banner the reader can dismiss and then
 * forget, would not be saying so for long.
 */
export function SimulationBar() {
  const sandbox = useSandbox();
  const navigate = useNavigate();
  const { t } = useLocale();

  if (!sandbox) return null;

  return (
    <div
      data-tour="shell-simbar"
      role="status"
      className="flex min-h-[var(--simbar-h)] flex-wrap items-center gap-x-3 gap-y-1 border-b border-edge-subtle bg-warning-subtle px-4 py-1.5 text-caption normal-case tracking-normal text-ink"
    >
      <FlaskConical aria-hidden className="size-3.5 shrink-0 text-warning" strokeWidth={2} />
      {/* The statement is never abbreviated; only the reassurance after it is
          dropped on a narrow screen, where three wrapped lines of chrome would
          push the page it is describing off the top. */}
      <p className="min-w-0 flex-1">
        <span className="font-semibold">{t('Simulation')}</span>{' '}
        {t('— the data on this screen is invented and nothing is sent to {chain}.', {
          chain: CHAIN_LABEL,
        })}
        <span className="hidden sm:inline">
          {' '}
          {t('No wallet is involved and no asset is at risk.')}
        </span>
      </p>
      <button
        type="button"
        onClick={() => {
          void endSimulation().then(() => navigate('/demo'));
        }}
        className="shrink-0 rounded-sm font-semibold text-accent underline underline-offset-4 hover:text-accent-hover"
      >
        {t('Leave simulation')}
      </button>
    </div>
  );
}
