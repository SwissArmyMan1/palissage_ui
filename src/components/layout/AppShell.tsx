import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ChevronDown, Compass, Info, Menu, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { BrandMark } from '@/components/ui/Logo';
import { NetworkChip } from '@/components/ui/NetworkChip';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { NAV, ROLE_BASE, ROLE_TITLE, navHref, type CabinetRoleKey } from '@/lib/nav';
import { WalletChip } from './WalletChip';
import { WalletBalance } from './WalletBalance';
import { useRoleOffers, type RoleKey } from '@/chain/roles';
import { useProtocol } from '@/chain/lens';
import { SimulationBar } from '@/sandbox/SimulationBar';
import { Beacon, onDrawerRequest, useTour } from '@/tour';

/**
 * `App shell` — a layout route, so the chrome does not remount on navigation.
 * The grid areas are fixed and the sidebar width is reserved before nav data
 * resolves, so nothing shifts (doc 02 §6).
 *
 * The organisation switcher in the top bar is the role switcher. It lists only
 * the roles this wallet actually holds, read from the gateway and the claims.
 */
export function AppShell({ role, orgName }: { role: CabinetRoleKey; orgName?: string }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const items = NAV[role];
  // A tour step that points at a sidebar item has to open the drawer first,
  // because below `lg` there is no sidebar to point at.
  useEffect(() => onDrawerRequest(setDrawerOpen), []);
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
        // The simulation bar is a grid row, never an overlay: it must not cover
        // the top bar, and the dvh grid has to account for its height. With no
        // simulation running the row has no content and collapses to zero.
        gridTemplateAreas: '"simbar simbar" "topbar topbar" "sidenav content"',
        gridTemplateColumns: 'var(--sidenav-w) 1fr',
        gridTemplateRows: 'auto var(--topbar-h) 1fr',
      }}
    >
      <a href="#app-main" className="skip-link text-body-sm font-medium">
        Skip to the main content
      </a>

      <div style={{ gridArea: 'simbar' }}>
        <SimulationBar />
      </div>

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

        <div data-tour="shell-wallet" className="ml-auto flex min-w-0 items-center gap-2">
          <NetworkChip className="hidden sm:inline-flex" />
          <HelpMenu />
          <ThemeToggle className="hidden sm:grid" />
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
            <div className="space-y-3 border-t border-edge-subtle p-3">
              {/* The controls the top bar cannot fit at 360 px live here. */}
              <div className="flex items-center justify-between gap-3">
                <NetworkChip />
                <ThemeToggle />
              </div>
              <WalletChip layout="prompt" />
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
            data-tour={item.tourTab}
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

function SidebarItems({ role, onNavigate }: { role: CabinetRoleKey; onNavigate?: () => void }) {
  return (
    <>
      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
        {NAV[role].map((item) => (
          <li key={item.to}>
            <NavLink
              to={navHref(role, item)}
              end={item.end}
              data-tour={item.tour}
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

/**
 * Help, and the way into a tour.
 *
 * The beacon marks it only while a tour for this cabinet exists and has never
 * been started or dismissed — an always-on dot stops being a signal within one
 * session. The offer also exists as plain text in the menu, because a pulsing
 * dot is not an affordance for a screen-reader reader.
 */
function HelpMenu() {
  const [open, setOpen] = useState(false);
  const { openLauncher, showBeacon, dismissOffer } = useTour();

  return (
    <div className="relative">
      <button
        type="button"
        data-tour="shell-help"
        aria-label="Help and guided tours"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => {
          setOpen((value) => !value);
          dismissOffer();
        }}
        className="relative grid size-9 place-items-center rounded-md text-ink-secondary hover:bg-surface-sunken hover:text-ink"
      >
        <Info aria-hidden className="size-4" strokeWidth={1.75} />
        <Beacon show={showBeacon} />
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="menu"
            className="absolute right-0 top-full z-20 mt-2 w-64 rounded-lg border border-edge-subtle bg-surface-overlay p-2 shadow-2"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                openLauncher();
              }}
              className="flex w-full items-start gap-3 rounded-md p-2 text-left hover:bg-surface-sunken"
            >
              <Compass aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={1.75} />
              <span>
                <span className="block text-body-sm font-medium text-ink">Show me how this works</span>
                <span className="block text-caption normal-case tracking-normal text-ink-secondary">
                  A step-by-step walk through this cabinet.
                </span>
              </span>
            </button>
            <Link
              role="menuitem"
              to="/how-it-works"
              onClick={() => setOpen(false)}
              className="mt-1 block rounded-md p-2 text-body-sm text-ink-secondary hover:bg-surface-sunken hover:text-ink"
            >
              Read how Palissage works
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}

function RoleSwitcher({ role, orgName }: { role: RoleKey; orgName?: string }) {
  const [open, setOpen] = useState(false);
  const { offers } = useRoleOffers();
  const location = useLocation();

  /*
   * `flex-1 min-w-0` is what makes the bar fit a 320 px phone. Everything else
   * in the row is a fixed-size control, so the switcher has to be the elastic
   * one — without it the row could not shrink, the right-hand group was laid
   * over the switcher, and the help button's beacon painted on top of the role
   * name.
   */
  return (
    <div className="relative min-w-[4rem] flex-1">
      <button
        type="button"
        data-tour="shell-role-switcher"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-[34px] w-full min-w-0 max-w-[220px] items-center gap-2 rounded-md border border-edge-subtle bg-surface-sunken px-3 text-body-sm"
      >
        {/* `min-w-0` on the label too: a flex item defaults to `min-width: auto`,
            which is why the button kept its full text width and overflowed the
            bar no matter how far its container was told to shrink. */}
        <span className="min-w-0 truncate">{orgName ?? ROLE_TITLE[role]}</span>
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
