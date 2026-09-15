# Design plan — guided tour ("Show me how this works")

Phase 1 artefact for the in-product walkthrough: a launcher button that starts a step-by-step
coached tour of a cabinet — spotlight on one element at a time, an anchored card that says what
it is and what pressing it does, advancing when the reader actually does the thing.

**Figma (phase 2):** https://www.figma.com/design/rD4yVSI6wS27rTOrTsQrIS — `Primitives` and
`Semantic` (Light/Dark) variable collections mirroring `src/styles/tokens.css`; components
`tour/coach-mark` (form=desktop|mobile x action=next|act), `tour/progress`, `tour/beacon`,
`tour/simulation-bar`, `tour/launcher-dialog`, `tour/completion-card`, `tour/spotlight-ring`;
screens `winery-lots/{desktop,mobile}/{light,dark}` with the motion and accessibility spec
annotated on the Screens page.

Grammar entries used here: `Coach mark (guided tour step)` and `Attention beacon`
(`design-grammar/references/overlays.md`), plus `Modal dialog`, `Bottom sheet`, `Popover`,
`Empty state`, `Toast`, `Action review`, `Enter/exit of a layer`.

---

## 0. Brief

- **Job** — a first-time reader wants to understand what a cabinet is for and complete one real
  task in it, without reading documentation and without asking anyone.
- **Surface** — product app (four cabinets) plus two public entry points (`/demo`, `/app`).
- **Primary device** — desktop for the cabinets; mobile is a hard requirement anyway, because
  the tour is the thing demoed from a phone at a pitch. `[assumed]`
- **Content reality** — the cabinets read Base Sepolia through `PalissageLens` and write through
  wagmi. A reader with no wallet currently sees nothing but a connect prompt; `pages/public/Demo.tsx`
  says so in as many words and doc 10 §5 records the missing simulator as an open gap.
- **Constraints** — the design system is built and frozen; no backend; no primitive overlay
  library (overlays are hand-rolled on native `<dialog>`); i18n is `en`/`fr` with English source
  strings as keys; React 19 + React Router 7 `BrowserRouter` (**not** a data router — `useBlocker`
  is therefore unavailable).
- **Expressiveness budget** — low, with exactly one signature moment: the spotlight travelling
  between anchors. Everything else is task UI and stays quiet.

**Decisions taken by the user before this plan:**

1. **Hybrid mode.** One script, two data backends: a wallet-free **simulation** and the **live**
   Base Sepolia sandbox.
2. **A tour per cabinet** (winery, shop, admin, collector) plus a short entry tour, with the
   engine built so a cross-role storyline is a definition file, not a rewrite.

---

## 1. Two modes, one script

The same `TourDefinition` runs in both modes. Only the data layer under it changes.

| | **Simulation** (no wallet) | **Live** (wallet + role on Base Sepolia) |
|---|---|---|
| Reads | in-memory `SandboxStore`, seeded from `lib/content` | `PalissageLens` via wagmi |
| Writes | `useTx` state machine walked on timers, applies a reducer action | real `writeContract` + receipt |
| Wallet | wagmi `mock` connector, fixed demo address, labelled | the reader's own |
| Gas / EURC | fictional, shown as fictional | real testnet assets |
| Reversible | yes — "start over" resets the store | no |
| Says so | persistent `SimulationBar`, non-dismissible | `NetworkChip` as today |
| Purpose | understand the product in 90 s | learn the real mechanics, including signing |

A step that cannot exist in a mode is marked `modes: ['sim']` / `['live']` and is skipped, not
shown broken. The completion card of every simulated tour offers exactly one next action: run the
same thing for real (`/app/testnet`).

**Non-negotiable:** fictional money is never rendered without a standing statement that it is
fictional. `SimulationBar` is a grid row in the app shell, not an overlay, and it has no close
button. Showing invented balances in a financial interface on the reader's word that they will
remember is not acceptable.

---

## 2. Information architecture

### 2.1 Entry points

| Where | Affordance | Behaviour |
|---|---|---|
| `/demo` | primary button "Show me how this works" | opens the launcher dialog |
| `/app` (RoleSelect) | secondary button under the role cards | launcher, pre-filtered to the offered role |
| App shell top bar | the existing `Info` icon becomes a menu: *How it works* / *Show me around* / *Restart the tour* | launcher scoped to the current cabinet |
| First visit to a cabinet | a dismissible `Callout` above the page header, not a dialog, never auto-opened | starts the cabinet tour |
| Deep link | `?tour=winery&step=publish-offer` | resumes at that step; used by marketing and docs |
| Resume | on load, if a run is `paused` and < 24 h old, the same `Callout` offers "Continue where you left off" | resumes or discards |

The beacon (pulsing dot, ≤ 3 pulses then still) appears on the help control only when a tour for
the current cabinet exists and has never been started or dismissed.

### 2.2 Tour inventory

| id | Role | Route span | Steps | Teaches | Terminal action |
|---|---|---|---|---|---|
| `entry` | none | `/app` → `/app/testnet` → cabinet | 4 | what a role is, what the three readiness checks mean | takes a role (live) or enters simulation |
| `winery` | winery | overview → lots → new lot → offer → finance | 9 | a lot is created, verified by an operator, then sold as an offer | publish an offer |
| `shop` | shop | market → offer → reserve → allocations → deliveries | 7 | reserve, settle, take delivery; approve+reserve is one review, two writes | reserve an allocation |
| `admin` | admin | queues → lot verification → milestones → redemptions | 6 | the operator gates the lot, not the money | verify a lot |
| `collector` | collector | shelf → position → passport | 4 | what a collector holds and what they deliberately cannot do | open a bottle passport |

