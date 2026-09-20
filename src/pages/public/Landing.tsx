import { useLocale } from '@/lib/i18n/context';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUpRight, ArrowRight, Fingerprint, Grape } from 'lucide-react';
import { LinkButton } from '@/components/ui/Button';
import { Plate } from '@/components/ui/Plate';
import { Section, SectionHead } from '@/components/layout/Section';
import { HarvestStory } from '@/components/motion/HarvestStory';
import { ASSETS } from '@/lib/content/assets';
import { LANDING } from '@/lib/content/copy';

function Chapter({ number, children }: { number: string; children: React.ReactNode }) {
  return (
    <p className="chapter-label">
      <span>{number}</span>
      {children}
    </p>
  );
}

/** Public storytelling only: decorative motion never represents live lot state. */
export default function Landing() {
  const { t, locale } = useLocale();
  return (
    <div className="landing-editorial">
      <section className="editorial-hero" aria-labelledby="hero-heading">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <p className="hero-eyebrow">
              <span aria-hidden />
              {t(LANDING.eyebrow)}
            </p>
            <h1 id="hero-heading" className="hero-title">
              {t('Good wine.')}
              <br />
              <em>{t('Direct')}</em>
              {locale === 'en' ? ' from' : null}
              <br />
              {locale === 'fr' ? 'du domaine.' : 'the source.'}
            </h1>
            <p className="hero-lede">{t(LANDING.lede)}</p>
            <div className="hero-actions">
              <LinkButton to="/lots" className="editorial-cta">
                {t(LANDING.ctaPrimary)}
                <ArrowUpRight aria-hidden size={18} />
              </LinkButton>
              <Link to="/demo" className="text-link">
                {t('Try it on Base Sepolia')}
                <ArrowRight aria-hidden size={16} />
              </Link>
            </div>
            <div className="hero-bottom">
              <a href="#journey" className="scroll-cue">
                <span>
                  <ArrowDown aria-hidden size={17} />
                </span>
                {t('Follow the journey')}
              </a>
              <span className="hero-note">
                {t('Rooted in the Cabardès.')}
                <br />
                {t('Built for direct trade.')}
              </span>
            </div>
          </div>
          <div className="hero-composition">
            <div className="hero-photo">
              <Plate
                asset={ASSETS.heroEstate}
                alt={t(
                  'Vineyard rows and a wooden trellis post on the limestone slopes of the Cabardès',
                )}
                ratio="4 / 5"
                priority
                drift
                sizes="(min-width: 1024px) 620px, 92vw"
              />
              <div className="photo-caption">
                <span>{t('THE CABARDÈS')}</span>
                <span>{t('Southern France ↗')}</span>
              </div>
            </div>
            <div className="origin-tag" aria-hidden="true">
              <Fingerprint size={25} strokeWidth={1.2} />
              <span>
                {t('Every wine')}
                <br />
                <strong>{t('has a beginning.')}</strong>
              </span>
            </div>
            <figure className="bottle-study">
              <div className="bottle-study-image">
                <Plate
                  asset={ASSETS.bottleStudio}
                  alt={t('A.1353 wine bottle from Domaine de Cazaban')}
                  ratio="3 / 4"
                  fit="contain"
                />
              </div>
              <figcaption>
                <span className="bottle-study-kicker">{t('FROM THE CABARDÈS')}</span>
                <strong>{t('A.1353')}</strong>
                <span>{t('Domaine de Cazaban')}</span>
                <small>{t('Producer bottle · illustration')}</small>
              </figcaption>
            </figure>
            <span className="hero-side-note" aria-hidden="true">
              {t('THE VINE. THE WINE. THE PEOPLE.')}
            </span>
          </div>
        </div>
      </section>

      <div
        className="trade-ribbon"
        aria-label={t('Direct trade, from independent wineries to your business')}
      >
        <div className="shell trade-ribbon-inner">
          <span>{t('Independent wineries')}</span>
          <span className="ribbon-line" aria-hidden />
          <span className="ribbon-center">
            <Grape aria-hidden size={20} />
            {t('A shorter path. A fairer trade.')}
          </span>
          <span className="ribbon-line" aria-hidden />
          <span>{t('Your business')}</span>
        </div>
      </div>

      <HarvestStory />

      <section className="terroir-interlude" aria-labelledby="terroir-heading">
        <Plate
          asset={ASSETS.vineyardPanorama}
          alt={t('The landscape of the Cabardès wine region')}
          ratio="21 / 9"
          className="terroir-image"
          sizes="100vw"
        />
        <div className="terroir-shade" />
        <div className="shell terroir-content">
          <p className="t-caption">{t('Real places. Real people. Real wine.')}</p>
          <h2 id="terroir-heading">
            {t('The origin')}
            <br />
            <em>{t('stays with it.')}</em>
          </h2>
          <span>
            {t('From a hillside in southern France')}
            <br />
            {t('to the story behind every bottle.')}
          </span>
        </div>
        <div className="terroir-word" aria-hidden="true">
          {t('Cabardès')}
        </div>
      </section>

      <Section labelledBy="trust-heading" className="trust-section">
        <Chapter number="04">{t('A little more transparency')}</Chapter>
        <div className="trust-layout">
          <div className="trust-intro">
            <Fingerprint aria-hidden size={42} strokeWidth={1} />
            <SectionHead id="trust-heading" title={t(LANDING.trustTitle)} />
            <Link to="/network" className="text-link">
              {t('Explore the infrastructure')}
              <ArrowUpRight aria-hidden size={17} />
            </Link>
          </div>
          <div className="trust-list reveal-stagger">
            {LANDING.trust.map((item, index) => (
              <div className="trust-item" key={item.title}>
                <span aria-hidden>0{index + 1}</span>
                <div>
                  <h3>{t(item.title)}</h3>
                  <p>{t(item.body)}</p>
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
            <p className="chapter-label">{t('THE NEXT CHAPTER')}</p>
            <h2 id="stage-heading">{t(LANDING.stageTitle)}</h2>
            <p>{t(LANDING.stageBody)}</p>
            <LinkButton to="/pilot" className="pilot-cta">
              {t(LANDING.stageCta)}
              <ArrowUpRight aria-hidden size={18} />
            </LinkButton>
          </div>
          <span className="pilot-caption">
            {t('Growing something')}
            <br />
            <em>{t('worth sharing.')}</em>
          </span>
        </div>
      </Section>
    </div>
  );
}
