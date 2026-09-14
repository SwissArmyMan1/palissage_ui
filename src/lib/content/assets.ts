/** User-supplied imagery from UI/pics. Bottle images are generated illustrations.
 * Vineyard WebP derivatives preserve the source framing; display crops and tone
 * are applied in CSS. These illustrations do not identify a particular estate.
 */
export type RightsState = 'granted' | 'pending' | 'blocked' | 'unusable';

export interface ImageAsset {
  src: string;
  srcSet?: string;
  caption: string;
  rights: RightsState;
  width: number;
  height: number;
  kind?: 'bottle' | 'vineyard';
  position?: string;
  tone?: 'original';
}

function vineyard(name: string, height: number, position = '50% 50%'): ImageAsset {
  return {
    src: `/img/palissage/${name}-1440.webp`,
    srcSet: `/img/palissage/${name}-640.webp 640w, /img/palissage/${name}-1440.webp 1440w`,
    caption: 'Vineyard photograph',
    rights: 'granted',
    width: 1440,
    height,
    kind: 'vineyard',
    position,
  };
}

export const ASSETS = {
  bottleStudio: {
    src: '/img/palissage/bottle_w.jpg',
    caption: 'Generated bottle illustration',
    rights: 'granted',
    width: 1023,
    height: 768,
    kind: 'bottle',
  },
  bottleVineyard: {
    src: '/img/palissage/bottle_c.jpg',
    caption: 'Generated bottle illustration',
    rights: 'granted',
    width: 1089,
    height: 768,
    kind: 'bottle',
  },
  // photo.jpg — retain the user's colour correction and native resolution.
  heroEstate: {
    ...vineyard('vineyard-rows-retouched', 1280, '50% 48%'),
    src: '/img/palissage/vineyard-rows-retouched-960.webp',
    srcSet: '/img/palissage/vineyard-rows-retouched-640.webp 640w, /img/palissage/vineyard-rows-retouched-960.webp 960w',
    width: 960,
    tone: 'original',
  },
  // 5275967187262839805.jpg
  vineyardPanorama: vineyard('vineyard-panorama', 713, '50% 32%'),
  // 5275967187262839776.jpg
  vineyardDaylight: vineyard('vineyard-daylight', 1080, '50% 62%'),
  // 5275967187262839798.jpg
  vineyardDusk: vineyard('vineyard-dusk', 1080, '50% 76%'),
  // 5275967187262839801.jpg
  harvest: vineyard('harvest', 1080, '50% 55%'),
} as const satisfies Record<string, ImageAsset>;

export type AssetKey = keyof typeof ASSETS;

export function isPublishable(asset: ImageAsset | undefined): boolean {
  return asset?.rights === 'granted';
}
