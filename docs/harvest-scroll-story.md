# Landing harvest story

Chapters 01–03 share a sticky photographic sequence from two supplied films:
`UI/vid/Camera_gliding_through_vineyard_…_20260920022842.mp4` opens chapter 01;
`UI/vid/Drone_flying_through_vineyard_ha…_20260920023005.mp4` carries chapters 02–03.
The harvest source starts at 2 seconds: its first 25% is removed.
The six-second vineyard approach blends into the remaining six-second harvest
with a half-second crossfade, producing 138 WebP frames at 12 fps — roughly one
frame per 19 px of scroll, which is as fine as a scrubber can actually show, and
light enough (7.4 MB wide, 3.5 MB small) to arrive ahead of the reader. The vineyard
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

Frames load once the story is within 1400 px, six requests at a time, in a
coarse-to-fine order: every sixteenth frame, then every eighth, and so on down to
all of them. Coverage is therefore even across the whole timeline from the first
second, and the frame the reader is actually on jumps the queue. The compressed
bytes are kept for every frame that arrives; decoding happens off the main thread
through `createImageBitmap`, and the decoded frames are an LRU bounded by screen
size, so re-decoding after a jump costs nothing on the network. While the exact
frame decodes, the nearest one already held is drawn — the picture always tracks
the scroll and sharpens onto the requested frame, instead of standing still.

The scroll frame itself reads layout once, writes the shade and timeline custom
properties on the four leaf elements that consume them, and draws. Nothing reads
layout after a style write, no inherited property is written on the section root,
and the shades are promoted only while the story is near, so their opacity moves
on the compositor instead of repainting full-viewport gradients. The canvas backing
store is never larger than the frames can fill.

Small screens initially select the 640 px sequence; larger screens select 1152 px.
A resize keeps that chosen source to avoid fetching both sets. Only one resolution
is used. A slow connection (`effectiveType` 3g or below) stops at the every-second-frame
tier. An image failure falls back to the poster. Reduced motion and Save-Data skip
sequence requests; reduced motion also removes sticky presentation and keeps all
content visible.

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
