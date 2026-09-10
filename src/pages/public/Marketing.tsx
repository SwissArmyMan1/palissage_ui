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

/** PUB-06. Copy is fixed in doc 07 §6; the layout is the content template. */
export function ForWineries() {
  return (
    <>
      <section className="bg-page py-12 md:py-16">
        <div className="shell grid items-center gap-12 lg:grid-cols-2">
          <div className="max-w-reading">
            <p className="t-caption text-accent">For wineries</p>
            <h1 className="mt-4 t-display text-[clamp(2rem,1.4rem+2.4vw,3.25rem)]">
              {FOR_WINERIES.title}
            </h1>
            <p className="mt-6 text-body text-ink-secondary">{FOR_WINERIES.lede}</p>
            <LinkButton to="/pilot" className="mt-8">
              Talk to us about the pilot
            </LinkButton>
          </div>
          <Plate
            asset={ASSETS.estateRissacVineyard}
            alt="Hands working a vine trained on wire"
            ratio="4 / 3"
            sizes="(min-width: 1024px) 560px, 92vw"
          />
        </div>
      </section>

      <Section tone="surface" labelledBy="wineries-steps">
        <h2 id="wineries-steps" className="t-h1">
          What the platform does for you
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
                <h3 className="text-body font-semibold">{step.title}</h3>
                <p className="mt-1 text-body text-ink-secondary">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <Callout tone="info" className="mt-12 max-w-reading">
          {FOR_WINERIES.closing}
        </Callout>
      </Section>
    </>
  );
}