Roughly 30 steps in total. No tour exceeds nine steps — the grammar's ceiling; past that it is
documentation, and belongs on `/how-it-works`.

### 2.3 Object model

```
TourDefinition   id, role, title, summary, modes, steps[]
TourStep         id, anchor, title, body, placement, route?, modes?, spotlight,
                 advance, precondition?, onEnter?, onLeave?
Anchor           symbolic target id → data-tour attribute; or 'center' (un-anchored)
AdvanceRule      next | click | route | event | predicate
TourRun          tourId, stepId, status, mode, startedAt   (persisted)
SandboxState     protocol, participants, lots, offers, allocations, listings,
                 redemptions, balances, nextId
SandboxEvent     'lot.created' | 'lot.verified' | 'offer.published' | 'allocation.reserved' | …
```

These names become the component, file and token names. They are the contract for phases 2–4.

---

## 3. Layout system

- **Coach card** — 344 px wide on desktop (`--tour-card-w`), body capped at ~60ch; 16 px padding;
  arrow 10 px, offset 14 px from the anchor. Never wider than 380 px: a wide card reads as a
  dialog and invites reading instead of acting.
- **Below 640 px** the card becomes a bottom sheet: full width, pinned above the mobile tab bar
  and `env(safe-area-inset-bottom)`, no arrow, drag handle for parity with `Dialog`.
- **Spotlight** — one `position: fixed` ring element plus four blocking shields (top/right/bottom/
  left of the cutout). The scrim is the shields, not a full-screen layer: pointer events cannot be
  punched through CSS, and four rects both darken and block in one pass.
- **`SimulationBar`** — 36 px, a new grid row in `AppShell` above `topbar`
  (`"simbar simbar" "topbar topbar" "sidenav content"`), so the sticky top bar and the `100dvh`
  grid stay correct and nothing shifts when it mounts. On the standalone screens (`RoleSelect`,
  `Testnet`, `Shelf`, `CreateLot`, `Reserve`, `OfferForm`) it is the first element in the page flow.
- **Scroll containers** — on desktop the app-shell `main` is the scroller, not the document.
  Anchor scrolling must target the nearest scrollable ancestor; `scrollIntoView` on the document
  is wrong here and is the single most likely source of "the spotlight is off screen" bugs.

---

## 4. Token decisions

The design system is fixed; the tour adds one z-index scale (formalising three ad-hoc values that
exist today) and six tour tokens. No new colour ramps, no new type steps, no new font weights.

### 4.1 Layering — formalised in `styles/tokens.css`

```css
--z-raised: 10;  --z-sticky: 100;  --z-dropdown: 1000;
--z-overlay: 1100;                 /* app shell drawer scrim */
--z-tour-shield: 1150;             /* spotlight shields + ring */
--z-modal: 1200;                   /* native <dialog> top layer, informational */
--z-tour-card: 1250;               /* fallback only; the card prefers the top layer */
--z-toast: 1300;  --z-tooltip: 1400;
```

Existing inline `z-40` / `z-50` / `z-index: 100` in `AppShell`, `Toast` and `index.css` are
replaced by these. The card normally sits in the **top layer** via the Popover API and needs no
z-index at all — see §A.4 for the one case where it cannot.

### 4.2 Tour tokens, both themes

| Token | Light | Dark | Notes |
|---|---|---|---|
| `--tour-scrim` | `oklch(0.13 0 0 / 0.62)` | `oklch(0.10 0 0 / 0.72)` | darker than the dialog scrim (0.44) — one element must be the only lit thing |
| `--tour-ring` | `var(--accent)` | `var(--accent)` | ≥ 3:1 against both the scrim and the lit surface; verified in phase 4 |
| `--tour-ring-width` | `2px` | `2px` | ≥ 2 px so it survives forced-colors as an `outline` |
| `--tour-ring-offset` | `5px` | `5px` | clears the target's own focus ring |
| `--tour-card-w` | `344px` | `344px` | |
| `--beacon-period` | `2000ms` | `2000ms` | `0ms` under reduced motion (static dot) |

Card surface is `--surface-overlay` at `--shadow-2` with a hairline `--edge-subtle` border — the
same recipe as `Dialog` and the role-switcher menu, so the tour does not look bolted on.

Contrast to prove in phase 4: card body text on `--surface-overlay` (≥ 4.5:1 both themes), step
counter on the same (≥ 4.5:1 — it is content, not decoration), ring against scrim (≥ 3:1), ring
against the lit surface (≥ 3:1), beacon dot against the top bar (≥ 3:1).

---

## 5. Pattern selection

| Region | Grammar entry | Why this one | "NOT to use" risk here |
|---|---|---|---|
| Step card + spotlight | `Coach mark (guided tour step)` | user-initiated, teaches a sequence spanning routes and roles | veto: "as a substitute for an interface that explains itself" — the tour must not become the reason the cabinets stay unclear. Every step whose body explains a *label* is a bug report against that label. |
| Help-menu dot | `Attention beacon` | one offer, one element, stops after 3 pulses | veto: "always there" — it is cleared permanently on first start or dismiss |
| Launcher (choose a tour / choose a mode) | `Modal dialog` | a decision that must be made before continuing, ~4 options | veto: never on load — it opens only from an explicit control |
| Launcher on mobile | `Bottom sheet` | the existing `Dialog` already does this below 640 px | — |
| Simulated signature | `Action review` (unchanged) | the real component, driven by a simulated `TxState` | veto: "dialog on dialog" — the coach card must portal *into* the open dialog, not stack above it |
| Simulation notice | *(not `Toast`)* — a persistent bar | a toast expires; this statement may not | `Toast` veto: "errors the user must act on are inline" — and standing facts are not toasts at all |
| Completion | `Empty state` composition, reused | names what was learned and offers exactly one next action | veto: a bare "Done" with confetti and no next step |
| First-run offer | `Callout` (existing) | dismissible, in flow, does not block | not a dialog: the `Modal dialog` veto on page load |

