# Landing harvest story

Chapters 01–03 share a sticky photographic sequence from two supplied films:
`UI/vid/Camera_gliding_through_vineyard_…_20260920022842.mp4` opens chapter 01;
`UI/vid/Drone_flying_through_vineyard_ha…_20260920023005.mp4` carries chapters 02–03.
The harvest source starts at 2 seconds: its first 48 frames (25%) are removed.
The six-second vineyard approach blends into the remaining six-second harvest
with a half-second crossfade, producing 276 WebP frames at 24 fps. The vineyard
and transition occupy the first third of the scroll range; harvest fills the rest.
Chapter 01's copy sits on the right; chapter 03 is centered. The shading follows
these positions directly with scroll, maintaining contrast in both directions.
Scrolling maps directly to a frame index; there is no video element, autoplay,
playback clock, wheel interception, or continuous animation loop. The original
hero and chapters 04 onward retain their published layout.

`HarvestStory.tsx` owns the editorial content; `useHarvestSequence.ts` owns the
canvas. Only scroll, resize, visibility, preference changes and requested-frame
completion cause updates. Native scrolling and browser history remain intact.
The bottom timeline is decorative; all headings, descriptions and links remain
regular accessible HTML. Marketing figures are final values, not timed counters.

Frames load near the story, with at most four simultaneous requests and 32 decoded
images retained. The queue prioritises the requested frame and changes direction
with scrolling. Small screens initially select the 640 px sequence; larger
screens select 1280 px. A resize keeps that chosen source to avoid fetching both
sets. Only one resolution is used, and frames are requested around the user's
current position. An image failure
falls back to the poster. Reduced motion and Save-Data skip sequence requests;
reduced motion also removes sticky presentation and keeps all content visible.

Regenerate assets from the source with `python3 scripts/prepare-harvest-frames.py`
(requires ffmpeg). Source films remain outside the frontend repository; generated
frames and the poster belong in the frontend repository with the code.

Run `npm run build`, `npm run lint`, and `node scripts/check-harvest-story.mjs`.
The browser check accepts `PALISSAGE_PLAYWRIGHT_PATH`, `PALISSAGE_CHROMIUM_PATH`,
`PALISSAGE_PREVIEW_URL` and `PALISSAGE_SCREENSHOTS`, matching the existing public
motion check. It compares canvas hashes after forward, reverse and stationary
scroll; samples intermediate frames; checks 320/390/768/1440 px, history restoration,
live motion preferences, French/dark mode, smaller assets, Save-Data and failed
requests. `check-public-motion.mjs` covers the surrounding public-site behavior.

Work started on `feat/scroll-harvest-story` at the existing `origin/main`
`ec92c5810071da85e20dc33e7f22c962d35fed18`, also the local `main` tip. Its reflog
records a previous push. A fresh remote fetch was unavailable because GitHub
authentication failed, so remote freshness was not independently established.
