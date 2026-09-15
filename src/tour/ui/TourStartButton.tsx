import { Compass } from 'lucide-react';
import { useLocale } from '@/lib/i18n/context';
import { Button } from '@/components/ui/Button';
import type { RoleKey } from '@/chain/roles';
import { useTour } from '../context';
import { Beacon } from './Beacon';

/**
 * The way in. It ships in the initial bundle — the engine, the card and every
 * step definition do not, and load only once this is pressed.
 */
export function TourStartButton({
  role = null,
  kind = 'primary',
  size = 'md',
  className,
  children,
}: {
  role?: RoleKey | null;
  kind?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
  className?: string;
  children?: React.ReactNode;
}) {
  const { t } = useLocale();
  const { openLauncher, showBeacon, dismissOffer } = useTour();

  return (
    <Button
      kind={kind}
      size={size}
      className={className}
      onClick={() => {
        dismissOffer();
        openLauncher(role);
      }}
    >
      <Compass aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
      {children ?? t('Show me how this works')}
      <Beacon show={showBeacon} />
    </Button>
  );
}