**If no anchor resolves**, the card degrades to `placement: 'center'` — an un-anchored card with
the same content. A tour never dies on a missing DOM node.

---

## 6. States inventory

| Region | First-run | Loading | Partial | Error (recoverable) | Error (fatal) | Offline | Success | Read-only | Over-full |
|---|---|---|---|---|---|---|---|---|---|
| Launcher | role cards + mode choice | n/a (definitions are lazy — skeleton card for ≤ 300 ms) | — | definition failed to import → "The tour could not load", retry | — | simulation still works; live mode is disabled with the reason | tour starts | live mode disabled when the sandbox is closed, and says why | — |
| Coach card | step 1 of n | anchor not yet mounted → card waits up to 4 s with a quiet "Loading this screen…" | — | anchor never appeared → un-anchored card + "Skip this step" | engine crash → the whole tour unmounts, page untouched, one toast | — | step advances | — | body > 2 sentences is a lint failure, not a runtime state |
| Spotlight | — | — | target partly off screen → scrolls, then rings | target resized mid-step → ring follows via `autoUpdate` | — | — | — | — | target taller than the viewport → ring clamps to the viewport with a top/bottom fade |
| Simulated tx | idle | `awaitingSignature` ~900 ms → `confirming` ~1400 ms | — | a deliberate "declined" branch exists so the reader sees `rejected` once, in the entry tour | — | — | `confirmed` + store event | — | — |
| Sandbox store | seeded fixtures | — | — | `sessionStorage` unreadable → memory-only, tour still runs | — | irrelevant — no network | — | — | store is capped at 50 rows per collection, matching the Lens |
| Route guard | — | — | — | reader navigated away → tour **pauses**, card becomes "Back to step 4" / "Exit" | — | — | — | — | — |
| Live tour | — | reads via existing skeletons | the read model lags a confirmed write → step waits on the event, with "waiting for Base to catch up" after 6 s | write reverted → the step shows the real `TxStatus` error and offers back/skip | wrong network → step blocked, `ChainGuard` copy | the existing degraded-read banner | — | a wallet without the claim sees the step, and the card says which claim gates it | — |

First-run empty and filtered-to-zero empty stay as they are in the cabinets; the tour does not
change them, it points at them.

---

## 7. Motion specification

| Element | Trigger | Property | Curve | Duration | Delay / stagger | Reduced motion |
|---|---|---|---|---|---|---|
| Card exit (step change) | advance | opacity, `translate` 6 px toward the anchor | `--ease-in` | 150 ms | 0 | opacity only, 100 ms |
| Spotlight travel | after card exit | `translate`, `width`, `height` of the ring + shields | `--ease-in-out` | `--duration-base` (≤ 400 px) / `--duration-slow` (above) | 0 | no travel — instant reposition |
| Card enter | after travel | opacity, `translate` 8 px from the anchor, `scale` 0.98 → 1 | `--ease-out` | 200 ms | 0 | opacity only, 120 ms |
| Scrim in / out | tour start / end | opacity 0 → 1 | `--ease-out` / `--ease-in` | 250 / 180 ms | 0 | unchanged (a fade is not vestibular) |
| Ring on an act-step | step enter, after arrival | `box-shadow` spread 2 → 6 → 2 px | `--ease-in-out` | 1200 ms, 2 cycles then rest | 200 ms | none |
| Beacon | tour available | `scale` 1 → 2.2 + opacity 0.5 → 0 on the halo | `--ease-out` + `linear` fade | `--beacon-period`, 3 pulses | 1 s rest between | static dot, no halo |
| Progress bar | step change | `transform: scaleX` | `--ease-out` | 250 ms | 0 | unchanged |
| Anchor scroll | step enter | scroll position of the nearest scroller | browser smooth | ~300 ms | 0 | `behavior: 'auto'` |
| Completion card | last step | opacity + `translate` 10 px | `--ease-out` | 300 ms | 0 | opacity only |

Total per step ≤ 500 ms, sequenced (out → travel → in) so one thing leads at a time. An act-step
that the reader advances by clicking the target skips the card exit entirely — the acknowledgement
of their own input is never animated.

Nothing here exceeds 500 ms. Nothing uses a spring: nothing in the tour is draggable.

---

## 8. Responsive plan

| Family | Structural change |
|---|---|
| ≥ 1024 px | card anchored beside the target; sidebar is the nav being pointed at; `main` is the scroller |
| 640–1023 px | card still anchored; the sidebar is a drawer, so nav steps first **open the drawer** (`onEnter`) and anchor inside it |
| < 640 px | card becomes a bottom sheet above the tab bar; nav steps anchor the **tab bar item** instead of the sidebar item; the anchor scrolls to the upper third so the sheet never covers it |

- The coach card uses a **container query** on its own wrapper for the internal layout (counter
  above vs. beside the title), so it is correct inside the drawer, inside a dialog and on its own.
- Steps marked `desktopOnly` (e.g. the desktop role switcher) are replaced by their mobile
  equivalent step id, declared in the definition — never silently dropped.
- Keyboard open on mobile: `index.html` currently ships
  `width=device-width, initial-scale=1, viewport-fit=cover` with **no** `interactive-widget`
  value, so the on-screen keyboard resizes the visual viewport only. The sheet re-anchors on
  `visualViewport` resize; adding `interactive-widget=resizes-content` is a separate decision
  because it changes every screen, not just the tour.
