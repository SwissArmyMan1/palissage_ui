import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { BrandMark } from '@/components/ui/Logo';
import { LinkButton } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { EmptyState } from '@/components/ui/EmptyState';
import { LotThumb } from '@/components/ui/LotThumb';
import { NetworkChip } from '@/components/ui/NetworkChip';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ConnectPrompt } from '@/components/layout/ConnectPrompt';
import { WalletChip } from '@/components/layout/WalletChip';
import { useAllLots, useMyParticipant, usePositions } from '@/chain/lens';
import { formatCount } from '@/lib/format';
import { productionStage } from '@/lib/enums';
import type { LotView, PositionView } from '@/chain/types';

/**
 * COL-01. The collector surface.
 *
 * Deliberately **not** `AppShell`. The `Sidebar navigation` entry's own veto is
 * "fewer than 4 destinations — a sidebar for three links wastes a third of the
 * viewport", and this cabinet has exactly one. So it runs as a single-column
 * page with a slim bar, closer to the passport than to the winery cabinet, and
 * it is designed for a phone first because that is where a bottle gets scanned.
 *
 * The honest part matters more than the layout. A collector wallet holds the
 * KYC claim and nothing else, and both markets require `TOPIC_B2B_BUYER`, so
 * this wallet can read a passport and hold bottles transferred to it but cannot
 * buy. Saying that plainly is better than a Buy button that always reverts.
 */
export default function CollectorShelf() {
  const { address, isConnected } = useAccount();
  const lots = useAllLots();
  const participant = useMyParticipant();
  const ids = useMemo(() => lots.items.map((lot) => lot.id), [lots.items]);
  const positions = usePositions(address, ids);

  const holdings = useMemo(() => {
    const byId = new Map(lots.items.map((lot) => [String(lot.id), lot]));
    return positions.items
      .filter((position) => position.balance > 0n)
      .map((position) => ({ position, lot: byId.get(String(position.lotId)) }))
      .filter((row): row is { position: PositionView; lot: LotView } => row.lot !== undefined);
  }, [positions.items, lots.items]);

  const loading = isConnected && (!lots.hasData || !positions.hasData);

  return (
    <div className="min-h-dvh bg-page">
      <a href="#shelf-main" className="skip-link text-body-sm font-medium">
        Skip to your shelf
      </a>

      <header className="sticky top-0 z-40 flex h-[var(--topbar-h)] items-center gap-3 border-b border-edge-subtle bg-surface px-4">
        <Link to="/" aria-label="Palissage home" className="shrink-0">
          <BrandMark size={22} />
        </Link>
        <h1 className="t-h3 truncate">Shelf</h1>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <NetworkChip className="hidden sm:inline-flex" />
          <ThemeToggle />
          <WalletChip />
        </div>
      </header>

      <main
        id="shelf-main"
        tabIndex={-1}
        className="mx-auto w-full max-w-[720px] px-4 py-8 outline-none md:py-12"
      >
        <p className="max-w-reading text-body text-ink-secondary">
          Every bottle this wallet holds, and the record behind it. A passport reads without a
          wallet at all — this page is the shelf that wallet keeps.
        </p>

        {!isConnected ? (
          <ConnectPrompt what="the bottles on your shelf" className="mt-8" />
        ) : loading ? (
          <div className="mt-8">
            <SkeletonRows count={2} label="Reading your shelf…" />
          </div>
        ) : holdings.length === 0 ? (
          <EmptyState
            className="mt-8"
            title="Nothing on your shelf yet."
            body="Bottles appear here once they are held by this wallet. Until then the lot records are open to read — every one of them, without connecting anything."
            action={{ label: 'Read the lots', to: '/lots' }}
          />
        ) : (
          <ul className="mt-8 space-y-4">
            {holdings.map(({ lot, position }) => (
              <li key={String(lot.id)} className="card flex flex-wrap items-center gap-4 p-4">
                <LotThumb lotId={lot.id} size={56} />
                <div className="min-w-0 flex-1">
                  <p className="text-body font-medium">{lot.name}</p>
                  <p className="text-body-sm text-ink-secondary tabular-nums">
                    {formatCount(position.balance)}{' '}
                    {position.balance === 1n ? 'bottle' : 'bottles'} &middot; {lot.vintage} &middot;{' '}
                    {lot.region}
                  </p>
                  <p className="mt-1 text-body-sm text-ink-secondary">
                    {productionStage(lot.production)}
                    {position.frozen > 0n
                      ? ` · ${formatCount(position.frozen)} frozen by an operator`
                      : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <LinkButton to={`/p/${lot.id}`} size="sm" kind="secondary">
                    Passport
                  </LinkButton>
                  <LinkButton to={`/lots/${lot.id}`} size="sm" kind="ghost">
                    The lot
                  </LinkButton>
                </div>
              </li>
            ))}
          </ul>
        )}

        <Callout tone="info" title="What a collector wallet can do" className="mt-10 max-w-none">
          <p>
            Reading a lot record, opening a passport and holding bottles need no claim at all.
            Buying does: both the primary and the secondary market require the B2B buyer claim,
            so a collector wallet cannot reserve or purchase on this deployment. That is the
            contracts&rsquo; rule, not a setting on this page.
          </p>
          {isConnected && participant.data && !participant.data.canReceive ? (
            <p className="mt-3">
              This wallet also cannot receive bottles yet — the registry has not verified it. Take
              the Collector role on the readiness screen to have the KYC claim issued.
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <LinkButton to="/app" size="sm" kind="secondary">
              Every cabinet
            </LinkButton>
            <LinkButton to="/app/testnet" size="sm" kind="ghost">
              Readiness checks
            </LinkButton>
          </div>
        </Callout>
      </main>
    </div>
  );
}
