# Online Grocery Cart Concierge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn a reviewed Grocery list into a nearly checkout-ready pickup or delivery cart with explicit first-use preferences, few exception decisions, evidence-backed savings, and an exact unresolved remainder.

**Architecture:** Separate user-owned retailer preferences from provider-owned runtime capabilities. A pure resolver filters the saved retailer order by fulfillment mode and current provider evidence, then routes to a capability-specific experience: Kroger-family cart preparation, approved outbound product links, or a truthful remembered/unavailable state. Reuse the existing Grocery list, Kroger matching, exact-store confirmation, cart acknowledgement, and remainder receipts; do not add a second basket object or infer orders.

**Tech Stack:** React Native, Expo SDK 54, React Navigation, TypeScript, AsyncStorage, Supabase Edge Functions/Deno, PostgreSQL migrations, Jest, React Native Testing Library.

---

## Delivery slices and proof gates

1. **Learning release A — preference shell and Kroger pickup concierge.** Real
   first-use setup, deterministic eligibility, Kroger-family pickup matching,
   collapsed Ready lines, exception review, same-cart savings, and exact
   remainder. This is the first shippable TestFlight slice.
2. **Learning release B — Kroger delivery.** Enable only after a disposable-cart
   drill proves the public API's delivery product filter, cart modality, and
   store/area semantics. Until then a saved `Delivery` preference produces an
   honest pickup fallback rather than an unproved delivery claim.
3. **Learning release C — Amazon and Walmart assistance.** The policy-compliant
   adapters and disabled gates may ship earlier, but active qualifying links
   wait for approval of Kwilt's exact mobile surface and live verification of
   the link format. Costco remains preference-only.

Do not combine these proof gates into one release claim. Source tests, Simulator,
signed disposable-cart behavior, TestFlight household use, and production
affiliate attribution are separate evidence levels.

## File structure

### Create

- `src/capabilities/groceries/domain/onlineShoppingPreferences.ts` — versioned,
  user-owned fulfillment and retailer-order contracts.
- `src/capabilities/groceries/domain/onlineShoppingPreferences.test.ts` — parser,
  normalization, ordering, and migration tests.
- `src/capabilities/groceries/data/onlineShoppingPreferencesRepository.ts` —
  person/device-scoped AsyncStorage repository.
- `src/capabilities/groceries/data/onlineShoppingPreferencesRepository.test.ts` —
  ownership, malformed data, update, and clear tests.
- `src/capabilities/groceries/domain/onlineRetailerResolver.ts` — pure capability
  filtering and deterministic outcome ordering.
- `src/capabilities/groceries/domain/onlineRetailerResolver.test.ts` — mode,
  approval, preference-order, and fallback tests.
- `src/capabilities/groceries/domain/krogerMatchReadiness.ts` — deterministic
  ready/review/unmatched classification.
- `src/capabilities/groceries/domain/krogerMatchReadiness.test.ts` — remembered
  match, lexical coverage, fulfillment, and ambiguity tests.
- `src/capabilities/groceries/domain/retailPackageNormalization.ts` — conservative
  package/count/weight/volume normalization for quantities and savings.
- `src/capabilities/groceries/domain/retailPackageNormalization.test.ts` — exact
  conversions and refusal cases.
- `src/capabilities/groceries/domain/cartSavingsSuggestions.ts` — promotion and
  normalized alternative savings inside one cart.
- `src/capabilities/groceries/domain/cartSavingsSuggestions.test.ts` — evidence,
  coverage, expiry, cap, and unknown-fee tests.
- `src/capabilities/groceries/screens/OnlineShoppingSetupScreen.tsx` — first-use
  fulfillment, retailer selection, and ranking flow.
- `src/capabilities/groceries/screens/OnlineShoppingSetupScreen.test.tsx` — setup
  progression, accessibility, persistence, and nearby-store deferral tests.
- `src/capabilities/groceries/screens/OnlineOrderScreen.tsx` — compact returning
  entry, executable outcome, limitations, and rerouting.
- `src/capabilities/groceries/screens/OnlineOrderScreen.test.tsx` — preferred
  order, hero outcome, stale list, and unsupported-state tests.
- `src/capabilities/groceries/components/RetailerPreferenceList.tsx` — selected
  retailer ordering control with accessible move actions.
- `src/capabilities/groceries/components/KrogerCartReviewSections.tsx` — collapsed
  Ready, Needs review, Not found, and savings sections.
