import { useLocale } from '@/lib/i18n/context';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { Suspense, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useNavCondense } from '@/lib/motion';
import { Logo, BrandSeal, TrellisRule } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LinkButton } from '@/components/ui/Button';
import { LANDING } from '@/lib/content/copy';
import { PublicRoute } from './PublicRoute';
import { EmailLink, XLink } from '@/components/ui/ContactLinks';

/**
 * `Top navigation bar` — five destinations and one CTA. `Connect wallet` is
 * deliberately **not** here: the public site's job is comprehension, not
 * connection (doc 01 §4). Below 1280 px the links collapse into a sheet and the
 * CTA stays in the bar.
 */
const LINKS = [
  { to: '/for-wineries', label: 'For wineries' },
  { to: '/for-buyers', label: 'For buyers' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/lots', label: 'Lots' },
  { to: '/contacts', label: 'Contacts' },
];

export function PublicShell() {
  const { t } = useLocale();
  const { sentinelRef, condensed } = useNavCondense();
  const location = useLocation();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  // The menu belongs to the route it was opened on, so navigating closes it
  // without an effect and without a cascading render.
  const [menu, setMenu] = useState({ open: false, path: location.pathname });
  const menuOpen = menu.open && menu.path === location.pathname;
  const setMenuOpen = (open: boolean) => setMenu({ open, path: location.pathname });

  return (
    <div className="public-site">
      <a href="#main" className="skip-link text-body-sm font-medium">
        {t('Skip to the main content')}
      </a>
      <div ref={sentinelRef} aria-hidden className="h-px" />

      <header className="site-nav" data-condensed={condensed}>
        <div className="shell flex h-full items-center gap-6">
          <Logo />

          <nav aria-label={t('Main')} className="hidden flex-1 justify-center gap-6 xl:flex">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'public-nav-link text-body-sm transition-colors duration-fast ease-out',
                    isActive ? 'font-medium text-ink' : 'text-ink-secondary hover:text-ink',
                  )
                }
              >
                {t(link.label)}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <LanguageToggle className="hidden sm:flex" />
            <ThemeToggle />
            <LinkButton to="/demo" size="sm" className="hidden sm:inline-flex">
              {t('Try it on Base Sepolia')}
            </LinkButton>
            <button
              ref={menuButtonRef}
              type="button"
              aria-expanded={menuOpen}
              aria-controls="public-menu"
              onClick={() => setMenuOpen(!menuOpen)}
              className="grid size-9 place-items-center rounded-md text-ink xl:hidden"
            >
              <span className="sr-only">{menuOpen ? t('Close the menu') : t('Open the menu')}</span>
              {menuOpen ? (
                <X aria-hidden className="size-5" strokeWidth={1.75} />
              ) : (
                <Menu aria-hidden className="size-5" strokeWidth={1.75} />
              )}
            </button>
          </div>
        </div>
        <div className="reading-progress" aria-hidden="true" />
      </header>

      {menuOpen ? (
        <div
          id="public-menu"
          className="public-menu sticky z-30 border-b border-edge-subtle bg-surface xl:hidden"
          style={{ top: condensed ? 56 : 'var(--publicnav-h)' }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setMenuOpen(false);
              menuButtonRef.current?.focus();
            }
          }}
        >
          <nav aria-label={t('Main, expanded')} className="shell flex flex-col py-2">
            {LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="min-h-[48px] border-b border-edge-subtle py-3 text-body last:border-0"
              >
                {t(link.label)}
              </Link>
            ))}
            <div className="flex items-center gap-4 py-3">
              <LanguageToggle />
              <LinkButton to="/demo" size="sm" className="sm:hidden">
                {t('Try it on Base Sepolia')}
              </LinkButton>
            </div>
          </nav>
        </div>
      ) : null}

      <PublicRoute>
        <Suspense
          fallback={
            <div className="shell py-24" role="status">
              {t('Loading the next page…')}
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </PublicRoute>

      <footer className="public-footer border-t border-edge-subtle bg-surface-sunken">
        <div className="shell py-16">
          <div className="flex flex-col items-center gap-4 text-center">
            <BrandSeal />
            <p className="max-w-reading text-body-sm text-ink-secondary">
              {t(LANDING.footerMotto)}
            </p>
          </div>
          <TrellisRule className="my-12" />
          <nav
            aria-label={t('Footer')}
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-body-sm text-ink-secondary"
          >
            <span>{t('Prototype on a test network')}</span>
            <Link to="/network" className="hover:text-ink">
              {t('On Base')}
            </Link>
            <Link to="/legal/privacy" className="hover:text-ink">
              {t('Privacy')}
            </Link>
            <Link to="/legal/terms" className="hover:text-ink">
              {t('Terms')}
            </Link>
            <Link to="/legal/prototype-disclosure" className="hover:text-ink">
              {t('Prototype disclosure')}
            </Link>
            <Link to="/legal/credits" className="hover:text-ink">
              {t('Credits')}
            </Link>
          </nav>
          <div
            role="group"
            aria-label={t('Contact Palissage')}
            className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 border-t border-edge-subtle pt-6 text-body-sm"
          >
            <EmailLink />
            <XLink />
          </div>
        </div>
      </footer>
    </div>
  );
}
