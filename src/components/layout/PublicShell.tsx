import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useNavCondense } from '@/lib/motion';
import { Logo, BrandSeal, TrellisRule } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LinkButton } from '@/components/ui/Button';
import { LANDING } from '@/lib/content/copy';

/**
 * `Top navigation bar` — five destinations and one CTA. `Connect wallet` is
 * deliberately **not** here: the public site's job is comprehension, not
 * connection (doc 01 §4). Below 1024 px the links collapse into a sheet and the
 * CTA stays in the bar.
 */
const LINKS = [
  { to: '/for-wineries', label: 'For wineries' },
  { to: '/for-buyers', label: 'For buyers' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/lots', label: 'Lots' },
];

export function PublicShell() {
  const { sentinelRef, condensed } = useNavCondense();
  const location = useLocation();
  // The menu belongs to the route it was opened on, so navigating closes it
  // without an effect and without a cascading render.
  const [menu, setMenu] = useState({ open: false, path: location.pathname });
  const menuOpen = menu.open && menu.path === location.pathname;
  const setMenuOpen = (open: boolean) => setMenu({ open, path: location.pathname });

  return (
    <>
      <a href="#main" className="skip-link text-body-sm font-medium">
        Skip to the main content
      </a>
      <div ref={sentinelRef} aria-hidden className="h-px" />

      <header className="site-nav" data-condensed={condensed}>
        <div className="shell flex h-full items-center gap-6">
          <Logo size={condensed ? 22 : 26} />

          <nav aria-label="Main" className="hidden flex-1 justify-center gap-8 lg:flex">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'text-body-sm transition-colors duration-fast ease-out',
                    isActive ? 'font-medium text-ink' : 'text-ink-secondary hover:text-ink',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <LanguageToggle className="hidden sm:flex" />
            <ThemeToggle />
            <LinkButton to="/demo" size="sm" className="hidden sm:inline-flex">
              Try it on Base Sepolia
            </LinkButton>
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-controls="public-menu"
              onClick={() => setMenuOpen(!menuOpen)}
              className="grid size-9 place-items-center rounded-md text-ink lg:hidden"
            >
              <span className="sr-only">{menuOpen ? 'Close the menu' : 'Open the menu'}</span>
              {menuOpen ? (
                <X aria-hidden className="size-5" strokeWidth={1.75} />
              ) : (
                <Menu aria-hidden className="size-5" strokeWidth={1.75} />
              )}
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div
          id="public-menu"
          className="sticky top-[56px] z-30 border-b border-edge-subtle bg-surface lg:hidden"
        >
          <nav aria-label="Main, expanded" className="shell flex flex-col py-2">
            {LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="min-h-[48px] border-b border-edge-subtle py-3 text-body last:border-0"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex items-center gap-4 py-3">
              <LanguageToggle />
              <LinkButton to="/demo" size="sm" className="sm:hidden">
                Try it on Base Sepolia
              </LinkButton>
            </div>
          </nav>
        </div>
      ) : null}

      <main id="main" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>

      <footer className="border-t border-edge-subtle bg-surface-sunken">
        <div className="shell py-16">
          <div className="flex flex-col items-center gap-4 text-center">
            <BrandSeal />
            <p className="max-w-reading text-body-sm text-ink-secondary">{LANDING.footerMotto}</p>
          </div>
          <TrellisRule className="my-12" />
          <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-body-sm text-ink-secondary">
            <span>Prototype on a test network</span>
            <Link to="/network" className="hover:text-ink">
              On Base
            </Link>
            <Link to="/legal/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link to="/legal/terms" className="hover:text-ink">
              Terms
            </Link>
            <Link to="/legal/prototype-disclosure" className="hover:text-ink">
              Prototype disclosure
            </Link>
            <Link to="/legal/credits" className="hover:text-ink">
              Credits
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}

/**
 * EN/FR is present because the brief requires both locales before release. Only
 * English strings exist today, so the control says so rather than pretending.
 */
function LanguageToggle({ className }: { className?: string }) {
  return (
    <span className={cn('items-center gap-1 text-body-sm text-ink-secondary', className ?? 'flex')}>
      <span className="font-medium text-ink">EN</span>
      <span aria-hidden>/</span>
      <span title="French translation is in preparation" className="opacity-60">
        FR
      </span>
    </span>
  );
}