- `src/capabilities/groceries/components/KrogerCartReviewSections.test.tsx` —
  default scan and exception-only interaction tests.
- `src/capabilities/groceries/providers/affiliateRetailerProvider.ts` — gated,
  policy-compliant Amazon/Walmart outbound-link adapter.
- `src/capabilities/groceries/providers/affiliateRetailerProvider.test.ts` — gate,
  disclosure, system-link, and no-coverage-claim tests.
- `supabase/migrations/20260813150000_online_grocery_fulfillment_mode.sql` — records
  requested fulfillment mode on handoffs and cart acknowledgement items.

### Modify

- `docs/design-explorations/shopping-commerce/06-grocery-list-fulfillment-ui-contract.md`
  — replace direct-single-store assumptions with the accepted cart-concierge
  entry while retaining the list and exact-store contracts.
- `src/capabilities/groceries/FEATURE.md` — link the new brief and state the
  learning-release boundary.
- `src/capabilities/groceries/providers/groceryProviderContracts.ts` — separate
  retailer preference IDs from executable provider IDs and describe
  `cart_prepare`, `product_links`, `remembered_only`, and `unavailable`.
- `src/capabilities/groceries/providers/groceryProviderContracts.test.ts` —
  capability/evidence validation tests.
- `src/capabilities/groceries/providers/krogerProvider.ts` — add fulfillment
  filter/modality types and delivery availability normalization.
- `src/capabilities/groceries/providers/krogerProvider.test.ts` — pickup/delivery
  payload and normalized fulfillment tests.
- `src/capabilities/groceries/data/krogerConnectionRepository.ts` — carry
  fulfillment mode through match preparation and cart add.
- `src/capabilities/groceries/data/krogerConnectionRepository.test.ts` — request
  body tests for both modes.
- `src/capabilities/groceries/screens/GroceryListScreen.tsx` — route `Shop online`
  through preference setup or the online order resolver.
- `src/capabilities/groceries/screens/GroceryListScreen.test.tsx` — first and
  returning entry tests.
- `src/capabilities/groceries/screens/KrogerCartScreen.tsx` — consume mode,
  readiness, review sections, and savings; preserve exact-store pickup guard.
- `src/capabilities/groceries/screens/KrogerCartScreen.test.tsx` — exception-only
  review, mode, savings, handoff, and recovery tests.
- `src/features/household-food/FoodNavigator.tsx` — add setup and online-order
  routes and pass fulfillment mode into `KrogerCart`.
- `src/features/household-food/foodNavigationOptions.ts` — configure the new
  full-screen routes consistently.
- `src/services/affiliateLinks.ts` — add Walmart's gated qualifying-link format
  without enabling it and remove any Grocery dependency on embedded WebViews.
- `src/services/affiliateLinks.test.ts` — tagged-link and disabled-gate tests.
- `src/utils/getEnv.ts` and `app.config.ts` — expose explicit Amazon-mobile and
  Walmart-affiliate approval gates; absence means disabled.
- `src/services/analytics/events.ts` and
  `src/services/analytics/foodAnalyticsContracts.ts` — add metadata-only setup,
  resolution, exception, savings, and handoff events.
- `supabase/functions/_shared/krogerAdapter.ts` — filter products and build cart
  payloads by requested mode.
- `supabase/functions/_shared/__tests__/krogerAdapter_deno_test.ts` — Deno tests
  for mode mapping and no cross-mode products.
- `supabase/functions/kroger-api/index.ts` — validate mode, persist it in the
  idempotency contract, and acknowledge it in receipts.
- `supabase/functions/_shared/groceryRetailerCart.ts` and its Deno test — keep
  remainder accounting mode-agnostic while returning requested mode.
- `src/capabilities/groceries/data/groceryRepository.ts` and its test — project
  fulfillment mode on retailer-cart receipts.

## Working-tree safety

The checkout was already substantially dirty when this plan was authored,
including active changes in Grocery files this plan will later touch. Before
each task, rerun `git status --short`, `git branch --show-current`, and
`git diff -- <exact paths>`, then reread every affected file from disk. Preserve
all unrelated hunks. The commit steps below are checkpoints, not authorization
to absorb pre-existing changes: use `git add -p <exact paths>` when a path
contains earlier work, inspect `git diff --cached`, and skip the checkpoint
commit if the intended hunks cannot be isolated safely. Never use `git add -A`.

## Task 1: Lock the cart-concierge contract into product documentation