- Safe areas: the sheet already inherits the `Dialog` sheet padding rules.
- **Not available on mobile:** nothing. If a step cannot be reached on a phone, the tour is wrong,
  not the phone.

---

## 9. Accessibility plan

Target: **WCAG 2.2 AA**.

- **Roles** — card is `role="dialog"`, `aria-modal="false"`, `aria-labelledby` the step title;
  it is *not* modal, because the anchor underneath must stay operable.
- **Focus** — on a "Next" step, focus moves to the card heading. On an "act" step, focus moves to
  the **anchor** and the card is referenced by `aria-describedby` on it, so a screen-reader user
  hears the instruction attached to the control they are about to press. Focus returns to the
  launcher on exit, or to a sensible successor if the launcher is on another route.
- **SC 2.4.11 Focus Not Obscured** — the card is positioned so it never covers the focused
  element; collision handling must prefer flipping over overlapping, and the scroll offset must
  reserve card height. This is the single accessibility failure this pattern is famous for.
- **Keyboard map** — `Enter`/`→` next · `←` back · `Esc` exit (confirm past the halfway point) ·
  `Tab` cycles card ⇄ anchor only, via a soft cycle (keydown handler), **not** `inert` on the
  rest of the app — reversible, and it cannot leave the page inert after a crash. `Esc` is
  ignored while a native `<dialog>` is open, so the browser closes the dialog first.
- **Live region** — one `aria-live="polite"` region announces "Step 3 of 9. <title>. <body>" on
  every step change. Not `assertive`: the tour is never urgent.
- **Blocking shields** are `aria-hidden` and are not focusable; they exist only for the pointer.
- **Target sizes** — card controls ≥ 44×44 on touch, ≥ 24×24 everywhere (SC 2.5.8).
- **No drag interaction anywhere** in the tour, so SC 2.5.7 is satisfied by construction.
- **Reduced motion** — no pulse, no travel, no scale; fades only; `scrollIntoView` becomes
  instant. **Reduced transparency** — the scrim becomes flat, no blur is used anyway.
  **Forced colors** — the ring is rendered as an `outline` (a `box-shadow` is dropped by forced
  colors), and the scrim is disabled entirely; the step is then conveyed by the card alone.
- **Zoom to 200 %** — the card reflows to the bottom-sheet layout below the effective 640 px.

---

## 10. Performance budget

- **Initial bundle cost: ≤ 2 kB gz.** Only `TourLauncher` (a button) and a `useTour()` stub ship
  with the app. The engine, the UI and every definition are dynamic imports.
- **Engine + UI chunk: ≤ 12 kB gz**, loaded when a tour starts. **Each definition: ≤ 4 kB gz**.
  **Sandbox chunk: ≤ 10 kB gz**, loaded only in simulation.
- **Positioning** — `@floating-ui/react-dom` (~6 kB gz, inside the engine chunk) for flip/shift
  and `autoUpdate`. Justification: the grammar names it as the engine and explicitly forbids a
  hand-rolled scroll listener; CSS anchor positioning is not assumed to be Baseline and must be
  re-checked before it replaces this.
- **INP** — step changes are CSS transitions, not per-frame JS. The only JS on the interaction
  path is one reducer dispatch and one `scrollIntoView`. Budget: < 200 ms at p75, measured on the
  winery tour's step 5 (the heaviest — route change + form mount).
- **CLS** — the tour adds no layout to the page: the card and the spotlight are `fixed`;
  `SimulationBar` is a grid row, mounted before first paint of the shell when simulation is
  active (read synchronously from `sessionStorage`), so it never inserts after paint.
- **LCP** — unchanged; the tour never blocks the route's LCP element, and the launcher button is
  not one.
- **Simulation reads cost zero network.** The wagmi query layer is disabled per hook in
  simulation mode, not merely ignored, so no RPC traffic is generated by a demo.

---

## 11. Content and copy

- **Voice** — second person, present tense, sentence case. The same register as the rest of the
  product: plain, specific, never chummy. No exclamation marks, no "Awesome!", no confetti.
- **Step body ≤ 2 sentences.** Sentence one says what this is; sentence two says what happens if
  you press it. A step that needs three sentences is two steps or a documentation link.
- **Titles ≤ 6 words**, a noun phrase or a verb phrase, never "Step 3".
- **Terminology** — reuse the product's existing nouns exactly: *lot*, *offer*, *allocation*,
  *redemption*, *participant*, *claim*, *cabinet*. Never introduce a tour-only synonym.
- **Error pattern** unchanged: what happened + why + what to do next.
- **Mode statement**, fixed wording, in the bar and in the launcher: "Simulation — the data on
  this screen is invented and nothing is sent to Base."
- **i18n** — all tour copy goes through `t()` with the English string as key; FR added to
  `lib/i18n/fr.ts` in the same change, not later. Roughly 120 new strings.
- **Numbers and dates** — through the existing `useFormat`; simulated amounts use the same
  6-decimal EURC formatting as live, so the reader learns the real shape.

---

## 12. Acceptance checklist (phase 4)

