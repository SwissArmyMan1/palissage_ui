/**
 * Image rights register — doc 08 section 3.
 *
 * "Only `granted` files may be published." Everything else renders the designed
 * placeholder plate with its caption, which is exactly what the approved Figma
 * frames show. Flipping a file to `granted` is a one-word change here.
 *
 * The two positive clearances in doc 08 are carried over:
 *  - estate/deumie-panorama.jpg — "best hero candidate, literally a palissage"
 *  - wine/cazaban-*.jpg — the producer's own packshots, "best quality in the set"
 *
 * Blocked, explicitly: wine/botica-*.jpg carry a third-party photographer credit
 * in EXIF ("Samuel le Photographe"). wine/mijane-galea-*.png are 284 px wide and
 * unusable above ~150 px.
 */

export type RightsState = 'granted' | 'pending' | 'blocked' | 'unusable';

export interface ImageAsset {
  src: string;
  /** Shown on the placeholder plate when the file may not be published. */
  caption: string;
  rights: RightsState;
  width: number;
  height: number;
}

export const ASSETS = {
  heroEstate: {
    src: '/img/estate/deumie-panorama.jpg',
    caption: 'Vineyard rows on the limestone slopes, Cabardès',
    rights: 'granted',
    width: 1352,
    height: 1930,
  },
  estateRissacDomain: {
    src: '/img/estate/rissac-domain.jpg',
    caption: 'Estate photograph · rights pending',
    rights: 'pending',
    width: 1828,
    height: 2560,
  },
  estateRissacVineyard: {
    src: '/img/estate/rissac-vineyard.jpg',
    caption: 'Estate photograph · rights pending',
    rights: 'pending',
    width: 1828,
    height: 2560,
  },
  cazabanA1353: {
    src: '/img/wine/cazaban-a1353.jpg',
    caption: 'Packshot · Domaine de Cazaban',
    rights: 'granted',
    width: 1200,
    height: 1600,
  },
  cazabanDemoiselle: {
    src: '/img/wine/cazaban-demoiselle.jpg',
    caption: 'Packshot · Domaine de Cazaban',
    rights: 'granted',
    width: 1200,
    height: 1600,
  },
  cazabanDomaine: {
    src: '/img/wine/cazaban-domaine-2020.jpg',
    caption: 'Packshot · Domaine de Cazaban',
    rights: 'granted',
    width: 1200,
    height: 1600,
  },
  cazabanNaissance: {
    src: '/img/wine/cazaban-naissance.jpg',
    caption: 'Packshot · Domaine de Cazaban',
    rights: 'granted',
    width: 1200,
    height: 1600,
  },
  boticaRissac: {
    src: '/img/wine/botica-rissac.jpg',
    caption: 'Packshot · photographer credit not yet cleared',
    rights: 'blocked',
    width: 1200,
    height: 1800,
  },
  boticaVillemartin: {
    src: '/img/wine/botica-villemartin.jpg',
    caption: 'Packshot · photographer credit not yet cleared',
    rights: 'blocked',
    width: 1200,
    height: 1800,
  },
  boticaDeumie: {
    src: '/img/wine/botica-deumie.jpg',
    caption: 'Packshot · photographer credit not yet cleared',
    rights: 'blocked',
    width: 1200,
    height: 1800,
  },
  parazolsNiAnge: {
    src: '/img/wine/parazols-niange.jpg',
    caption: 'Packshot · awaiting producer permission',
    rights: 'pending',
    width: 1100,
    height: 1400,
  },
  mijaneGaleaRouge: {
    src: '/img/wine/mijane-galea-rouge.png',
    caption: 'Packshot · original file too small to publish',
    rights: 'unusable',
    width: 284,
    height: 632,
  },
  mijaneGaleaBlanc: {
    src: '/img/wine/mijane-galea-blanc.png',
    caption: 'Packshot · original file too small to publish',
    rights: 'unusable',
    width: 178,
    height: 611,
  },
} as const satisfies Record<string, ImageAsset>;

export type AssetKey = keyof typeof ASSETS;

export function isPublishable(asset: ImageAsset | undefined): boolean {
  return asset?.rights === 'granted';
}
