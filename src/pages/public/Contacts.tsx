import { useLocale } from '@/lib/i18n/context';
import { EmailLink, XLink } from '@/components/ui/ContactLinks';
import { VineyardStrip } from '@/components/ui/VineyardStrip';
import { ASSETS } from '@/lib/content/assets';

export default function Contacts() {
  const { t } = useLocale();
  return (
    <section className="shell py-16 md:py-24" aria-labelledby="contacts-heading">
      <p className="chapter-label">{t('Get in touch')}</p>
      <h1 id="contacts-heading" className="t-display">
        {t('Contacts')}
      </h1>
      <p className="mt-6 max-w-reading text-body text-ink-secondary">
        {t(
          'A question about Palissage, direct wine trade or the pilot? We’d love to hear from you.',
        )}
      </p>
      <div className="mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
        <div className="card p-6 sm:p-8">
          <h2 className="t-h2">{t('Email')}</h2>
          <p className="mt-3 text-body-sm text-ink-secondary">{t('Write to the team.')}</p>
          <EmailLink className="mt-5 text-body-sm sm:text-body" />
        </div>
        <div className="card p-6 sm:p-8">
          <h2 className="t-h2">{t('Find us on X')}</h2>
          <p className="mt-3 text-body-sm text-ink-secondary">
            {t('Follow the project and join the conversation.')}
          </p>
          <XLink showHandle className="mt-5 text-body-sm" />
        </div>
      </div>
      <VineyardStrip asset={ASSETS.vineyardDusk} className="mt-12 h-36 max-w-4xl md:h-48" />
    </section>
  );
}