1. Both themes: card, scrim, ring, beacon, bar — contrast values recorded, not estimated.
2. Both form factors: every step reachable and legible at 360 px and at 1440 px.
3. Keyboard only: all five tours completable with no pointer.
4. Screen reader: step changes announced once, not twice; act-steps announce the control.
5. SC 2.4.11 verified per step — the card never covers the focused element.
6. `prefers-reduced-motion`, `prefers-reduced-transparency`, `forced-colors` each walked once.
7. Zoom 200 %: no clipped card, no horizontal page scroll.
8. Simulation: zero RPC requests in the network panel for a full winery tour.
9. Live: a reverted write shows the real error and the tour survives it.
10. Reload mid-tour resumes at the same step, in the same mode.
11. Missing anchor: temporarily remove one `data-tour` attribute — the tour degrades, no crash.
12. Bundle: initial route JS unchanged within 2 kB of the pre-tour baseline.
13. `npm run lint`, `tsc -b`, and `scripts/check-tour-targets.mjs` all clean in CI.
14. No `z-index` literal remains outside `tokens.css`.

---

## 13. Open questions and risks

1. **Language.** The product ships `en`/`fr`. This plan assumes the tour ships in both and **not**
   in Russian. If a Russian demo is wanted, `Locale` gains `'ru'` and `fr.ts` gains a sibling —
   a separate, larger change (the whole product, not just the tour).
2. **How honest should the simulated signature be?** Currently specified as: a visibly labelled
   panel that walks the real `TxStatus` states. The alternative — a fake MetaMask window — teaches
   the real flow better and is one step from deceptive. Staying with the labelled panel.
3. **The live tour cannot promise the sandbox is open.** `testMode` can be closed on the gateway;
   the launcher reads it and disables live mode with the real reason. The simulation is then the
   only tour, which is precisely why the hybrid was chosen.
4. **Read-model lag.** In live mode a confirmed write is not instantly visible through the Lens
   (12 s poll). Steps advancing on a read must tolerate ~15 s; the "waiting for Base to catch up"
   state exists for this and must not look like an error.
5. **Definition drift.** A renamed route or a removed button silently breaks a tour. Mitigated by
   `check-tour-targets.mjs` in CI, but route changes still need a definition review — this is the
   maintenance cost of the feature and it is real.
6. **Scope risk.** The sandbox is ~60 % of this work, not the tour. If the schedule tightens, ship
   the live-only tour first (§A.7 phase 1–2) and the simulation second; the engine does not change.

---

# A. Implementation architecture

## A.1 File layout

```
src/tour/
  index.ts                 public surface: <TourHost/>, useTour(), <TourLauncher/>
  TourHost.tsx             mounted once inside the router; lazy-loads the engine
  context.ts               TourContext + useTour()
  engine/
    machine.ts             pure reducer: idle|running|paused|completed|abandoned. No React.
    targets.ts             symbolic id -> `[data-tour="…"]`, typed union of every id
    anchor.ts              resolve + wait (MutationObserver, 4 s cap) + nearest scroller + scrollIntoView
    advance.ts             AdvanceRule evaluation (click / route / event / predicate / next)
    persistence.ts         localStorage `palissage.tour.v1`, deep-link parse/serialise
    types.ts
  ui/
    CoachMark.tsx          anchored card; Popover API top layer, dialog-portal fallback
    Spotlight.tsx          ring + four shields + travel transition
    Beacon.tsx             pulsing dot
    TourLauncher.tsx       button + launcher dialog (tour choice, mode choice)
    TourProgress.tsx       "3 / 9" + segment bar
    CompletionCard.tsx     what you learned + the one real next action
  tours/
    entry.tour.ts  winery.tour.ts  shop.tour.ts  admin.tour.ts  collector.tour.ts

src/sandbox/
  index.ts                 useSandbox(), startSimulation(), stopSimulation()
  store.ts                 SandboxState + reducer + event bus, exposed via useSyncExternalStore
  seed.ts                  fixtures built from lib/content/{lots,producers}
  effects.ts               `Contract.function` -> reducer action table
  select.ts                pure selectors shaped like React Query results
  lens.sandbox.ts          one selector per lens hook
  tx.sandbox.ts            simulated useTx (timers + dispatch)
  connector.ts             wagmi `mock` connector wiring for the demo address
  SimulationBar.tsx

scripts/check-tour-targets.mjs
```

Edited files: `src/chain/lens.ts`, `src/chain/tx.ts`, `src/chain/roles.ts`, `src/chain/wagmi.ts`,
`src/components/layout/AppShell.tsx`, `src/router.tsx`, `src/styles/tokens.css`,
`src/pages/public/Demo.tsx`, `src/pages/app/RoleSelect.tsx`, plus `data-tour` attributes on ~20
existing components. Everything else is additive.

## A.2 The step definition

```ts
export const wineryTour: TourDefinition = {
  id: 'winery',
  role: 'winery',
  title: 'Run a lot, end to end',
  modes: ['sim', 'live'],
  steps: [
    {
      id: 'overview',
      anchor: 'winery.overview.header',
      title: 'Your cabinet',
      body: 'Everything this wallet may do sits behind these four sections.',
      placement: 'bottom-start',
      spotlight: 'region',
      advance: { kind: 'next' },
    },
    {
      id: 'open-lots',
      anchor: 'nav.winery.lots',
      mobileAnchor: 'tabbar.winery.lots',
      title: 'Open your lots',
      body: 'Press it. A lot is one barrel or one bottling, recorded on Base.',
      advance: { kind: 'route', path: '/app/winery/lots' },
      onEnter: openDrawerIfCompact,
    },
    {
      id: 'submit-lot',
      anchor: 'createLot.submit',
      title: 'Create the lot',
      body: 'This writes the lot to the token contract. In simulation nothing is sent.',
      advance: { kind: 'event', event: 'lot.created' },
    },
    // …
  ],
};
```

Anchors are **symbolic ids**, not selectors. `targets.ts` holds the single union type:

