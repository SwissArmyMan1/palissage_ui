import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { useLocale } from '@/lib/i18n/context';
import { LANDING } from '@/lib/content/copy';
import { PRODUCTION_STAGES_SHORT } from '@/lib/enums';
import { useHarvestSequence } from './useHarvestSequence';
import './harvest-story.css';

export function HarvestStory() {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const { t, locale } = useLocale();
  useHarvestSequence(root, canvas);
  const chapters = ['A wine’s journey', 'Closer to each other', 'Better on both sides'];

  return (
    <div ref={root} className="harvest-story" data-motion="poster" data-chapter="0">
      <div className="harvest-stage" aria-hidden="true">
        <img className="harvest-poster" src="/media/harvest/poster.jpg?v=2" alt="" loading="lazy" width="1280" height="720" />
        <canvas ref={canvas} className="harvest-canvas" />
        <div className="harvest-shade harvest-shade-left" />
        <div className="harvest-shade harvest-shade-right" />
        <div className="harvest-shade harvest-shade-center" />
      </div>
      <div className="harvest-hud" aria-hidden="true">
        <div className="harvest-scene-label"><span />{t('The vine. The harvest.')}</div>
        <div className="harvest-scroll-hint"><ArrowDown size={14} />{t('Scroll to follow the journey')}</div>
        <div className="harvest-timeline">
          <div className="harvest-track"><span /></div>
          <div className="harvest-timeline-labels">
            {chapters.map((label, index) => <span key={label}><b>0{index + 1}</b>{t(label)}</span>)}
          </div>
        </div>
      </div>

      <section id="journey" className="harvest-chapter harvest-intro" aria-labelledby="harvest-journey-title">
        <div className="harvest-copy">
          <p className="harvest-eyebrow"><span>01</span>{t(chapters[0])}</p>
          <h2 id="harvest-journey-title">{t('It starts')}<br /><em>{t('with the vine.')}</em></h2>
          <p className="harvest-lede">{t(LANDING.lifecycleTitle)}<br />{t(LANDING.lifecycleLede)}</p>
          <ol className="harvest-stages" aria-label={t('The seven stages of a wine’s journey, illustrated')}>
            {PRODUCTION_STAGES_SHORT.map((stage) => <li key={stage}>{t(stage)}</li>)}
          </ol>
          <Link className="harvest-link" to="/how-it-works">{t('See how it works')}<ArrowUpRight size={18} /></Link>
        </div>
      </section>

      <section id="closer" className="harvest-chapter" aria-labelledby="harvest-people-title">
        <div className="harvest-copy">
          <p className="harvest-eyebrow"><span>02</span>{t(chapters[1])}</p>
          <h2 id="harvest-people-title">{t('Closer to the wine.')}<br /><em>{t('And its people.')}</em></h2>
          <div className="harvest-audiences">
            {LANDING.audiences.map((audience) => (
              <article key={audience.title}>
                <h3>{t(audience.title)}</h3>
                <p>{t(audience.body)}</p>
                <Link className="harvest-link" to={audience.to}>{t(audience.cta)}<ArrowUpRight size={16} /></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="better" className="harvest-chapter harvest-outro" aria-labelledby="harvest-margin-title">
        <div className="harvest-copy">
          <p className="harvest-eyebrow"><span>03</span>{t(chapters[2])}</p>
          <h2 id="harvest-margin-title">{t('A shorter path.')}<br /><em>{t('More to share.')}</em></h2>
          <p className="harvest-lede">{t(LANDING.marginLede)}</p>
          <dl className="harvest-figures">
            {LANDING.marginTiles.map((tile) => (
              <div key={tile.label}>
                <dt>{t(tile.label)}</dt>
                <dd>{new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(tile.value)}</dd>
              </div>
            ))}
          </dl>
          <p className="harvest-footnote">{t(LANDING.marginFootnote)}</p>
          <Link className="harvest-link" to="/lots">{t(LANDING.ctaPrimary)}<ArrowUpRight size={18} /></Link>
        </div>
      </section>
    </div>
  );
}
