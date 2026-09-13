# Design plan — audit fixes (UI only, no contract changes)

Scope: the findings from the two audits. Contracts are frozen; every item below is either a
correctness fix in existing screens or a new composition of existing design-system components.

## 0. Brief

- **Job** — an operator onboards participants, a producer runs a lot, a buyer settles and takes
  delivery, a collector reads what they hold. Today three of those are blocked or lie.
- **Surface** — product app (cabinets) + one consumer surface (collector, passport).
- **Primary device** — desktop for cabinets, mobile for the collector surface and passport.
- **Content reality** — records carry their own `paymentToken`; the deployment has been through
  one settlement-asset change, so 6-decimal EURC and 18-decimal tEURe records coexist. Lists are
  capped at 50 by the Lens; `positions()` reverts above 50 ids.
- **Constraints** — established design system already implemented in code, tokens fixed,
  React 19 + wagmi/viem, no backend, no indexer.
- **Expressiveness budget** — zero. Every surface here is a task surface.

## 1. Phase 2 (Figma) — skipped, with reason

No new design-system component is introduced. Every change either edits an existing screen or
composes `CabinetPage`, `PageHeader`, `ActionReview`, `Field`, `DataTable`, `EmptyState`,
`Callout`, `StatusBadge`, `Pagination`, `LotThumb` — all already designed and built. Per the
pipeline's scaling rule these are tweaks plus one screen with no novel pattern. The gate moves
to this plan plus the phase-4 checklist, it does not disappear.

## 2. Region → grammar entry

| Region | Grammar entry | Veto checked |
|---|---|---|
| Collector shelf | `Content page template` (single column) | not `Sidebar navigation` — one destination, its veto is "fewer than 4" |
| Empty shelf | `Empty state` | not a bare "No data"; names what would be here and why |
| Change listing price | `Modal dialog` + `Action review` | reversible, so not `Destructive confirmation` |
| Delivery conditions | `Form layout` + `Validation and errors` | not a wizard — one decision, one dialog |
| Close lot | `Destructive confirmation` | irreversible, danger button, not auto-focused |
| Operator role grants | `Action review` | each grant is one named consequence |
| Paged lists | `Pagination` (cursor) | never claims a total it has not read |

## 3. Work items

### A. Capability gating — `gatewayOwner`
`roles.ts` `canAssignRoles` reads only `gatewayAdmin`; the contract accepts
`roleOf == Admin || msg.sender == owner()`. Add `gatewayOwner`. Update `describeOperator` and
the disabled-reason copy in `Participants` so the reason shown is the true one.

### B. Collector cabinet
New route `/app/collector` → `pages/collector/Shelf.tsx`. Single-column standalone page
(the `Testnet` shape: brand, wallet chip, theme, network chip — no sidebar).
States: disconnected → `ConnectPrompt`; loading → `SkeletonRows`; empty → `Empty state` naming
what would be here plus two actions (read the lots, open a passport); held → one card per lot
with `LotThumb`, count, production stage, links to the passport and the public lot page.
A `Callout` states honestly that both markets require a B2B claim, so a collector wallet reads
and holds but does not buy. `NAV.collector` is removed (dead config once there is no sidebar);
`NAV` is retyped to the cabinet roles only.

### C. Mixed decimals
`tokenMeta(record.paymentToken, protocol)` instead of the deployment-wide decimals in:
`winery/Finance`, `shop/Overview`, `winery/OfferDetail`, `winery/ManageLot`,
`admin/Milestones`, `shop/AllocationDetail`.
Totals are never summed across assets. Headline tiles cover settlement-asset records only;
legacy records are listed separately under a `StatusBadge tone="neutral"` reading `Legacy asset`
with their own decimals. No invented FX.

### D. Invalid cancel state
`shop/Deliveries`: `Cancel this request` renders only at state `Requested`. At `Shipped` it is
replaced by a line saying only Palissage operations can return the bottles after shipping —
which is what `RedemptionManager` enforces.

### E. `updateListingPrice`
`shop/Secondary`: `Change price` on an own active listing → `Action review` with one price
field, showing fee and royalty against the new price. Makes the existing Portfolio copy true.

### F. Delivery conditions and a real `deliveryDataHash`
`shop/Portfolio` request-delivery dialog gains recipient, address, contact and notes.
The hash is `keccak256` over a canonical JSON serialisation, shown before sending, because that
value is what lands on chain. There is no backend, so the dialog also offers the details for
copying and says plainly that the producer needs them out of band. Empty details keep the
current zero hash rather than hashing an empty object.

