import { Link } from 'react-router-dom';
import { Plate } from '@/components/ui/Plate';
import type { Producer } from '@/lib/content/producers';

export function ProducerCard({ producer, lotCount }: { producer: Producer; lotCount: number }) {
  return (
    <article className="[container-type:inline-size]">
      <Link to={`/producers/${producer.slug}`} className="card hoverable block h-full overflow-hidden shadow-1">
        <Plate
          asset={producer.hero}
          alt={producer.name}
          ratio="16 / 9"
          className="rounded-none"
          sizes="(min-width: 1024px) 560px, 92vw"
        />
        <div className="space-y-2 p-4">
          <p className="text-body-sm text-ink-secondary">
            {[producer.place, `${lotCount} ${lotCount === 1 ? 'lot' : 'lots'}`, producer.appellation]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <h2 className="t-h2 text-[clamp(1.25rem,1rem+1cqi,1.75rem)]">{producer.name}</h2>
          <p className="text-body-sm text-ink-secondary">{producer.lede}</p>
        </div>
      </Link>
    </article>
  );
}