**Files:**
- Modify: `docs/design-explorations/shopping-commerce/06-grocery-list-fulfillment-ui-contract.md`
- Modify: `src/capabilities/groceries/FEATURE.md`

- [ ] Update the UI contract's three-second read to `Shop online` → saved
  preference setup or `Order this list`, not direct navigation to Kroger.
- [ ] State that the list remains the entire in-store experience and that
  Costco/Other may be remembered without becoming online actions.
- [ ] Add the four provider capability levels and the learning-release proof
  gates from the accepted brief.
- [ ] Run `npm run product:lint`.
- [ ] Expected: product lint passes and the Groceries manifest links
  `online-grocery-cart-concierge` without inventing new JTBD IDs.
- [ ] Commit only these documentation paths:

```bash
git add docs/feature-briefs/online-grocery-cart-concierge.md
git add -p docs/design-explorations/shopping-commerce/06-grocery-list-fulfillment-ui-contract.md \
  src/capabilities/groceries/FEATURE.md
git diff --cached
git commit -m "docs: define online grocery cart concierge"
```

## Task 2: Define and persist first-use preferences

**Files:**
- Create: `src/capabilities/groceries/domain/onlineShoppingPreferences.ts`
- Create: `src/capabilities/groceries/domain/onlineShoppingPreferences.test.ts`
- Create: `src/capabilities/groceries/data/onlineShoppingPreferencesRepository.ts`
- Create: `src/capabilities/groceries/data/onlineShoppingPreferencesRepository.test.ts`

- [ ] Write failing domain tests for this contract:

```ts
export type OnlineFulfillmentPreference = 'pickup' | 'delivery' | 'either';
export type RetailerPreferenceId = 'amazon' | 'costco' | 'kroger' | 'walmart' | 'other';
export type RetailerPreference = {
  id: RetailerPreferenceId;
  enabled: boolean;
  rank: number;
  label: string;
  membershipConfirmed: boolean | null;
};
export type OnlineShoppingPreferences = {
  schemaVersion: 1;
  defaultFulfillment: OnlineFulfillmentPreference;
  retailers: RetailerPreference[];
  homePostalCode: string | null;
  savedAt: string;
};
```

  Prove retailer IDs are unique, enabled ranks are contiguous, `other` requires
  a non-empty custom label, postal code is optional but five digits when set,
  and unknown persisted fields do not become authority.
- [ ] Run:

```bash
npx jest src/capabilities/groceries/domain/onlineShoppingPreferences.test.ts --runInBand
```

- [ ] Expected: FAIL because the parser and normalizer do not exist.
- [ ] Implement `parseOnlineShoppingPreferences`,
  `normalizeRetailerPreferenceOrder`, and `createDefaultOnlineShoppingPreferences`.
  The default object must not assume membership, account state, location, or an
  executable retailer.
- [ ] Rerun the focused domain test; expected PASS.
- [ ] Write failing repository tests proving storage key
  `kwilt-online-shopping-preferences-v1:<person-or-device>`, person isolation,
  malformed-data recovery to `null`, atomic replacement, and clear.
- [ ] Implement the repository with AsyncStorage and the domain parser.
- [ ] Run both focused tests; expected PASS.
- [ ] Commit the four exact files.

## Task 3: Model runtime retailer capability separately from preference

**Files:**
- Create: `src/capabilities/groceries/domain/onlineRetailerResolver.ts`
- Create: `src/capabilities/groceries/domain/onlineRetailerResolver.test.ts`
- Modify: `src/capabilities/groceries/providers/groceryProviderContracts.ts`
- Modify: `src/capabilities/groceries/providers/groceryProviderContracts.test.ts`

- [ ] Write failing tests for `resolveOnlineRetailerOutcomes` using this output:

```ts
export type OnlineRetailerOutcome = {
  retailerId: RetailerPreferenceId;
  rank: number;
  capability: 'cart_prepare' | 'product_links' | 'remembered_only' | 'unavailable';
  requestedMode: 'pickup' | 'delivery';
  reason:
    | 'ready'
    | 'store_required'
    | 'mode_unproved'
    | 'program_approval_required'
    | 'integration_unavailable'
    | 'membership_unconfirmed';
  mayClaimCoverage: boolean;
  mayClaimPrice: boolean;
};
```

  Cases: preserve Maya's rank; expand `either` to the best proved executable
  mode without changing saved preferences; Kroger pickup can be
  `cart_prepare`; Kroger delivery is `unavailable/mode_unproved` until enabled;
  Amazon/Walmart are `product_links` only when their explicit mobile approval
  gates are true; Costco/Other remain `remembered_only`; a link-only retailer
  can never claim coverage or price.