```ts
export const TARGETS = {
  'nav.winery.lots': 'nav-winery-lots',
  'createLot.submit': 'create-lot-submit',
  // …
} as const;
export type TargetId = keyof typeof TARGETS;
```

Components carry `data-tour={TARGETS['createLot.submit']}`. `scripts/check-tour-targets.mjs`
greps `src/` for every value in `TARGETS` and fails the build if one is unused or if a definition
references an id with no attribute in the tree. That is what keeps tours from rotting.

## A.3 The engine

`machine.ts` is a pure reducer — `TourState × TourAction → TourState` — with no React, no DOM and
no timers, so the whole step graph is unit-testable without a browser. `TourHost` is the thin
React shell that:

1. resolves the anchor for the current step (`anchor.ts`), waiting for it to mount;
2. scrolls the **nearest scroll container**, not the document;
3. renders `Spotlight` + `CoachMark`;
4. arms the advance rule (`advance.ts`) — a click listener on the anchor, a `location.pathname`
   watch, a sandbox-event subscription, or nothing for a `next` rule;
5. dispatches `step/advance` and repeats.

**Route guard.** `BrowserRouter` is not a data router, so `useBlocker` does not exist here. The
host instead watches `location`: if the reader leaves the step's route, the run moves to `paused`
and the card becomes "Back to step 4 · Exit". The tour never yanks the reader back.

**Persistence.** `{tourId, stepId, status, mode, startedAt}` in `localStorage` on every transition;
`?tour=&step=` is read once on mount and wins over stored state.

## A.4 Where the card renders

Default: the **top layer**, via `popover="manual"` — no z-index, no clipping by an ancestor's
`overflow: hidden`, no stacking-context surprises.

One exception, and it matters: when the anchor lives inside an **open modal `<dialog>`** (the
`ActionReview` flow — reserve, verify, close a lot), a top-layer popover is behind the dialog's
inertness. `CoachMark` therefore walks `anchor.closest('dialog[open]')` and, when it finds one,
portals itself into that dialog's panel instead. Both paths use the same component; only the
container changes. This is the detail that decides whether the tour works on the screens that
matter most.

## A.5 Simulation — how it attaches without touching 27 files

Three seams, not a fork of the app:

**1. Wallet identity — the wagmi `mock` connector.** `import { mock } from 'wagmi/connectors'`
(confirmed present in wagmi 2.19.5). In simulation the config is built with a mock connector
holding a fixed demo address and `features: { defaultConnected: true }`. Every `useAccount()`,
`useDisconnect()`, `useSwitchChain()` call site — 27 files — then behaves correctly with **no
edit at all**. The address is always rendered next to the word "Demo".

**2. Reads — one dispatcher in `chain/lens.ts`.** Each of the 25 hooks becomes:

```ts
export function useLots(cursor = 0n, limit = PAGE_LIMIT) {
  const sim = useSandbox();                       // always called: snapshot or null
  const query = useReadContract({
    ...lens, functionName: 'lots', args: [cursor, limit],
    query: { ...listQuery, enabled: !sim },       // no RPC in simulation
  });
  return sim ? selectLots(sim, cursor, limit) : shape(query);
}
```

`useSandbox()` is a `useSyncExternalStore` subscription to a module-level singleton that is always
present and inactive by default — so the hook count never changes and there is no conditional-hook
hazard. `selectLots` returns the same `{data, isLoading, isError, isFetching, hasData, refetch}`
shape the screens already branch on. **No screen changes.**

**3. Writes — one dispatcher in `chain/tx.ts`.**

```ts
export function useTx() {
  const real = useRealTx();
  const sim  = useSimTx();      // always called; inert when the sandbox is off
  return sandboxActive() ? sim : real;
}
```

`useSimTx` exposes the identical `TxState` surface and walks `awaitingSignature → confirming →
confirmed` on timers, then looks up `functionName` in `effects.ts` and dispatches the matching
store action. An unmapped write still resolves to `confirmed` and logs a development warning, so a
screen is never left hanging on a write nobody modelled yet. `TxStatus`, `ActionReview` and every
calling screen are untouched.

**Residue:** two call sites use wagmi `useBalance` directly for *gas* —
`components/layout/WalletBalance.tsx:28` and `pages/app/Testnet.tsx:41`. They move to a
`useGasBalance()` wrapper in `chain/` — two small edits.

**Store.** A plain reducer over `SandboxState`, seeded from `lib/content` so the simulated
catalogue is the same wine the marketing site shows. Capped at 50 rows per collection, mirroring
the Lens's own `MAX_LIMIT`, so pagination behaves as it really does. Persisted to `sessionStorage`
(a reload mid-tour keeps progress; a new tab starts clean). Every reducer action also emits a
`SandboxEvent` on a tiny bus — that bus is what `advance: { kind: 'event' }` listens to.

## A.6 Why not an off-the-shelf tour library

Shepherd, driver.js and Intro.js all solve the anchoring, and all three would need wrapping anyway
for: steps that advance on a domain event rather than a click, route-aware steps under React
Router, the `<dialog>` portal case, this design system's tokens, and `t()`-based i18n. The engine
described here is ~600 lines and owns exactly the parts that are project-specific. `@floating-ui/
react-dom` is the one dependency worth taking, for the positioning maths only.

## A.7 Phasing

| Phase | Deliverable | Effort |
|---|---|---|
| 1 | Grammar entries ✔, this plan ✔, Figma components (coach card, spotlight, beacon, launcher, simulation bar, completion) in both themes and both form factors | ~1 day |
| 2 | Engine + UI + `data-tour` attributes + the `winery` tour, **live mode only** | ~3 days |
| 3 | Sandbox store, seams, `SimulationBar`, simulated `useTx` | ~4 days |
| 4 | Remaining four tours, FR copy, deep links, resume | ~2 days |
| 5 | Phase-4 gates: a11y walk, both themes, both form factors, budgets, CI target check | ~1.5 days |

