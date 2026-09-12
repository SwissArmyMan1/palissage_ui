import { useLocale } from '@/lib/i18n/context';
import type { Translate } from '@/lib/i18n/context';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { LinkButton } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { Plate } from '@/components/ui/Plate';
import { Section } from '@/components/layout/Section';
import { TrellisLifecycle } from '@/components/patterns/TrellisLifecycle';
import { ASSETS } from '@/lib/content/assets';
import { FOR_BUYERS, FOR_WINERIES, HOW_IT_WORKS, PILOT } from '@/lib/content/copy';
import { NotFound } from './NotFound';
import { EmailLink } from '@/components/ui/ContactLinks';

/** PUB-06. Copy is fixed in doc 07 §6; the layout is the content template. */
export function ForWineries() {
  const { t } = useLocale();
  return (
    <>
      <section className="bg-page py-12 md:py-16">
        <div className="shell grid items-center gap-12 lg:grid-cols-2">
          <div className="max-w-reading">
            <p className="t-caption text-accent">{t('For wineries')}</p>
            <h1 className="mt-4 t-display text-[clamp(2rem,1.4rem+2.4vw,3.25rem)]">
              {t(FOR_WINERIES.title)}
            </h1>
            <p className="mt-6 text-body text-ink-secondary">{t(FOR_WINERIES.lede)}</p>
            <LinkButton to="/pilot" className="mt-8">
              {t('Talk to us about the pilot')}
            </LinkButton>
          </div>
          <Plate
            asset={ASSETS.heroEstate}
            alt={t('Vineyard rows trained on a trellis in the Cabardès')}
            ratio="4 / 3"
            sizes="(min-width: 1024px) 560px, 92vw"
            priority
            drift
          />
        </div>
      </section>

      <Section tone="surface" labelledBy="wineries-steps">
        <h2 id="wineries-steps" className="t-h1">
          {t('What the platform does for you')}
        </h2>
        <ol className="reveal-stagger mt-12 space-y-8">
          {FOR_WINERIES.steps.map((step, index) => (
            <li key={step.title} className="flex gap-6">
              <span
                aria-hidden
                className="grid size-8 shrink-0 place-items-center rounded-full border border-edge-strong text-body-sm font-semibold tabular-nums"
              >
                {index + 1}
              </span>
              <div className="min-w-0 max-w-reading">
                <h3 className="text-body font-semibold">{t(step.title)}</h3>
                <p className="mt-1 text-body text-ink-secondary">{t(step.body)}</p>
              </div>
            </li>
          ))}
        </ol>
        <Callout tone="info" className="mt-12 max-w-reading">
          {t(FOR_WINERIES.closing)}
        </Callout>
      </Section>
    </>
  );
}