- [ ] Run the two focused suites and confirm failure.
- [ ] Extend provider contracts with a runtime policy object rather than adding
  Costco as a provider with fictional APIs:

```ts
export type RetailerRuntimePolicy = {
  retailerId: RetailerPreferenceId;
  capability: OnlineRetailerOutcome['capability'];
  supportedModes: Array<'pickup' | 'delivery'>;
  approvedSurface: boolean;
  productEvidence: boolean;
  cartWrite: boolean;
};
```

- [ ] Implement the resolver as stable filtering and ordering; do not add a
  weighted score or commission input.
- [ ] Rerun focused suites; expected PASS.
- [ ] Commit the four exact files.

## Task 4: Build the first-use setup and returning entry routes

**Files:**
- Create: `src/capabilities/groceries/components/RetailerPreferenceList.tsx`
- Create: `src/capabilities/groceries/screens/OnlineShoppingSetupScreen.tsx`
- Create: `src/capabilities/groceries/screens/OnlineShoppingSetupScreen.test.tsx`
- Modify: `src/features/household-food/FoodNavigator.tsx`
- Modify: `src/features/household-food/foodNavigationOptions.ts`
- Modify: `src/capabilities/groceries/screens/GroceryListScreen.tsx`
- Modify: `src/capabilities/groceries/screens/GroceryListScreen.test.tsx`

- [ ] Add failing Grocery-list tests: no saved preference navigates to
  `OnlineShoppingSetup`; a saved preference navigates to `OnlineOrder`; stale,
  offline, queued, and empty-list gates stay unchanged.
- [ ] Add failing setup tests for the three progressive decisions: fulfillment,
  retailers used, and preferred order. Include VoiceOver actions `Move Amazon
  earlier` and `Move Amazon later`; do not rely on drag as the only ranking
  mechanism.
- [ ] Implement these route params:

```ts
OnlineShoppingSetup: { listId: string };
OnlineOrder: { listId: string; fulfillmentOverride?: 'pickup' | 'delivery' };
KrogerCart: { listId: string; fulfillmentMode: 'pickup' | 'delivery' };
```

- [ ] Compose one calm full-screen setup. Ask for location only when Maya elects
  to identify a local Kroger-family store; otherwise accept ZIP or defer exact
  store discovery to the existing finder.
- [ ] Save only after all enabled retailers have a unique rank. Navigate to
  `OnlineOrder` with the current list after save.
- [ ] Keep account authorization out of setup and label Amazon/Costco membership
  as user statements, not detected account state.
- [ ] Run:

```bash
npx jest src/capabilities/groceries/screens/OnlineShoppingSetupScreen.test.tsx \
  src/capabilities/groceries/screens/GroceryListScreen.test.tsx --runInBand
```

- [ ] Expected: PASS.
- [ ] Commit the seven exact paths.

## Task 5: Build the deterministic `Order this list` outcome

**Files:**
- Create: `src/capabilities/groceries/screens/OnlineOrderScreen.tsx`
- Create: `src/capabilities/groceries/screens/OnlineOrderScreen.test.tsx`
- Modify: `src/features/household-food/FoodNavigator.tsx`
- Modify: `src/features/household-food/foodNavigationOptions.ts`

- [ ] Write failing tests proving the compact header reads `Pickup · Amazon
  first`, exposes `Change`, and does not display a dashboard of speculative
  price/coverage cards.
- [ ] Test the outcome rules:
  - if Kroger pickup is the first cart-capable result, show `Build my pickup cart`;
  - if Amazon ranks above it but is link-only, explain `Amazon can help with
    individual products; Kwilt cannot prepare this cart there`;
  - if no cart-capable retailer exists, preserve the list and offer only
    truthful approved link assistance;
  - if the list revision changes while the screen is open, require refresh.
- [ ] Implement the screen from the preference repository, current Grocery
  projection, runtime policy, and pure resolver. Do not query affiliates merely
  to render remembered preferences.
- [ ] Navigate the Kroger hero action to `KrogerCart` with explicit mode.
- [ ] Keep `Try another retailer` as secondary progressive disclosure and place
  remembered/unavailable retailers there.
- [ ] Run the focused screen test; expected PASS.
- [ ] Commit the four exact paths.

## Task 6: Carry pickup/delivery through Kroger product and cart contracts

