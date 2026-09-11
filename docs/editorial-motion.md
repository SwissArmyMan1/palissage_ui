# Editorial motion refresh

The public site now uses a layered vineyard hero, a floating bottle study, an animated production trellis, audience illustrations, an image interlude and a wine-coloured pilot panel. Existing brand artwork, Fraunces/Inter type and semantic colour tokens remain the foundation. The landing copy leads with direct trade; En Primeur remains part of the story.

All photography is served from the existing local `granted` asset entries. The bottle is labelled as an illustration, not a live offer. Pending estate photographs are no longer used on the landing or winery introduction.

## Motion and interaction

- Bottle, origin label, vineyard crop, audience icons and the large Cabardès lettering move with native CSS scroll timelines. Unsupported browsers retain static compositions plus entrance animations.
- Sections enter once using IntersectionObserver, including content loaded by lazy routes. Content is visible by default; only observed offscreen elements are armed for an entrance. Keyboard focus reveals its containing section immediately.
- Public route changes animate the existing main element without remounting wallet providers. Forward navigation resets scroll and focuses main; history navigation restores the saved position, including delayed content.
- The mobile menu animates in, closes on navigation and returns focus to its trigger on Escape.
- Reduced motion disables decorative motion and immediately shows final figures. Live preference changes are respected. Screen readers receive final metric values rather than every frame of a counter.
- Marketing styles are scoped to `.public-site`. Contract calls, wallet actions and operational workflows are unchanged.

CSS scroll animations are progressive enhancement, following [MDN's animation-timeline reference](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/animation-timeline). No animation library or other application dependency was added.

## Review locally

Run `npm run dev` from `UI/web`, then open the URL printed by Vite. Production verification uses `npm run build` and `npm run preview`.

`npm run build` and `npm run lint` pass. The build still reports dependency annotation and wallet chunking warnings.

The browser check covers widths 320, 390, 768, 1024 and 1440; measured scroll movement; forward/back navigation; mobile menu and Escape; lazy page images; light/dark rendering; reduced motion; live preference changes; anchor navigation; and absence of IntersectionObserver. It writes screenshots to the OS temporary directory. It does not sign transactions or validate live chain operations. Cross-engine Safari/Firefox testing is not included.

The optional test tooling can live outside the repository:

```sh
npm install --prefix /tmp/palissage-ui-browser playwright
/tmp/palissage-ui-browser/node_modules/.bin/playwright install chromium
PALISSAGE_PLAYWRIGHT_PATH=file:///tmp/palissage-ui-browser/node_modules/playwright/index.mjs \
  node scripts/check-public-motion.mjs
```

Set `PALISSAGE_PREVIEW_URL` to test another local port, `PALISSAGE_CHROMIUM_PATH` to use an existing Chromium executable, or `PALISSAGE_SCREENSHOTS` to choose the output directory.

## Return to the original design

The refresh is isolated on `feat/editorial-motion` in the nested `UI/web` Git repository. The starting commit on `main` is `4af3bb7`.

```sh
git -C UI/web switch main
```

To return to the refresh:

```sh
git -C UI/web switch feat/editorial-motion
```
