import { ASSETS, type ImageAsset } from './assets';

/**
 * Editorial producer directory — off-chain content.
 *
 * The chain stores a lot's `winery` as an address and nothing else. Producer
 * names, stories and photographs are editorial and live here. Every screen that
 * shows a producer name alongside on-chain data says which is which, because in
 * the current testnet seed one operator wallet stands in for every actor.
 *
 * Relationship language follows doc 07: "in discussion", never "partner".
 */

export interface Producer {
  slug: string;
  name: string;
  /** Village and appellation, as printed under the name. */
  place: string;
  appellation: string;
  lede: string;
  story: string;
  /** The standing honesty line for a producer with no signed agreement. */
  relationship: string;
  hero: ImageAsset | null;
  organic?: boolean;
}

export const PRODUCERS: Producer[] = [
  {
    slug: 'domaine-de-cazaban',
    name: 'Domaine de Cazaban',
    place: 'Villarzel-Cabardès, Aude',
    appellation: 'Cabardès AOP',
    lede: 'Working the parcels with the vine trained on wire — the palissage this platform is named after.',
    story:
      'On the limestone slopes north of Carcassonne, where Atlantic and Mediterranean weather meet in the same vineyard. The vines are trained on wire — the palissage this platform takes its name from.',
    relationship:
      'Domaine de Cazaban is in discussion about joining the first Palissage pilot. No commercial agreement is in place, and no wine has been traded on the platform.',
    hero: ASSETS.heroEstate,
  },
  {
    slug: 'domaines-botica-galy',
    name: 'Domaines Botica Galy',
    place: 'Rissac and Villemartin',
    appellation: 'Cabardès and Limoux AOP',
    lede: 'Two estates, one team; the Limoux parcels supply the En Primeur offers.',
    story:
      'Two estates worked by one team. The Cabardès parcels at Rissac give the structured reds; the Limoux parcels north of the Aude supply the fruit behind the En Primeur offers.',
    relationship:
      'Domaines Botica Galy is in discussion about joining the first Palissage pilot. No commercial agreement is in place, and no wine has been traded on the platform.',
    hero: ASSETS.vineyardDaylight,
  },
  {
    slug: 'domaine-la-mijane',
    name: 'Domaine La Mijane',
    place: 'Cabardès',
    appellation: 'Cabardès AOC',
    lede: 'Merlot, Grenache Noir and Cabernet Franc on clay-limestone.',
    story:
      'A small certified-organic estate on clay-limestone, planted to Merlot, Grenache Noir and Cabernet Franc, with a white parcel high enough to keep its acidity.',
    relationship:
      'Domaine La Mijane is in discussion about joining the first Palissage pilot. No commercial agreement is in place, and no wine has been traded on the platform.',
    hero: ASSETS.harvest,
    organic: true,
  },
  {
    slug: 'domaine-parazols-bertrou',
    name: 'Domaine Parazols Bertrou',
    place: 'Bagnoles',
    appellation: 'Cabardès AOP',
    lede: 'A Cabardès blend across the Atlantic and Mediterranean grape families.',
    story:
      'At Bagnoles, on the eastern edge of the appellation. The house style blends across both grape families the Cabardès allows — Atlantic Cabernet and Merlot against Mediterranean Grenache and Syrah.',
    relationship:
      'Domaine Parazols Bertrou is in discussion about joining the first Palissage pilot. No commercial agreement is in place, and no wine has been traded on the platform.',
    hero: ASSETS.vineyardPanorama,
  },
];

export const PRODUCERS_BY_SLUG = new Map(PRODUCERS.map((p) => [p.slug, p]));

export function producerBySlug(slug?: string): Producer | undefined {
  return slug ? PRODUCERS_BY_SLUG.get(slug) : undefined;
}