**Files:**
- Modify: `src/capabilities/groceries/providers/krogerProvider.ts`
- Modify: `src/capabilities/groceries/providers/krogerProvider.test.ts`
- Modify: `src/capabilities/groceries/data/krogerConnectionRepository.ts`
- Modify: `src/capabilities/groceries/data/krogerConnectionRepository.test.ts`
- Modify: `supabase/functions/_shared/krogerAdapter.ts`
- Modify: `supabase/functions/_shared/__tests__/krogerAdapter_deno_test.ts`
- Modify: `supabase/functions/kroger-api/index.ts`
- Create: `supabase/migrations/20260813150000_online_grocery_fulfillment_mode.sql`

- [ ] Write failing client and Deno tests for:

```ts
type KrogerFulfillmentMode = 'pickup' | 'delivery';

const productFilter = {
  pickup: 'csp',
  delivery: 'dth',
} as const;

const cartModality = {
  pickup: 'PICKUP',
  delivery: 'DELIVERY',
} as const;
```

  Confirm the server accepts only these app-level modes, uses the corresponding
  product filter, rejects products unavailable for that mode, and includes mode
  in the cart payload hash/idempotency key.
- [ ] Run Jest and Deno tests; expected FAIL for missing mode support.
- [ ] Add `deliveryAvailable` beside `pickupAvailable` in normalized products.
- [ ] Update `prepareMatches` and `cartAdd` repository methods to require mode.
- [ ] Add migration columns with checks:

```sql
alter table public.kwilt_retailer_handoffs
  add column fulfillment_mode text
  check (fulfillment_mode in ('pickup', 'delivery'));

alter table public.kwilt_retailer_handoff_items
  add column fulfillment_mode text
  check (fulfillment_mode in ('pickup', 'delivery'));
```

  Backfill existing Kroger cart acknowledgements as `pickup`, then make the
  receipt-item column non-null. Replace the acknowledgement RPC signature so
  mode is server-validated from the handoff rather than trusted independently.
- [ ] Preserve exact-store user confirmation for pickup. For delivery, reject
  writes behind `FOOD_KROGER_DELIVERY_ENABLED !== 'true'`; do not reuse the
  pickup-store receipt as proof of a delivery origin.
- [ ] Rerun focused Jest and Deno suites; expected PASS.
- [ ] Run Supabase migration lint/type verification selected by
  `npm run verify:changed -- --run` before commit.
- [ ] Commit the eight exact paths.

## Task 7: Classify Ready, Needs review, and Not found deterministically

**Files:**
- Create: `src/capabilities/groceries/domain/krogerMatchReadiness.ts`
- Create: `src/capabilities/groceries/domain/krogerMatchReadiness.test.ts`
- Modify: `src/capabilities/groceries/domain/krogerProductMatching.ts`
- Modify: `src/capabilities/groceries/domain/krogerProductMatching.test.ts`
- Modify: `supabase/functions/kroger-api/index.ts`
- Modify: `supabase/functions/_shared/__tests__/krogerAdapter_deno_test.ts`

- [ ] Write failing tests for the only permitted readiness reasons:

```ts
type KrogerMatchReadiness =
  | { state: 'ready'; productId: string; reason: 'remembered_exact' | 'strong_concept_match' }
  | { state: 'review'; reason: 'ambiguous_identity' | 'protected_product' | 'package_unknown' | 'quantity_unknown' }
  | { state: 'unmatched'; reason: 'not_found' | 'mode_unavailable' };
```

- [ ] Prove a remembered mapping is reusable only for the same provider,
  location, grocery concept, and available product; all meaningful concept
  tokens must appear in title/brand for a new strong match; a generic or
  conflicting top result cannot become Ready because it is first in the API
  response.
- [ ] Extend `prepare_matches` to return remembered confirmed mapping evidence
  separately from current product evidence. Do not silently confirm a new
  mapping on the server.
- [ ] Implement the pure classifier and keep its threshold constants named and
  tested.
- [ ] Run focused Jest and Deno tests; expected PASS.
- [ ] Commit the six exact files.

## Task 8: Normalize retail quantities conservatively

**Files:**
- Create: `src/capabilities/groceries/domain/retailPackageNormalization.ts`
- Create: `src/capabilities/groceries/domain/retailPackageNormalization.test.ts`
- Modify: `src/capabilities/groceries/domain/krogerCartProjection.ts`
- Modify: `src/capabilities/groceries/domain/krogerCartProjection.test.ts`

