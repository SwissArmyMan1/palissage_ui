import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUpRight,
  ArrowRight,
  Fingerprint,
  Grape,
  Wine,
} from 'lucide-react';
import { LinkButton } from '@/components/ui/Button';
import { Plate } from '@/components/ui/Plate';
import { CountUpMoney } from '@/components/ui/StatTile';
import { Section, SectionHead } from '@/components/layout/Section';
import { TrellisLifecycle } from '@/components/patterns/TrellisLifecycle';
import { ASSETS } from '@/lib/content/assets';
import { LANDING } from '@/lib/content/copy';

function Chapter({
  number,
  children,
}: {
  number: string;
  children: React.ReactNode;
}) {
  return (
    <p className="chapter-label">
      <span>{number}</span>
      {children}
    </p>
  );
}

/** Public storytelling only: decorative motion never represents live lot state. */
export default function Landing() {
  return (
    <div className="landing-editorial">
      <section className="editorial-hero" aria-labelledby="hero-heading">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <p className="hero-eyebrow">
              <span aria-hidden />
              {LANDING.eyebrow}
            </p>
            <h1 id="hero-heading" className="hero-title">
              Good wine.
              <br />
              <em>Direct</em> from
              <br />
              the source.
            </h1>
            <p className="hero-lede">{LANDING.lede}</p>
            <div className="hero-actions">
              <LinkButton to="/lots" className="editorial-cta">
                {LANDING.ctaPrimary}
                <ArrowUpRight aria-hidden size={18} />
              </LinkButton>
              <Link to="/demo" className="text-link">
                Try it on Base Sepolia
                <ArrowRight aria-hidden size={16} />
              </Link>
            </div>
            <div className="hero-bottom">
              <a href="#journey" className="scroll-cue">
                <span>
                  <ArrowDown aria-hidden size={17} />
                </span>
                Follow the journey
              </a>
              <span className="hero-note">
                Rooted in the Cabardès.
                <br />
                Built for direct trade.
              </span>
            </div>
          </div>
          <div className="hero-composition">
            <div className="hero-photo">
              <Plate
                asset={ASSETS.heroEstate}
                alt="Vineyard rows and a wooden trellis post on the limestone slopes of the Cabardès"
                ratio="4 / 5"
                priority
                drift
                sizes="(min-width: 1024px) 620px, 92vw"
              />
              <div className="photo-caption">
                <span>THE CABARDÈS</span>
                <span>Southern France ↗</span>
              </div>
            </div>
            <div className="origin-tag" aria-hidden="true">
              <Fingerprint size={25} strokeWidth={1.2} />
              <span>
                Every wine
                <br />
                <strong>has a beginning.</strong>
              </span>
            </div>
            <figure className="bottle-study">
              <div className="bottle-study-image">
                <Plate
                  asset={ASSETS.cazabanA1353}
                  alt="A.1353 wine bottle from Domaine de Cazaban"
                  ratio="3 / 4"
                  fit="contain"
                />
              </div>
              <figcaption>
                <span className="bottle-study-kicker">FROM THE CABARDÈS</span>
                <strong>A.1353</strong>
                <span>Domaine de Cazaban</span>
                <small>Producer bottle · illustration</small>
              </figcaption>
            </figure>
            <span className="hero-side-note" aria-hidden="true">
              THE VINE. THE WINE. THE PEOPLE.
            </span>
          </div>
        </div>
      </section>

      <div
        className="trade-ribbon"
        aria-label="Direct trade, from independent wineries to your business"
      >
        <div className="shell trade-ribbon-inner">
          <span>Independent wineries</span>
          <span className="ribbon-line" aria-hidden />
          <span className="ribbon-center">
            <Grape aria-hidden size={20} />A shorter path. A fairer trade.
          </span>
          <span className="ribbon-line" aria-hidden />
          <span>Your business</span>
        </div>
      </div>

      <Section
        id="journey"
        tone="surface"
        labelledBy="lifecycle-heading"
        className="journey-section"
      >
        <Chapter number="01">A wine’s journey</Chapter>
        <div className="section-heading-row">
          <SectionHead
            id="lifecycle-heading"
            title={LANDING.lifecycleTitle}
            lede={LANDING.lifecycleLede}
          />
          <Link to="/how-it-works" className="text-link">
            See how it works
            <ArrowUpRight aria-hidden size={17} />
          </Link>
        </div>
        <div className="journey-rail">
          <TrellisLifecycle
            stage={6}
            variant="animated"
            label="The seven stages of a wine’s journey, illustrated"
          />
        </div>
        <div className="journey-notes">
          <p>
            Buy wine that’s ready today.
            <br />
            <strong>Or be part of the next vintage.</strong>
          </p>
          <p>
            Every lot records its production stage on Base.
            <br />
            From the first allocation to the last delivery.
          </p>
        </div>
      </Section>

      <Section labelledBy="audiences-heading" className="audience-section">
        <Chapter number="02">Closer to each other</Chapter>
        <SectionHead id="audiences-heading" title={LANDING.audiencesTitle} />
        <div className="reveal-stagger audience-grid">
          {LANDING.audiences.map((audience, index) => (
            <article
              key={audience.title}
              className={`audience-card audience-card-${index}`}
            >
              <div className="audience-art" aria-hidden="true">
                <span className="audience-art-label">
                  {index === 0 ? 'AT THE ORIGIN' : 'AT YOUR TABLE'}
                </span>
                <span className="audience-art-word">
                  {index === 0 ? 'Cultivate.' : 'Discover.'}
                </span>
                <div className="audience-orbit orbit-one" />
                <div className="audience-orbit orbit-two" />
                <div className="audience-symbol">
                  {index === 0 ? (
                    <Grape size={54} strokeWidth={1} />
                  ) : (
                    <Wine size={54} strokeWidth={1} />
                  )}
                </div>
                <span className="audience-art-number">0{index + 1}</span>
              </div>
              <div className="audience-card-copy">
                <h3 className="t-h2">{audience.title}</h3>
                <p>{audience.body}</p>
                <Link to={audience.to} className="audience-link">
                  {audience.cta}
                  <span>
                    <ArrowUpRight aria-hidden size={20} />
                  </span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section
        tone="surface"
        labelledBy="margin-heading"
        className="margin-section"
      >
        <Chapter number="03">Better on both sides</Chapter>
        <div className="margin-layout">
          <div>
            <SectionHead
              id="margin-heading"
              title={LANDING.marginTitle}
              lede={LANDING.marginLede}
            />
            <p className="margin-footnote">{LANDING.marginFootnote}</p>
          </div>
          <div className="margin-stats reveal-stagger">
            {LANDING.marginTiles.map((tile, index) => (
              <div className="margin-stat" key={tile.label}>
                <span className="margin-stat-index" aria-hidden>
                  0{index + 1}
                </span>
                <div>
                  <p>{tile.label}</p>
                  <strong>
                    <CountUpMoney target={tile.value} />
                  </strong>
                </div>
                <ArrowUpRight aria-hidden size={23} />
              </div>
            ))}
          </div>
        </div>
      </Section>

      <section className="terroir-interlude" aria-labelledby="terroir-heading">
        <Plate
          asset={ASSETS.heroEstate}
          alt="The landscape of the Cabardès wine region"
          ratio="21 / 9"
          className="terroir-image"
          sizes="100vw"
        />
        <div className="terroir-shade" />
        <div className="shell terroir-content">
          <p className="t-caption">Real places. Real people. Real wine.</p>
          <h2 id="terroir-heading">
            The origin
            <br />
            <em>stays with it.</em>
          </h2>
          <span>
            From a hillside in southern France
            <br />
            to the story behind every bottle.
          </span>
        </div>
        <div className="terroir-word" aria-hidden="true">
          Cabardès
        </div>
      </section>

      <Section labelledBy="trust-heading" className="trust-section">
        <Chapter number="04">A little more transparency</Chapter>
        <div className="trust-layout">
          <div className="trust-intro">
            <Fingerprint aria-hidden size={42} strokeWidth={1} />
            <SectionHead id="trust-heading" title={LANDING.trustTitle} />
            <Link to="/network" className="text-link">
              Explore the infrastructure
              <ArrowUpRight aria-hidden size={17} />
            </Link>
          </div>
          <div className="trust-list reveal-stagger">
            {LANDING.trust.map((item, index) => (
              <div className="trust-item" key={item.title}>
                <span aria-hidden>0{index + 1}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section labelledBy="stage-heading" className="pilot-section">
        <div className="pilot-panel">
          <div className="pilot-watermark" aria-hidden="true">
            <Grape strokeWidth={0.6} />
          </div>
          <div className="pilot-copy">
            <p className="chapter-label">THE NEXT CHAPTER</p>
            <h2 id="stage-heading">{LANDING.stageTitle}</h2>
            <p>{LANDING.stageBody}</p>
            <LinkButton to="/pilot" className="pilot-cta">
              {LANDING.stageCta}
              <ArrowUpRight aria-hidden size={18} />
            </LinkButton>
          </div>
          <span className="pilot-caption">
            Growing something
            <br />
            <em>worth sharing.</em>
          </span>
        </div>
      </Section>
    </div>
  );
}
