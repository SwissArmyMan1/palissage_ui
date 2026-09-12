import { useLocale } from '@/lib/i18n/context';
import { ProducerCard } from '@/components/patterns/ProducerCard';
import { PRODUCERS } from '@/lib/content/producers';
import { lotIdsOfProducer } from '@/lib/content/lots';

/** PUB-04. `Content page template` — editorial, four estates. */
export default function Producers() {
  const { t } = useLocale();
  return (
    <div className="shell py-12 md:py-16">
      <header className="max-w-reading">
        <h1 className="t-h1">{t('Producers')}</h1>
        <p className="mt-4 text-body text-ink-secondary">
          {t(
            'Four estates in the Cabardès and Limoux, working the limestone slopes north of Carcassonne. Each is in discussion about the first pilot; none has traded on the platform yet.',
          )}
        </p>
      </header>

      <div className="reveal-stagger mt-12 grid gap-6 lg:grid-cols-2">
        {PRODUCERS.map((producer) => (
          <ProducerCard
            key={producer.slug}
            producer={producer}
            lotCount={lotIdsOfProducer(producer.slug).length}
          />
        ))}
      </div>
    </div>
  );
}