- [ ] Write failing table tests for package strings such as `12 ct`, `64 fl oz`,
  `2 x 16 oz`, `5 lb`, and `4 sticks / 16 oz`. Support only exact count,
  mass, and volume families with explicit conversion constants.
- [ ] Test refusal for `family size`, `1 package`, conflicting units, fractional
  count, missing requested quantity, and any parse ambiguity.
- [ ] Implement:

```ts
type RetailPackageResolution =
  | { state: 'normalized'; packageBaseUnits: number; baseUnit: 'count' | 'g' | 'ml'; retailQuantity: number }
  | { state: 'unknown'; reason: 'package_unparsed' | 'unit_incompatible' | 'quantity_missing' };
```

- [ ] Update cart projection to use normalized retail quantity when safe and
  retain `Qty 1 · check package` when unknown. Unknown conversion must set
  Needs review for materially quantity-sensitive concepts; it must never feed a
  normalized savings claim.
- [ ] Run both focused suites; expected PASS.
- [ ] Commit the four exact files.

## Task 9: Put a few evidence-backed savings inside cart preparation

**Files:**
- Create: `src/capabilities/groceries/domain/cartSavingsSuggestions.ts`
- Create: `src/capabilities/groceries/domain/cartSavingsSuggestions.test.ts`
- Modify: `src/capabilities/groceries/domain/savingsContracts.ts`
- Modify: `src/capabilities/groceries/domain/savingsContracts.test.ts`

- [ ] Write failing tests that allow only:
  - selected-product promotion: `(regular - promo) × retail quantity`;
  - reviewed alternative savings using equal normalized required units;
  - overlapping-grocery-line consolidation already represented by one UPC.
- [ ] Reject expired evidence, zero/negative savings, unknown package units,
  different fulfillment mode, member-only prices without explicit membership,
  and any calculation with unknown fees represented as included.
- [ ] Return at most three suggestions ordered by savings cents, then fewer
  decision changes, then stable ID. Include `observedAt`, `expiresAt`,
  `coverageItemCount`, and `totalCartItemCount`.
- [ ] Implement pure suggestion generation without cross-retailer scoring or
  coupon activation.
- [ ] Run the two focused suites; expected PASS.
- [ ] Commit the four exact files.

## Task 10: Refactor Kroger cart review around exceptions

**Files:**
- Create: `src/capabilities/groceries/components/KrogerCartReviewSections.tsx`
- Create: `src/capabilities/groceries/components/KrogerCartReviewSections.test.tsx`
- Modify: `src/capabilities/groceries/screens/KrogerCartScreen.tsx`
- Modify: `src/capabilities/groceries/screens/KrogerCartScreen.test.tsx`

- [ ] Add failing component tests for the three-second read:
  `18 of 21 ready for Smith's pickup`, a collapsed `18 ready`, an expanded
  `2 need you`, `1 not found`, and at most one savings summary.
- [ ] Prove Ready lines can be inspected and edited, Needs review offers exact
  choices (`Use`, `Choose another`, `Leave on list`), and Not found never blocks
  the supported remainder.
- [ ] Prove `Apply all` changes only explicitly enumerated cart-draft selections
  and remains reversible before cart write.
- [ ] Extract presentational sections without changing the existing store finder,
  preferred-store behavior, safe-area header, product grouping, confirmation,
  or ambiguous-write recovery.
- [ ] Replace `products[0]` draft selection with readiness output. Ready products
  start selected; review/unmatched products do not enter the write payload until
  Maya decides.
- [ ] Show merchandise estimate and savings coverage separately. Keep fees,
  taxes, slot, substitution, and final total in retailer-owned explanatory copy.
- [ ] Run:

```bash
npx jest src/capabilities/groceries/components/KrogerCartReviewSections.test.tsx \
  src/capabilities/groceries/screens/KrogerCartScreen.test.tsx --runInBand
```

- [ ] Expected: PASS.
- [ ] Commit the four exact files.

## Task 11: Persist mode-aware acknowledgement and project the exact remainder

**Files:**
- Modify: `supabase/functions/kroger-api/index.ts`
- Modify: `supabase/functions/_shared/groceryRetailerCart.ts`
- Modify: `supabase/functions/_shared/__tests__/groceryRetailerCart_deno_test.ts`
- Modify: `src/capabilities/groceries/data/groceryRepository.ts`
- Modify: `src/capabilities/groceries/data/groceryRepository.test.ts`
- Modify: `src/capabilities/groceries/domain/groceryFulfillment.ts`
- Modify: `src/capabilities/groceries/domain/groceryFulfillment.test.ts`
- Modify: `src/capabilities/groceries/screens/GroceryListScreen.test.tsx`

