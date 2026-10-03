import { ASSETS, type ImageAsset } from './assets';
import { PRODUCERS, type Producer } from './producers';

/** Optional illustration metadata; chain records remain the source of truth. */
export interface LotContent {
  producerSlug: string;
  appellation: string;
  grapes: string;
  alcohol: string;
  image: ImageAsset | null;
  /** One-line tasting or parcel note, producer-supplied. */
  note?: string;
}

const CONTENT: Record<string, LotContent> = Object.fromEntries(
  ['Syrah', 'Syrah · Grenache', 'Grenache · Cinsault', 'Grenache', 'Carignan', 'Roussanne · Marsanne', 'Syrah'].map((grapes, index) => [String(index + 1), {
    producerSlug: 'demonstration-winery', appellation: 'Fictional test lot', grapes,
    alcohol: 'Not certified', image: ASSETS.bottleStudio,
    note: 'Illustration for the testnet workflow. No commercial wine or provenance claim.',
  }]),
);

const FALLBACK_PRODUCER: Producer = {
  slug: 'on-chain-winery', name: 'On-chain winery', place: 'See the winery wallet in the lot record',
  appellation: '', lede: 'An on-chain lot record.', story: 'Identity is recorded by wallet address.',
  relationship: 'No commercial relationship is implied by this testnet record.', hero: null,
};

export function lotContent(lotId: bigint | number | string): LotContent | undefined {
  return CONTENT[String(lotId)];
}

/** A bottle illustration is also available for lots without editorial metadata. */
export function lotImage(lotId: bigint | number | string): ImageAsset {
  return lotContent(lotId)?.image ?? ASSETS.bottleStudio;
}

export function lotProducer(lotId: bigint | number | string): Producer {
  const slug = CONTENT[String(lotId)]?.producerSlug;
  return PRODUCERS.find((p) => p.slug === slug) ?? FALLBACK_PRODUCER;
}

/** Lot ids attributed to a producer in the editorial layer. */
export function lotIdsOfProducer(slug: string): bigint[] {
  return Object.entries(CONTENT)
    .filter(([, value]) => value.producerSlug === slug)
    .map(([id]) => BigInt(id))
    .sort((a, b) => (a < b ? -1 : 1));
}
