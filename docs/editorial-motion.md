# Editorial motion refresh

The public site now uses a layered vineyard hero, a floating bottle study, an animated production trellis, audience illustrations, an image interlude and a wine-coloured pilot panel. Existing brand artwork, Fraunces/Inter type and semantic colour tokens remain the foundation. The landing copy leads with direct trade; En Primeur remains part of the story.

Photography comes from the user-supplied files in `UI/pics`. Bottles use `bottle_c.jpg` and `bottle_w.jpg`. The hero uses WebP derivatives of `photo.jpg` at 640 and 960 px, with no additional colour filter or upscaling. Wine names, descriptions, and EN/FR content are preserved.

## Motion and interaction

- Bottle, origin label, vineyard crop, audience icons and the large Cabardès lettering move with native CSS scroll timelines. Browsers without timeline/range support use `usePublicScrollMotion`: one passive scroll listener schedules a single animation frame and updates the same decorative transforms. It performs no scroll interception, React state updates, or continuous idle animation.
- Audience artwork uses `overflow: clip`. `overflow: hidden` created a non-scrolling ancestor and froze its view timeline. Standalone vineyard drift follows `scroll(root)` so an image crop cannot become its scroll source.
- Sections enter once using IntersectionObserver, including content loaded by lazy routes. Re-arming clears stale visibility left by StrictMode effect cleanup. Content is visible by default; only observed offscreen elements are armed for an entrance. Keyboard focus reveals its containing section immediately.
- Public route changes animate the existing main element without remounting wallet providers. Forward navigation resets scroll and focuses main; history navigation restores the saved position, including delayed content.
- The mobile menu animates in, closes on navigation and returns focus to its trigger on Escape.
- Reduced motion disables decorative motion and immediately shows final figures. Live preference changes are respected. Screen readers receive final metric values rather than every frame of a counter.
- Marketing styles are scoped to `.public-site`. Contract calls, wallet actions and operational workflows are unchanged.

The fallback is scoped to the public shell, handles lazy navigation and resizes, and disconnects when reduced motion is requested or the shell unmounts. No application dependency was added for this restoration.

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

Set `PALISSAGE_PREVIEW_URL` to test another local port, `PALISSAGE_CHROMIUM_PATH` to use an existing Chromium executable, or `PALISSAGE_SCREENSHOTS` to choose the output directory. Repeat with `PALISSAGE_FORCE_SCROLL_FALLBACK=1` to exercise the JavaScript fallback in Chromium by overriding feature detection. This is a fallback-path check, not evidence of a Firefox or Safari run.

The regression check measures bottle, origin label, hero crop, reading bar, both audience icons and landscape/lettering movement, and checks the offscreen reveal state before scrolling. Its source reference is commit `c4a95eb857357f901afa43a5cfef71e947d7d308`; subsequent photography and localization remain in place.