- [ ] Write failing Deno/domain tests proving one provider-acknowledged item is
  excluded from every later online pass regardless of retailer, while an opened
  link or user-dismissed browser is not excluded.
- [ ] Prove the projection reads `In Smith's pickup cart` or `In Smith's
  delivery cart` and keeps the row unchecked/needed.
- [ ] Extend acknowledgement response with exact `acknowledgedItemIds`, mode,
  added count, and remaining count. Never accept client-reported IDs as the
  acknowledgement source.
- [ ] Keep action labels `Shop online · N items` before any receipt and `Shop N
  remaining` afterward. `Everything is in carts` remains disabled and does not
  imply ordered.
- [ ] Run focused Deno, repository, fulfillment, and Grocery-list suites;
  expected PASS.
- [ ] Commit the eight exact files.

## Task 12: Add policy-compliant affiliate assistance behind disabled gates

**Files:**
- Create: `src/capabilities/groceries/providers/affiliateRetailerProvider.ts`
- Create: `src/capabilities/groceries/providers/affiliateRetailerProvider.test.ts`
- Modify: `src/services/affiliateLinks.ts`
- Modify: `src/services/affiliateLinks.test.ts`
- Modify: `src/utils/getEnv.ts`
- Modify: `app.config.ts`
- Modify: `src/capabilities/groceries/screens/OnlineOrderScreen.tsx`
- Modify: `src/capabilities/groceries/screens/OnlineOrderScreen.test.tsx`

- [ ] Write failing tests proving both gates default to false:

```ts
type AffiliateRetailerApproval = {
  amazonMobileApproved: boolean;
  walmartSurfaceApproved: boolean;
};
```

- [ ] Prove disabled retailers produce no qualifying URL and no CTA. Amazon URLs
  use the configured Associates tag and `Linking.openURL` so the Amazon app or
  system browser owns the page; never use `openBrowserAsync`, an embedded
  WebView, form filling, or cart-state inspection.
- [ ] Prove Walmart accepts only the exact Impact-provided qualifying-link
  template configured for the approved Kwilt surface. Do not synthesize a link
  from a normal Walmart URL, implement price alerts, or enable the gate merely
  because the application was submitted.
- [ ] Render an unavoidable `Affiliate link` disclosure adjacent to each active
  qualifying CTA. Link-only outcomes say `Open product search`; they do not say
  `N items found`, `cart ready`, or quote price/availability without an approved
  feed.
- [ ] Add metadata-only opened/skipped receipts locally only when Maya acts; do
  not remove those items from the Grocery remainder because Kwilt lacks cart
  acknowledgement.
- [ ] Run focused affiliate and Online-order suites; expected PASS with gates
  false in the normal test environment.
- [ ] Commit the eight exact files.

## Task 13: Instrument whether the concierge actually removes work

**Files:**
- Modify: `src/services/analytics/events.ts`
- Modify: `src/services/analytics/foodAnalyticsContracts.ts`
- Modify: `src/capabilities/groceries/screens/OnlineShoppingSetupScreen.tsx`
- Modify: `src/capabilities/groceries/screens/OnlineOrderScreen.tsx`
- Modify: `src/capabilities/groceries/screens/KrogerCartScreen.tsx`
- Modify: `src/capabilities/groceries/screens/GroceryListScreen.tsx`

- [ ] Add these event names to the Food allowlist:

```ts
OnlineShoppingPreferencesSaved
OnlineRetailerOutcomesResolved
OnlineCartExceptionsReviewed
OnlineCartSavingsAccepted
OnlineCartHandoffAcknowledged
OnlineShoppingRemainderViewed
```

- [ ] Attach only fulfillment mode, retailer ID, capability enum, bounded input/
  ready/review/unmatched/acknowledged counts, savings-cent bucket, evidence
  coverage bucket, coarse elapsed-time bucket, and outcome enum.
- [ ] Add tests or existing analytics-contract assertions proving ingredient
  text, product title/UPC, store address/location ID, affiliate subtag, cart URL,
  account state, and order content are never attached.
- [ ] Capture time-to-provider-handoff from `Shop online` press to acknowledged
  cart write. Do not report trip elimination as an inferred analytics fact;
  collect that through explicit dogfood/household feedback.
- [ ] Run the affected analytics and screen suites; expected PASS.
- [ ] Commit the six exact files.

