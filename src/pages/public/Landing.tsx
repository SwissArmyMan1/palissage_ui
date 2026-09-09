import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { LinkButton } from '@/components/ui/Button';
import { Plate } from '@/components/ui/Plate';
import { StatTile, CountUpMoney } from '@/components/ui/StatTile';
import { Section, SectionHead } from '@/components/layout/Section';
import { TrellisLifecycle } from '@/components/patterns/TrellisLifecycle';
import { ASSETS } from '@/lib/content/assets';
import { LANDING } from '@/lib/content/copy';

/**
 * PUB-01. `Content page template` with an editorial split hero — not a centred
 * hero, and not three equal feature cards.
 *
 * The headline and the photograph carry **no** entrance animation: the headline
 * is the LCP element and the `Kinetic type` entry vetoes animating it. The
 * photograph's only movement is an ambient scroll-linked drift under 3%, which
 * starts after paint and runs on the compositor.
 *
 * The page's one signature moment is the trellis vine, below the fold.
 */
export default function Landing() {
  return (
    <>
      {/* ---- Hero: no reveal, no entrance animation ------------------------ */}
      <section className="bg-page py-12 md:py-20">
        <div className="shell grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="max-w-reading">
            <p className="t-caption text-accent">{LANDING.eyebrow}</p>
            <h1 className="mt-4 t-display">{LANDING.h1}</h1>
            <p className="mt-6 text-body text-ink-secondary">{LANDING.lede}</p>
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <LinkButton to="/lots">{LANDING.ctaPrimary}</LinkButton>
              <Link
                to="/demo"
                className="inline-flex items-center gap-1.5 text-body-sm font-medium text-accent underline decoration-transparent underline-offset-4 transition-colors duration-fast ease-out hover:decoration-current"
              >
                Try it on Base Sepolia
                <ArrowRight aria-hidden className="size-4" strokeWidth={1.75} />
              </Link>
            </div>
          </div>

          <Plate
            asset={ASSETS.heroEstate}
            alt="Vineyard rows running to the hills, with a trellis post in the foreground"
            ratio="9 / 10"
            priority
            drift
            sizes="(min-width: 1024px) 560px, 92vw"
            className="lg:justify-self-end lg:w-[min(560px,100%)]"
          />
        </div>
      </section>

      {/* ---- The signature moment ----------------------------------------- */}
      <Section tone="surface" labelledBy="lifecycle-heading">
        <SectionHead
          id="lifecycle-heading"
          title={LANDING.lifecycleTitle}
          lede={LANDING.lifecycleLede}
        />
        <div className="mt-12">
          <TrellisLifecycle stage={4} variant="animated" label="How a lot moves from vine to shelf" />
        </div>
        <p className="mt-8 max-w-reading text-body-sm text-ink-secondary">
          Every lot records its stage on Base, and it only moves forward. Where you join depends on
          whether the wine already exists.
        </p>
      </Section>

      {/* ---- Two audiences ------------------------------------------------ */}
      <Section labelledBy="audiences-heading">
        <SectionHead id="audiences-heading" title={LANDING.audiencesTitle} />
        <div className="reveal-stagger mt-12 grid gap-6 lg:grid-cols-2">
          {LANDING.audiences.map((audience, index) => (
            <article key={audience.title} className="card overflow-hidden p-6 shadow-1">
              <Plate
                asset={index === 0 ? ASSETS.estateRissacVineyard : ASSETS.estateRissacDomain}
                alt=""
                ratio="16 / 6"
              />
              <h3 className="mt-6 t-h2">{audience.title}</h3>
              <p className="mt-3 text-body text-ink-secondary">{audience.body}</p>
              <LinkButton to={audience.to} kind="secondary" size="sm" className="mt-6">
                {audience.cta}
                <ArrowRight aria-hidden className="size-4" strokeWidth={1.75} />
              </LinkButton>
            </article>
          ))}
        </div>
      </Section>

      {/* ---- The margin comparison ---------------------------------------- */}
      <Section tone="surface" labelledBy="margin-heading">
        <SectionHead id="margin-heading" title={LANDING.marginTitle} lede={LANDING.marginLede} />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {LANDING.marginTiles.map((tile) => (
            <StatTile key={tile.label} label={tile.label} value={<CountUpMoney target={tile.value} />} />
          ))}
        </div>
        <p className="mt-8 max-w-reading text-body-sm text-ink-secondary">{LANDING.marginFootnote}</p>
      </Section>

      {/* ---- What verified means ------------------------------------------ */}
      <Section labelledBy="trust-heading">
        <SectionHead id="trust-heading" title={LANDING.trustTitle} />
        <div className="reveal-stagger mt-12 grid gap-x-12 gap-y-10 lg:grid-cols-2">
          {LANDING.trust.map((item) => (
            <div key={item.title}>
              <span aria-hidden className="block h-0.5 w-10 rounded-full bg-accent" />
              <h3 className="mt-3 text-body font-semibold">{item.title}</h3>
              <p className="mt-2 text-body-sm text-ink-secondary">{item.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ---- Where the project is ------------------------------------------ */}
      <Section tone="surface" labelledBy="stage-heading">
        <SectionHead id="stage-heading" title={LANDING.stageTitle} />
        <p className="mt-6 max-w-reading text-body text-ink-secondary">{LANDING.stageBody}</p>
        <LinkButton to="/pilot" className="mt-8">
          {LANDING.stageCta}
        </LinkButton>
      </Section>
    </>
  );
}