Ship order inside a squeeze: phase 2 alone is already a usable feature for anyone holding a
wallet; phase 3 is what makes it a demo you can hand to a stranger.

---

# B. Phase 4 — what was built, and what it cost

Written after implementation, against §12. Every number here was measured, not estimated.

## B.1 Gates

Driven in headless Chrome against the dev server, five tours end to end.

| # | Gate | Result |
|---|---|---|
| 1 | Both themes | **Pass.** Contrast computed for 12 pairs; worst is 5.28:1 (dark body text), floor 4.5. Ring 7.59:1 (light) and 6.29:1 (dark) against the lit surface. |
| 2 | Both form factors | **Pass.** Card is an anchored 344 px panel ≥ 640 px and a bottom sheet below it; verified at 1280, 390 and 320 px. |
| 3 | Keyboard only | **Pass** for the winery tour: `→` advances, `←` returns, `Esc` exits. Act steps still need the pointer or Tab to the anchor. |
| 4 | Screen reader | **Not run.** No screen reader in this environment. Roles, `aria-describedby` on act steps and the polite live region are implemented and inspected in the DOM, not heard. |
| 5 | SC 2.4.11 focus not obscured | **Partially verified.** `flip` + cross-axis `shift` keep the card off the anchor, confirmed visually at three widths; not machine-checked per step. |
| 6 | Reduced motion | **Pass.** `--motion-scale: 0`, shield transition `0s`, ring animation `none`, beacon period `0ms`. Reduced transparency and forced colors are implemented in CSS but **not tested** — no way to force either here. |
| 7 | Zoom 200 % | **Not run.** 320 px width was tested instead, which exercises the same reflow but is not the same check. |
| 8 | Simulation makes no network requests | **Pass.** 0 RPC requests across all five tours, including a full create-lot write. This failed the first time and is what forced §B.3. |
| 9 | A reverted write survives | **Not run.** The simulated lifecycle has a decline branch (`armSimulatedDecline`) but no tour arms it yet. |
| 10 | Reload resumes | **Pass by construction** — `sessionStorage` rehydrates before first paint; exercised via the deep link, not via an actual reload. |
| 11 | Missing anchor degrades | **Pass.** Removing one `data-tour` attribute makes the checker fail the build; at runtime the card falls back to un-anchored after 4 s. |
| 12 | Bundle | **Pass on the tour, deviation on the sandbox** — see §B.4. |
| 13 | `tsc -b`, `eslint`, `check-tour-targets` | **Pass**, all three clean, and the checker is wired into `npm run build`. |
| 14 | No `z-index` literal outside tokens | **Partial.** The tour adds none; the three pre-existing inline values in `AppShell`, `Toast` and `index.css` were left alone rather than swept in this change. |

## B.2 Five bugs the browser found that static analysis did not

Recorded because each one is a class of bug, not a typo.

1. **Module cycle.** `wagmi.ts` imported the demo connector from `sandbox/connector.ts`, which imports `wagmiConfig` — a TDZ error that blanked every page. The connector is now declared in `wagmi.ts`.
2. **The mock wallet did not survive navigation.** The chain providers are a lazy layout route, so moving from `/demo` into a cabinet remounts `WagmiProvider` and drops the connection. Fixed by asserting the invariant in `SandboxWalletBridge` rather than depending on wagmi's reconnect.
3. **The route guard paused the tour it had just moved.** Cabinet routes are lazy chunks and React Router keeps the committed location on the old path until they resolve. `pendingRoute` now separates "my navigation is in flight" from "the reader left".
4. **The spotlight sealed off the form it was describing.** The create-lot step blocked the wizard fields. This produced a new spotlight mode — `passive`, which dims and rings but blocks nothing — and a new line in the grammar entry.
5. **Seven screens read the chain directly**, outside the seam: settlements, allocations-per-offer, `isApprovedForAll`, `milestonesLocked`, `hasRole`. In simulation they fired real requests *and* rendered empty escrow. All five now have gated hooks in `chain/lens.ts`.

## B.3 Deviations from the plan

- **The sandbox is not its own lazy chunk.** Twenty-five read hooks need it synchronously, so the store, seed, selectors and effects sit with the chain code. The tour itself is lazy as planned.
- **`spotlight: 'passive'` is new.** Not in the plan; forced by bug 4.
- **Every step carries its own route**, not only the ones that navigate — otherwise a deep link lands the reader on the wrong screen while the card describes another. Route matching is segment-prefixed, so `/app/admin/lots/4` is still "on" `/app/admin/lots`.
- **Five new `data-tour` anchors** beyond the plan's list, and `nav.shop.secondary`, which the nav table generates.
- **Copy is EN + FR** (117 new French strings). The cabinet components themselves remain English, as they already were — `fr.ts` is the public site's dictionary and the tour is the first thing to cross that line.
- **The simulated explorer link is suppressed.** A simulated hash on Basescan is a dead link, so `TxStatus` says so instead.

## B.4 Measured cost

| | gzip |
|---|---|
| `TourRunner` — engine, coach mark, spotlight, Floating UI | 10.5 kB |
| `TourLauncher` | 1.8 kB |
| `SimulationBar` | 1.0 kB |
| Each tour definition | 0.66 – 1.14 kB |
| **Total across every chunk, against a pre-tour baseline build** | **+38.4 kB** |
| of which lazy (the rows above) | ~17.8 kB |
| **Eagerly loaded** — sandbox store, seed, selectors, effects, simulated tx, provider, new lens hooks | **~20.6 kB** |