## Task 14: Verify learning release A without touching a real cart

- [ ] Run all focused Grocery suites:

```bash
npx jest src/capabilities/groceries --runInBand
```

- [ ] Run changed-file verification:

```bash
npm run verify:changed -- --run
```

- [ ] Run backend tests selected by the change plus the explicit Deno suites:

```bash
deno test --allow-env supabase/functions/_shared/__tests__/krogerAdapter_deno_test.ts \
  supabase/functions/_shared/__tests__/groceryRetailerCart_deno_test.ts
```

- [ ] Run:

```bash
npm run product:lint
npm run architecture:lint
git diff --check
```

- [ ] Review the exact scoped diff and confirm unrelated dirty paths remain
  untouched. Do not use `git add -A`.
- [ ] Simulator acceptance on iPhone 17 Pro / iOS 26.5 from the owning checkout:
  - first `Shop online` opens setup;
  - pickup/delivery/either and retailer ordering work with VoiceOver-sized text;
  - returning use skips setup and shows one hero cart outcome;
  - Ready stays collapsed and only exceptions demand decisions;
  - applying a saving is visibly reversible;
  - store discovery and exact-store confirmation retain their existing behavior;
  - no test action writes to Andrew's real Smith's cart.
- [ ] Record checkout path, branch, commit, dirty state, Metro port, installed
  bundle provenance, and screenshots. Simulator evidence is not signed-device
  retailer evidence.

## Task 15: Prove and enable Kroger pickup with a disposable cart

- [ ] Register/confirm production Kroger callback and required scopes without
  exposing client secrets in app code or logs.
- [ ] Use a disposable/emptied retailer cart and the exact selected Smith's
  location. Capture the pre-test cart state manually.
- [ ] On a signed device, prepare a small non-sensitive test list, review the
  exact UPCs/quantities, confirm the selected pickup store, and perform one
  authorized cart write.
- [ ] Verify in the retailer app/site: exact banner/store, fulfillment modality,
  acknowledged UPCs and quantities, no duplicate write after replay, and exact
  Kwilt remainder. Remove test items afterward through the retailer UI.
- [ ] Exercise canceled OAuth, wrong-store confirmation, network ambiguity, and
  retry without producing duplicate cart additions.
- [ ] Only after this proof, enable `FOOD_KROGER_HANDOFF_ENABLED` for the intended
  release channel. Keep Amazon/Walmart and Kroger delivery gates disabled.
- [ ] Submit a TestFlight learning release and observe at least three natural
  household lists. Record required decisions, match coverage, handoff time, and
  whether a store trip or substantial browsing was actually avoided.

## Task 16: Gate learning release B and C independently

- [ ] **Kroger delivery:** run the same disposable-cart drill using delivery
  product filtering and cart modality. Verify how the selected market relates to
  delivery inventory and checkout. Enable `FOOD_KROGER_DELIVERY_ENABLED` only if
  the result is truthful and repeatable; otherwise keep the saved preference and
  display the pickup fallback.
- [ ] **Amazon:** obtain approval for Kwilt's exact mobile app surface, register
  the App Store URL/Store ID as required, verify Universal Link attribution, and
  enable `amazonMobileApproved` only after compliance review. Do not call a set
  of search links a prepared cart.
- [ ] **Walmart:** wait for acceptance, inspect Impact's current terms, feed
  authorization, qualifying-link format, category rates, and Kwilt-surface
  approval. Enable `walmartSurfaceApproved` only after a live qualifying-link
  attribution test. Do not implement Walmart price tracking or alerts.
- [ ] **Costco/Other:** retain preference demand and product analytics only at an
  aggregate retailer-ID level. Do not expose an online action until a legitimate
  integration satisfies the capability contract.
- [ ] Update `job-flow-maya-feed-household-with-less-work.md` and the brief's
  status only after the corresponding proof exists. Source completion alone does
  not increase the delivery score.

## Final self-review

- Spec coverage: first-use preferences, returning defaults, retailer order,
  capability asymmetry, pickup/delivery, exception-only review, savings,
  handoff truth, exact remainder, affiliate compliance, and learning proof each
  map to a task above.
- No second Grocery basket, opaque occasion classifier, weighted retailer score,
  in-person itinerary, automatic checkout, order inference, cross-retailer price
  optimizer, or unsupported Costco action is introduced.
- The implementation can stop after learning release A with a coherent,
  TestFlight-testable Kroger pickup experience; later gates do not weaken it.
