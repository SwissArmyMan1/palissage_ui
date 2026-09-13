import { ASSETS, type ImageAsset } from './assets';
import { PRODUCERS, type Producer } from './producers';

/**
 * Editorial layer over the on-chain lot record.
 *
 * `PalissageLens.LotView` carries id, name, region, vintage, bottle size,
 * royalty and the production stage. It does not carry a producer name, a grape
 * blend, an alcohol level or a photograph — `grapes` and `metadataURI` are empty
 * strings in the current deployment. Those come from here, keyed by lot id, and
 * every screen labels them as producer-supplied rather than on-chain.
 *
 * A lot with no entry still renders: the chain fields are the source of truth and
 * the editorial fields degrade to nothing.
 */

export interface LotContent {
  producerSlug: string;
  appellation: string;
  grapes: string;
  alcohol: string;
  image: ImageAsset | null;
  /** One-line tasting or parcel note, producer-supplied. */
  note?: string;
}

const CONTENT: Record<string, LotContent> = {
  '1': {
    producerSlug: 'domaine-de-cazaban',
    appellation: 'Cabardès AOP',
    grapes: 'Grenache Noir · Syrah',
    alcohol: '14.0%',
    image: ASSETS.bottleVineyard,
    note: 'The terraced parcels at the top of the estate, picked last.',
  },
  '2': {
    producerSlug: 'domaines-botica-galy',
    appellation: 'Cabardès AOP',
    grapes: 'Cabernet Franc · Merlot',
    alcohol: '14.0%',
    image: ASSETS.bottleStudio,
    note: 'Stony ground at Rissac; the wine that gave the estate its reputation.',
  },
  '3': {
    producerSlug: 'domaine-la-mijane',
    appellation: 'Cabardès AOC · organic',
    grapes: 'Chardonnay · Chenin',
    alcohol: '12.5%',
    image: ASSETS.bottleStudio,
    note: 'The high white parcel, kept for acidity.',
  },
  '4': {
    producerSlug: 'domaine-parazols-bertrou',
    appellation: 'Cabardès AOP',
    grapes: 'Grenache · Syrah',
    alcohol: '13.0%',
    image: ASSETS.bottleVineyard,
    note: 'Pressed at dawn, which is where the name comes from.',
  },
  '5': {
    producerSlug: 'domaines-botica-galy',
    appellation: 'Limoux AOP',
    grapes: 'Merlot · Malbec',
    alcohol: '13.5%',
    image: ASSETS.bottleVineyard,
    note: 'Still on the vine. Sold as En Primeur to finance the vintage.',
  },
  '6': {
    producerSlug: 'domaine-de-cazaban',
    appellation: 'Cabardès AOP',
    grapes: 'Grenache · Syrah',
    alcohol: '13.5%',
    image: ASSETS.bottleStudio,
    note: 'The row that runs the length of the estate.',
  },
};

const FALLBACK_PRODUCER = PRODUCERS[0];

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