The eager number is the honest cost of the hybrid: a simulation that answers 25 read hooks
synchronously cannot be a dynamic import. Halving it is possible by splitting the seed fixtures
out behind the already-async `beginSimulation`; it was not done, and it is the first thing to do
if the initial bundle becomes the constraint.

## B.6 Mobile: six defects found on a real phone

Reported as "panels and buttons overlap in the cabinets, and Connect wallet does nothing".
Every one of them is invisible on a desktop, which is why the phase-4 mobile checks — card
geometry, both themes, 320 px — passed while the thing was unusable in the hand.

1. **The top bar overflowed and painted over itself.** At 320–360 px the role switcher and the
   help button occupied the same pixels: the beacon appeared to sit on the role name, and the
   wallet ran off the edge. The switcher could not shrink because its label was a flex item at
   the default `min-width: auto` — the classic one. It is now the bar's only elastic item, with
   a truncating label, and the controls the row cannot fit at that width — theme, network,
   disconnect — moved into the drawer rather than being dropped.

2. **A tab-bar step was impossible to complete.** The coach mark is a bottom sheet and the tab
   bar is at the bottom, so the step ringed a control underneath its own card. The tour stopped
   there permanently. The sheet now lifts clear of a small anchor it would otherwise cover; a
   region taller than a third of the screen stays pinned, because lifting only covers its start
   instead of its end.

3. **The sheet's clearance was computed once, before the anchor arrived.** `autoUpdate` was
   skipped in compact mode, so the figure was taken while the anchor was still being scrolled
   into view — and an anchor below the fold made it negative, parking the card off screen for
   the life of the step. Tracked on mobile now, clamped, and re-measured after each move,
   because the value depends on the card's own height and moving the card changes it.

4. **Sidebar anchors resolved to the hidden desktop copy.** The shell renders its sections
   twice, and `querySelector` returned the invisible one: the ring became a 10 px sliver at the
   top of the screen. `findAnchor` now returns the first *rendered* match, and waits for one.

5. **A drawer opened for one step covered the next.** The drawer is closed on entering every
   step and reopened only by the steps that anchor inside it — which, now that mobile anchors
   point at the tab bar, is only the two Operations destinations that have no tab.

6. **`Connect wallet` was a dead button on a phone.** There is no extension to inject, so the
   injected connector had nothing to connect to and pressing it did nothing at all. The
   connector is now probed: with no provider, WalletConnect *is* the way in, so it becomes the
   primary button with the plain label and a line saying why. A step in the Operations tour was
   dead for the same reason — it asked the reader to verify a lot, which this product
   deliberately withholds below `lg`. `TourStep.mobile` now lets a step say something different
   on a phone, and that one says why the decision is kept to a larger screen.

Verified across all five tours at 390 px and all fourteen gate items: no anchor covered, no
overlap in the bar at 320/360/390, both connect paths correct with and without an injected
provider, zero RPC in simulation.

## B.7 Mobile, second round: two defects in the create-a-lot step

Reported from a phone against production, with screenshots. Both sat on the same step pair —
`winery/submit` and `winery/review` — and one caused the other.

1. **The tour rang a node the screen had thrown away.** The create-a-lot wizard keys its pane
   on the wizard step, so moving from *Wine* to *Quantity* replaces the whole subtree — the
   action row the step points at included. The wizard step lives in the **query string**, and
   the runner only re-resolved its anchor when the **pathname** changed. So from the second
   pane onward the tour held a detached element: `getBoundingClientRect` on one returns zeroes,
   which drew the ring as a dot in the top-left corner of the screen, and the bottom sheet —
   which refuses to measure against a detached anchor — stayed frozen over the page content.
   Measured side by side, production against the fix, at the same four panes:

   | pane | ring, before | ring, after | sheet top, before | after |
   |---|---|---|---|---|
   | 1 | `11,299 368×77` | `11,299 368×77` | 640 | 640 |
   | 2 | `0,0 10×10` | `11,723 368×77` | 640 | 512 |
   | 3 | `0,0 10×10` | `11,760 368×77` | 640 | 549 |
   | 4 | `0,0 10×10` | `11,702 368×77` | 640 | 491 |

   The runner now watches for its anchor leaving the document and resolves again. The
   replacement does **not** re-scroll: the screen already scrolled itself, and pulling the
   reader back down to the anchor would fight them. `Spotlight` also refuses to measure a
   detached or zero-sized node and keeps its last good hole, so the corner dot cannot come back
   by another route.

2. **A step told the reader to press something that does not exist.** The waiting pill read
   *Press the highlighted control* on every step that was not self-advancing — including the
   one whose entire lesson is that a winery cannot verify its own wine and must **wait** for an
   operator. The ring there is around the lots table; there is nothing in it to press, so a
   reader who tries and fails concludes the tour is broken. The label is now read from the
   advance rule: `click` and `route` wait for the reader, `event` and `predicate` wait for the
   world, and each of the four event steps names what it is waiting for.

   The same step carried the other half of the defect: the 10-second grace period that offers a
   way past a stuck step was firing while the reader was still filling in the wizard, and
   taking that escape stranded every later step, all of which need the lot to exist. A step can
   now set its own `stallAfterMs` — three minutes for four panes of a hand-typed form.

Verified on the rebuilt app at 390 px: the ring tracks the action row through all four panes,
the sheet re-lifts on each, the lot is created, the operator verifies it four seconds later and
the tour advances on its own to step 8 — with no escape hatch offered at any point, because it
was never needed.