### G. Partial first payment
`shop/Reserve`: minimum deposit / custom amount / pay in full. Custom is validated against
`[minDeposit, total]`, which is exactly the contract's own band.

### H. `updateLotMetadata`
`winery/ManageLot` evidence tab: update the metadata URI. Lot winery only.

### I. `closeLot`
`admin/LotVerification`: close a lot once `mintedBottles == redeemedBottles`.
`Destructive confirmation`. New capability `canCloseLot` from `tokenAdmin`.

### J. Operator roles on the markets
`admin/Participants`: grant or revoke `VERIFIER_ROLE` on WineLotToken, PrimaryMarket and
RedemptionManager, each gated on the caller's `DEFAULT_ADMIN_ROLE` on that contract. Closes the
gap where a gateway-assigned operator can verify lots but cannot release escrow or resolve a
delivery.

### K. Operator confirm at `Requested`
`admin/Redemptions`: drop the `!shipped` gate the contract does not have; the dialog states that
no shipment documents are attached when that is the case.

### L. Capped lists
`usePositions` batches ids in groups of 50 (the Lens reverts above that) via `useReadContracts`.
`Portfolio`, `winery/Lots` and `shop/Market` get the existing cursor `Pagination`.
Admin queues aggregate across offers; paginating them changes what the queue means, so they are
left with their cap and called out rather than half-done.

### M. Explain the powers that stay out of the interface
Decision confirmed: `recoverEscrow`, `forcedTransfer`, `setFrozenTokens` and the market
fee/treasury/allowlist setters get no controls. What they get instead is a fuller explanation
where each is relevant — what the function does, who may call it, why a button would be the
wrong shape for it, and what a reader should do when they need it. Today both notes are one
paragraph that names the functions without explaining them.

## 4. Out of scope, deliberately

- `recoverEscrow`, `forcedTransfer`, `setFrozenTokens`, market fee/treasury/allowlist setters —
  a product decision stated on the screens themselves, confirmed in this iteration. They are
  explained better (item M), not exposed.
- `IdentityRegistry` agent operations — the admin wallet does not hold `REGISTRY_AGENT_ROLE`
  (the gateway does), so any control would be a dead button.
- Retail purchase by a consumer — needs a contract change.

## 5. Invariants and acceptance

- Light and dark: no new colour values; existing semantic tokens only.
- Desktop and mobile: every new region uses the existing responsive utilities; the collector
  shelf is designed mobile-first and single-column.
- WCAG 2.2 AA: new controls go through `Field` (label, hint, error, `aria-invalid`,
  `aria-describedby`) and `Dialog`/`ActionReview` (focus contract, no auto-focused destructive
  button).
- Budgets: no new dependency; `keccak256`/`toHex` come from viem, already bundled.
- `tsc -b` and `eslint` clean; every new write path checked against the contract's own guard so
  no button is offered that would revert.

## 6. Phase 4 — verification, as actually run

Ran and passing:

- `tsc -b` — clean.
- `eslint src --max-warnings=0` — clean.
- `npm run build` — succeeds (the remaining warnings come from `node_modules` and a
  pre-existing dynamic-import pattern in `chain/wagmi.ts`; neither is introduced here).
- 13 logic assertions loaded through Vite's own SSR loader against the real values on Base
  Sepolia: the delivery hash is zero for empty details, stable under whitespace, and changes
  with any field; the retired-asset escrow of 7 440 000 000 000 000 000 000 base units prints
  as `7 440.00 tEURe` and not as a euro figure sixteen digits long; an unknown asset is never
  scaled by a guess.
- Live-chain confirmation of item A: `participant()` for the deployment's owner wallet returns
  `gatewayAdmin = false, gatewayOwner = true`, which is exactly the combination that had every
  onboarding control disabled.

Not run, and not claimed:

- No visual, theme or responsive verification. This repo carries no test runner and no browser
  automation, and the plan forbids adding a dependency for it. Light/dark and the mobile layout
  of the new regions were built from existing semantic tokens and existing responsive
  primitives, which is a reason to expect them to hold — not evidence that they do. The
  collector shelf, the reprice dialog, the delivery-details fieldset and the reworked Finance
  page still need a look in a browser at both themes and both widths.