/** PUB-07. */
export function ForBuyers() {
  return (
    <>
      <section className="bg-page py-12 md:py-16">
        <div className="shell max-w-reading">
          <p className="t-caption text-accent">For shops and importers</p>
          <h1 className="mt-4 t-display text-[clamp(2rem,1.4rem+2.4vw,3.25rem)]">
            {FOR_BUYERS.title}
          </h1>
          <p className="mt-6 text-body text-ink-secondary">{FOR_BUYERS.lede}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton to="/lots">Explore the lots</LinkButton>
            <LinkButton to="/demo" kind="secondary">
              Try it on Base Sepolia
            </LinkButton>
          </div>
        </div>
      </section>

      <Section tone="surface" labelledBy="buyers-points">
        <h2 id="buyers-points" className="t-h1">
          What you can rely on
        </h2>
        <div className="reveal-stagger mt-12 grid gap-x-12 gap-y-10 lg:grid-cols-2">
          {FOR_BUYERS.points.map((point) => (
            <div key={point.title}>
              <span aria-hidden className="block h-0.5 w-10 rounded-full bg-accent" />
              <h3 className="mt-3 text-body font-semibold">{point.title}</h3>
              <p className="mt-2 text-body-sm text-ink-secondary">{point.body}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

/** PUB-08. The lifecycle, told once, in order. */
export function HowItWorks() {
  return (
    <>
      <section className="bg-page py-12 md:py-16">
        <div className="shell max-w-reading">
          <h1 className="t-display text-[clamp(2rem,1.4rem+2.4vw,3.25rem)]">{HOW_IT_WORKS.title}</h1>
          <p className="mt-6 text-body text-ink-secondary">{HOW_IT_WORKS.lede}</p>
        </div>
      </section>

      <Section tone="surface">
        <TrellisLifecycle stage={6} variant="static" label="The seven production stages" />
      </Section>

      <Section labelledBy="chapters">
        <h2 id="chapters" className="sr-only">
          The seven steps
        </h2>
        <ol className="reveal-stagger space-y-12">
          {HOW_IT_WORKS.chapters.map((chapter, index) => (
            <li key={chapter.title} className="grid gap-4 md:grid-cols-[4rem_minmax(0,65ch)]">
              <span aria-hidden className="t-metric text-2xl text-accent">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="t-h2">{chapter.title}</h3>
                <p className="mt-3 text-body text-ink-secondary">{chapter.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-16 flex flex-wrap gap-3">
          <LinkButton to="/lots">Explore the lots</LinkButton>
          <LinkButton to="/network" kind="secondary">
            What runs on Base
            <ArrowRight aria-hidden className="size-4" strokeWidth={1.75} />
          </LinkButton>
        </div>
      </Section>
    </>
  );
}

/**
 * PUB-10. There is no backend to receive a form, so this page does not pretend
 * to collect one. The contact address is not published yet, so it is left as a
 * dash rather than a placeholder that would bounce.
 */
export function Pilot() {
  return (
    <div className="shell py-16 md:py-24">
      <div className="max-w-reading">
        <h1 className="t-h1">{PILOT.title}</h1>
        <p className="mt-6 text-body text-ink-secondary">{PILOT.lede}</p>

        <Callout tone="info" title="No form yet, on purpose" className="mt-8">
          This prototype has no server, so there is nothing here that could store your details. The
          contact address is not published yet.
        </Callout>

        <dl className="mt-8 divide-y divide-edge-subtle">
          <div className="flex flex-wrap items-baseline gap-4 py-4">
            <dt className="w-40 shrink-0 text-body-sm text-ink-secondary">Email</dt>
            <dd className="text-body text-ink-secondary">—</dd>
          </div>
          <div className="flex flex-wrap items-baseline gap-4 py-4">
            <dt className="w-40 shrink-0 text-body-sm text-ink-secondary">What will help</dt>
            <dd className="max-w-reading text-body text-ink-secondary">
              What you make or buy, roughly how many bottles a year, and whether you already sell
              or buy across a border.
            </dd>
          </div>
        </dl>

        <p className="mt-8 text-body-sm text-ink-secondary">
          Or read <Link to="/network" className="text-accent underline underline-offset-4">what runs on Base</Link>{' '}
          first.
        </p>
      </div>
    </div>
  );
}

const LEGAL: Record<string, { title: string; body: React.ReactNode }> = {
  'prototype-disclosure': {
    title: 'Prototype disclosure',
    body: (
      <>
        <p>
          Palissage is a prototype. The contracts in this release are deployed to Base Sepolia, a
          test network. The settlement asset is a test asset with no monetary value.
        </p>
        <p>
          No real wine has been traded through the platform, no real money has settled, and no
          commercial agreement with any producer named on this site is in place. Producers shown
          here are in discussion about a closed pilot.
        </p>
        <p>
          The contracts have not been audited by an independent security reviewer. Base mainnet is
          not reachable from this build.
        </p>
        <p>
          Verification, where the interface shows it, means an operator reviewed documents a
          producer supplied and recorded their hash on Base. It is not a guarantee of quality,
          authenticity, or legal compliance, and it is not an inspection of the physical wine.
        </p>
      </>
    ),
  },
  privacy: {
    title: 'Privacy',
    body: (
      <>
        <p>
          This interface has no server of its own and no analytics. It does not set a tracking
          cookie, does not load a font, script or image from a third party, and does not send your
          address anywhere.
        </p>
        <p>
          One cookie is set, and only if you change the theme: it records light or dark so the page
          renders the way you chose.
        </p>
        <p>
          Reading the catalogue requires reading the Base Sepolia network. Those reads go to public
          RPC endpoints, which can see your IP address like any web request. Connecting a wallet
          shares your address with this page and with the network.
        </p>
      </>
    ),
  },
  terms: {
    title: 'Terms',
    body: (
      <>
        <p>
          This prototype is provided as it is, for evaluation. Nothing on this site is an offer to
          sell wine, a financial product, or an invitation to invest.
        </p>
        <p>
          Bottle balances recorded on Base represent a claim described by the producer against a
          physical lot. Whether that claim can be enforced is a matter of the agreement between
          the parties, not of this software.
        </p>
        <p>
          Transfers are restricted at the contract level to wallets an operator has qualified. An
          operator can suspend a lot and, where the contracts allow it, freeze or move balances.
          That authority is described on the network page rather than hidden here.
        </p>
      </>
    ),
  },
  credits: {
    title: 'Credits',
    body: (
      <>
        <p>
          The name is the French viticultural term for the trellis of posts and wires that carries
          a vineyard row. The mark is a vine growing across three wires.
        </p>
        <p>
          Type is Fraunces and Inter, both variable and both open source, with JetBrains Mono for
          addresses and hashes. Icons are Lucide.
        </p>
        <p>
          Photographs of the estates and the bottles belong to the producers and their
          photographers. Files whose rights are not yet cleared are not published — where you see
          a plate instead of a photograph, that is why.
        </p>
      </>
    ),
  },
};

export function Legal() {
  const { slug } = useParams();
  const page = slug ? LEGAL[slug] : undefined;
  if (!page) return <NotFound what={`the page “${slug ?? ''}”`} />;

  return (
    <div className="shell py-16 md:py-24">
      <article className="max-w-reading">
        <h1 className="t-h1">{page.title}</h1>
        <div className="mt-8 space-y-6 text-body text-ink-secondary">{page.body}</div>
      </article>
    </div>
  );
}