/** PUB-07. */
export function ForBuyers() {
  const { t } = useLocale();
  return (
    <>
      <section className="bg-page py-12 md:py-16">
        <div className="shell max-w-reading">
          <p className="t-caption text-accent">{t('For shops and importers')}</p>
          <h1 className="mt-4 t-display text-[clamp(2rem,1.4rem+2.4vw,3.25rem)]">
            {t(FOR_BUYERS.title)}
          </h1>
          <p className="mt-6 text-body text-ink-secondary">{t(FOR_BUYERS.lede)}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton to="/lots">{t('Explore the lots')}</LinkButton>
            <LinkButton to="/demo" kind="secondary">
              {t('Try it on Base Sepolia')}
            </LinkButton>
          </div>
        </div>
      </section>

      <Section tone="surface" labelledBy="buyers-points">
        <h2 id="buyers-points" className="t-h1">
          {t('What you can rely on')}
        </h2>
        <div className="reveal-stagger mt-12 grid gap-x-12 gap-y-10 lg:grid-cols-2">
          {FOR_BUYERS.points.map((point) => (
            <div key={point.title}>
              <span aria-hidden className="block h-0.5 w-10 rounded-full bg-accent" />
              <h3 className="mt-3 text-body font-semibold">{t(point.title)}</h3>
              <p className="mt-2 text-body-sm text-ink-secondary">{t(point.body)}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

/** PUB-08. The lifecycle, told once, in order. */
export function HowItWorks() {
  const { t } = useLocale();
  return (
    <>
      <section className="bg-page py-12 md:py-16">
        <div className="shell max-w-reading">
          <h1 className="t-display text-[clamp(2rem,1.4rem+2.4vw,3.25rem)]">
            {t(HOW_IT_WORKS.title)}
          </h1>
          <p className="mt-6 text-body text-ink-secondary">{t(HOW_IT_WORKS.lede)}</p>
        </div>
      </section>

      <Section tone="surface">
        <TrellisLifecycle stage={6} variant="static" label={t('The seven production stages')} />
      </Section>

      <Section labelledBy="chapters">
        <h2 id="chapters" className="sr-only">
          {t('The seven steps')}
        </h2>
        <ol className="reveal-stagger space-y-12">
          {HOW_IT_WORKS.chapters.map((chapter, index) => (
            <li key={chapter.title} className="grid gap-4 md:grid-cols-[4rem_minmax(0,65ch)]">
              <span aria-hidden className="t-metric text-2xl text-accent">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="t-h2">{t(chapter.title)}</h3>
                <p className="mt-3 text-body text-ink-secondary">{t(chapter.body)}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-16 flex flex-wrap gap-3">
          <LinkButton to="/lots">{t('Explore the lots')}</LinkButton>
          <LinkButton to="/network" kind="secondary">
            {t('What runs on Base')}
            <ArrowRight aria-hidden className="size-4" strokeWidth={1.75} />
          </LinkButton>
        </div>
      </Section>
    </>
  );
}

/**
 * PUB-10. There is no backend to receive a form, so this page does not pretend
 * to collect one. Pilot enquiries go directly to the published contact email.
 */
export function Pilot() {
  const { t } = useLocale();
  return (
    <div className="shell py-16 md:py-24">
      <div className="max-w-reading">
        <h1 className="t-h1">{t(PILOT.title)}</h1>
        <p className="mt-6 text-body text-ink-secondary">{t(PILOT.lede)}</p>

        <p className="mt-8 text-body text-ink-secondary">
          {t('Interested in the pilot? Email us about your winery or business.')}
        </p>

        <dl className="mt-8 divide-y divide-edge-subtle">
          <div className="flex flex-wrap items-baseline gap-4 py-4">
            <dt className="w-40 shrink-0 text-body-sm text-ink-secondary">{t('Email')}</dt>
            <dd className="text-body-sm">
              <EmailLink />
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline gap-4 py-4">
            <dt className="w-40 shrink-0 text-body-sm text-ink-secondary">{t('What will help')}</dt>
            <dd className="max-w-reading text-body text-ink-secondary">
              {t(
                'What you make or buy, roughly how many bottles a year, and whether you already sell or buy across a border.',
              )}
            </dd>
          </div>
        </dl>

        <p className="mt-8 text-body-sm text-ink-secondary">
          {t('Or read ')}
          <Link to="/network" className="text-accent underline underline-offset-4">
            {t('what runs on Base')}
          </Link>{' '}
          {t('first.')}
        </p>
      </div>
    </div>
  );
}

function getLegalPages(t: Translate): Record<string, { title: string; body: React.ReactNode }> {
  return {
    'prototype-disclosure': {
      title: 'Prototype disclosure',
      body: (
        <>
          <p>
            {t(
              'Palissage is a prototype. The contracts in this release are deployed to Base Sepolia, a test network. The settlement asset is a test asset with no monetary value.',
            )}
          </p>
          <p>
            {t(
              'No real wine has been traded through the platform, no real money has settled, and no commercial agreement with any producer named on this site is in place. Producers shown here are in discussion about a closed pilot.',
            )}
          </p>
          <p>
            {t(
              'The contracts have not been audited by an independent security reviewer. Base mainnet is not reachable from this build.',
            )}
          </p>
          <p>
            {t(
              'Verification, where the interface shows it, means an operator reviewed documents a producer supplied and recorded their hash on Base. It is not a guarantee of quality, authenticity, or legal compliance, and it is not an inspection of the physical wine.',
            )}
          </p>
        </>
      ),
    },
    privacy: {
      title: 'Privacy',
      body: (
        <>
          <p>
            {t(
              'This interface has no server of its own and no analytics. It does not set a tracking cookie, does not load a font, script or image from a third party, and does not send your address anywhere.',
            )}
          </p>
          <p>
            {t(
              'Theme and language preferences are stored in functional cookies when you change them.',
            )}
          </p>
          <p>
            {t(
              'Reading the catalogue requires reading the Base Sepolia network. Those reads go to public RPC endpoints, which can see your IP address like any web request. Connecting a wallet shares your address with this page and with the network.',
            )}
          </p>
        </>
      ),
    },
    terms: {
      title: 'Terms',
      body: (
        <>
          <p>
            {t(
              'This prototype is provided as it is, for evaluation. Nothing on this site is an offer to sell wine, a financial product, or an invitation to invest.',
            )}
          </p>
          <p>
            {t(
              'Bottle balances recorded on Base represent a claim described by the producer against a physical lot. Whether that claim can be enforced is a matter of the agreement between the parties, not of this software.',
            )}
          </p>
          <p>
            {t(
              'Transfers are restricted at the contract level to wallets an operator has qualified. An operator can suspend a lot and, where the contracts allow it, freeze or move balances. That authority is described on the network page rather than hidden here.',
            )}
          </p>
        </>
      ),
    },
    credits: {
      title: 'Credits',
      body: (
        <>
          <p>
            {t(
              'The name is the French viticultural term for the trellis of posts and wires that carries a vineyard row. The mark is a vine growing across three wires.',
            )}
          </p>
          <p>
            {t(
              'Type is Fraunces and Inter, both variable and both open source, with JetBrains Mono for addresses and hashes. Icons are Lucide.',
            )}
          </p>
          <p>
            {t(
              'Photographs of the estates and the bottles belong to the producers and their photographers. Files whose rights are not yet cleared are not published — where you see a plate instead of a photograph, that is why.',
            )}
          </p>
        </>
      ),
    },
  };
}

export function Legal() {
  const { t } = useLocale();
  const LEGAL = getLegalPages(t);
  const { slug } = useParams();
  const page = slug ? LEGAL[slug] : undefined;
  if (!page) return <NotFound what={t('the page “{name}”', { name: slug ?? '' })} />;

  return (
    <div className="shell py-16 md:py-24">
      <article className="max-w-reading">
        <h1 className="t-h1">{t(page.title)}</h1>
        <div className="mt-8 space-y-6 text-body text-ink-secondary">{page.body}</div>
      </article>
    </div>
  );
}
