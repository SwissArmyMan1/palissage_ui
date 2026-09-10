import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ChevronDown, Info, Menu, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { BrandMark } from '@/components/ui/Logo';
import { NetworkChip } from '@/components/ui/NetworkChip';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { NAV, ROLE_BASE, ROLE_TITLE, navHref } from '@/lib/nav';
import { WalletChip } from './WalletChip';
import { WalletBalance } from './WalletBalance';
import { useRoleOffers, type RoleKey } from '@/chain/roles';
import { useProtocol } from '@/chain/lens';

/**
 * `App shell` — a layout route, so the chrome does not remount on navigation.
 * The grid areas are fixed and the sidebar width is reserved before nav data
 * resolves, so nothing shifts (doc 02 §6).
 *
 * The organisation switcher in the top bar is the role switcher. It lists only
 * the roles this wallet actually holds, read from the gateway and the claims.
 */
export function AppShell({ role, orgName }: { role: RoleKey; orgName?: string }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const items = NAV[role];
  const tabs = items.filter((item) => item.tab).slice(0, 4);
  const protocol = useProtocol();

  return (
    <div
      /*
       * On a desktop this is a fixed frame, not a tall page: the grid is
       * exactly the viewport and the content region is the only scroller.
       * It used to be `min-h-dvh`, so the grid grew with its content and
       * `main` never scrolled — while `overscroll-behavior: contain` stopped
       * the wheel reaching the document. The page then only moved when the
       * pointer was over the sidebar. Below `lg` the document scrolls, as it
       * should on a phone.
       */
      className="app-shell min-h-dvh bg-page lg:grid lg:h-dvh lg:min-h-0 lg:overflow-hidden"
      style={{
        gridTemplateAreas: '"topbar topbar" "sidenav content"',
        gridTemplateColumns: 'var(--sidenav-w) 1fr',
        gridTemplateRows: 'var(--topbar-h) 1fr',
      }}
    >
      <a href="#app-main" className="skip-link text-body-sm font-medium">
        Skip to the main content
      </a>

      <header
        style={{ gridArea: 'topbar' }}
        className="sticky top-0 z-40 flex h-[var(--topbar-h)] items-center gap-3 border-b border-edge-subtle bg-surface px-4"
      >
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-expanded={drawerOpen}
          className="grid size-9 shrink-0 place-items-center rounded-md text-ink lg:hidden"
        >
          <span className="sr-only">Open the sections menu</span>
          <Menu aria-hidden className="size-5" strokeWidth={1.75} />
        </button>

        <Link to="/" aria-label="Palissage home" className="shrink-0">
          <BrandMark size={22} />
        </Link>

        <RoleSwitcher role={role} orgName={orgName} />

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <NetworkChip className="hidden sm:inline-flex" />
          <Link
            to="/how-it-works"
            aria-label="Help"
            title="Help"
            className="grid size-9 place-items-center rounded-md text-ink-secondary hover:bg-surface-sunken hover:text-ink"
          >
            <Info aria-hidden className="size-4" strokeWidth={1.75} />
          </Link>
          <ThemeToggle />
          <WalletChip />
        </div>

        {/* A block-triggered re-read is a refresh, not a load: the numbers stay
            and this 2 px line reports the read. */}
        {protocol.isFetching && !protocol.isLoading ? (
          <div className="read-progress" aria-hidden />
        ) : null}
      </header>

      {/* Desktop sidebar */}
      <nav
        aria-label="Sections"
        style={{ gridArea: 'sidenav' }}
        className="hidden border-r border-edge-subtle bg-surface lg:flex lg:flex-col lg:overflow-y-auto"
      >
        <SidebarItems role={role} />
      </nav>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="scrim" onClick={() => setDrawerOpen(false)} />
          <nav
            aria-label="Sections"
            className="absolute inset-y-0 left-0 flex w-[var(--sidenav-w)] flex-col bg-surface shadow-3"
          >
            <div className="flex h-[var(--topbar-h)] items-center justify-between px-4">
              <span className="t-caption text-ink-secondary">{ROLE_TITLE[role]}</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="grid size-9 place-items-center rounded-md"
              >
                <span className="sr-only">Close</span>
                <X aria-hidden className="size-5" strokeWidth={1.75} />
              </button>
            </div>
            <SidebarItems role={role} onNavigate={() => setDrawerOpen(false)} />
            <div className="border-t border-edge-subtle p-3">
              <WalletChip />
            </div>
          </nav>
        </div>
      ) : null}

      <main
        id="app-main"
        tabIndex={-1}
        style={{ gridArea: 'content' }}
        className="min-w-0 pb-24 outline-none lg:min-h-0 lg:overflow-y-auto lg:pb-0 lg:[overscroll-behavior:contain]"
      >
        <Outlet />
      </main>

      {/* Mobile bottom tab bar — co-equal destinations only, always labelled. */}
      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-edge-subtle bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {tabs.map((item) => (
          <NavLink
            key={item.to}
            to={navHref(role, item)}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-caption',
                isActive ? 'text-accent' : 'text-ink-secondary',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.Icon aria-hidden className="size-5" strokeWidth={isActive ? 2 : 1.5} />
                <span className="normal-case tracking-normal">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function SidebarItems({ role, onNavigate }: { role: RoleKey; onNavigate?: () => void }) {
  return (
    <>
      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
        {NAV[role].map((item) => (
          <li key={item.to}>
            <NavLink
              to={navHref(role, item)}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'relative flex min-h-[42px] items-center gap-3 rounded-md px-3 text-body-sm transition-colors duration-fast ease-out',
                  isActive
                    ? 'bg-surface-selected font-medium text-accent before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-accent'
                    : 'text-ink-secondary hover:bg-surface-sunken hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.Icon aria-hidden className="size-4 shrink-0" strokeWidth={isActive ? 2 : 1.5} />
                  {item.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>

      <WalletBalance onNavigate={onNavigate} />

      <ul className="space-y-1 border-t border-edge-subtle p-3">
        <li>
          <NavLink
            to={`${ROLE_BASE[role]}/account`}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex min-h-[42px] items-center gap-3 rounded-md px-3 text-body-sm',
                isActive ? 'font-medium text-accent' : 'text-ink-secondary hover:text-ink',
              )
            }
          >
            Account
          </NavLink>
        </li>
        <li>
          <Link
            to="/app/testnet"
            onClick={onNavigate}
            className="flex min-h-[42px] items-center gap-3 rounded-md px-3 text-body-sm text-ink-secondary hover:text-ink"
          >
            Readiness
          </Link>
        </li>
      </ul>
    </>
  );
}

function RoleSwitcher({ role, orgName }: { role: RoleKey; orgName?: string }) {
  const [open, setOpen] = useState(false);
  const { offers } = useRoleOffers();
  const location = useLocation();

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-[34px] max-w-[220px] items-center gap-2 rounded-md border border-edge-subtle bg-surface-sunken px-3 text-body-sm"
      >
        <span className="truncate">{orgName ?? ROLE_TITLE[role]}</span>
        <ChevronDown aria-hidden className="size-3.5 shrink-0" strokeWidth={1.75} />
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="menu"
            className="absolute left-0 top-full z-20 mt-2 w-72 rounded-lg border border-edge-subtle bg-surface-overlay p-2 shadow-2"
          >
            <p className="px-2 pb-2 t-caption text-ink-secondary">Switch cabinet</p>
            {offers.map((offer) => (
              <Link
                key={offer.key}
                role="menuitem"
                to={ROLE_BASE[offer.key]}
                state={{ from: location.pathname }}
                onClick={() => setOpen(false)}
                className={cn(
                  'block rounded-md px-2 py-2 text-body-sm hover:bg-surface-sunken',
                  offer.key === role && 'font-semibold',
                )}
              >
                <span className="block">{offer.title}</span>
                <span className="block text-caption normal-case tracking-normal text-ink-secondary">
                  {offer.qualified ? offer.purpose : 'Not qualified on this wallet'}
                </span>
              </Link>
            ))}
            <Link
              role="menuitem"
              to="/app"
              onClick={() => setOpen(false)}
              className="mt-1 block rounded-md px-2 py-2 text-body-sm text-accent hover:bg-accent-subtle"
            >
              See all roles and what they need
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
