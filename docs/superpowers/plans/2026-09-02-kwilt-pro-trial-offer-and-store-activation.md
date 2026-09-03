# Kwilt Pro Trial Offer and Store Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execute sequentially in the current checkout; do not create a worktree or dispatch subagents without Andrew's explicit approval.

**Goal:** Use the reviewed Money Pro drawer as Kwilt's canonical contextual-upgrade template, add a commercially persuasive and StoreKit-truthful offer—one month free for eligible customers plus live annual savings—and configure and prove the same offer through App Store Connect and RevenueCat.

**Architecture:** RevenueCat remains the only production client gateway to StoreKit products, introductory-offer eligibility, purchase, and entitlement state. A normalized `ProStoreOfferSnapshot` combines live numeric/localized prices with per-product introductory eligibility; pure presentation helpers derive the drawer message, selected-plan savings, CTA, and renewal disclosure without production fallback prices or durations. Development builds also expose a clearly labeled, non-purchasing offer preview with the planned launch catalog so the complete chooser remains reviewable before external StoreKit configuration is available. Source implementation ships separately from external App Store Connect/RevenueCat activation, and the paid release remains on Hold until Sandbox and signed-device evidence prove the full lifecycle.

**Tech Stack:** React Native/Expo SDK 54, TypeScript, `react-native-purchases` 9.15.2, RevenueCat, StoreKit/App Store Connect, Jest, React Native Testing Library, PostHog analytics.

---

## Execution gates and checkout discipline

This plan executes in the repository's current checkout. The affected paywall, analytics, entitlement, and product-document files already contain overlapping work, so implementation begins with an explicit baseline and must preserve every unrelated change.

1. **Gate A — baseline:** record branch, HEAD, status, affected-file diffs, installed dependency versions, and the currently passing/failing focused tests before editing.
2. **Gate B — source:** complete Tasks 1–7 and focused Simulator proof. Do not claim a live trial, price, or purchase from this gate.
3. **Gate C — commercial activation:** complete App Store Connect and RevenueCat configuration with redacted evidence.
4. **Gate D — release proof:** complete StoreKit local, Apple Sandbox, signed-device, webhook/mirror, analytics, and processed TestFlight reconciliation before lifting Hold.

The commit commands below are checkpoint recipes, not permission to sweep the dirty checkout into commits. Before any commit, inspect the cached diff and stage only task-owned hunks. If an affected file contains inseparable pre-existing work, leave the task uncommitted and report it rather than absorbing unrelated changes.

## Product contract and offer-state matrix

The contextual Money hero keeps its current outcome-led hierarchy and adds one commercial line immediately above the bottom CTA. The CTA expresses the customer's commercial intent without claiming that the tap itself completes a purchase: eligible customers see **Try Pro free**; everyone else sees **Upgrade to Pro**. **Start one month free** is reserved for the selected-plan action that opens Apple's confirmation flow.

### Canonical contextual Pro-offer template

The reviewed Money drawer—Pine brand field, `Kwilt | Pro` lockup, radiused contextual photograph, full-width in-image proof notification, outcome headline and one-sentence explanation, plus one large white bottom action—is the accepted template for contextual Pro offers. It is not merely a Money-specific styling example. New and revised upsell paths should begin from this composition and translate it to the paid job at hand. They must not copy the Money photograph, `Spending app paused` proof, or Money copy when those do not fit the context.

**Fixed template structure**

1. Use a single immersive brand-color drawer with the standard drawer handle and standard close affordance.
2. Show the `Kwilt | Pro` lockup before the hero media.
3. Place contextual photography or illustration in a radiused media frame.
4. Put one full-width, inset proof/state notification over the media near its lower edge; preserve subject and message legibility and never cover the focal point.
5. Follow with one outcome-led headline and one concise mechanism sentence.
6. Allow at most one quiet commercial line for a verified trial or live-derived savings claim.
7. Use one canonical large white/inverse CTA, independently anchored in the drawer's bottom geometry with equal left, right, and bottom insets.
8. Do not add a feature list, `Not now` action, legal copy, disclosure block, white footer, pricing grid, or second dominant action. The close affordance provides dismissal; the full-screen plan chooser owns exact plan details, renewal disclosure, Terms, and Privacy. The Subscriptions page remains the account-management home for Restore and existing-plan actions.

**Contextual elements that adapt**

- the photograph or illustration and its focal-point-safe crop;
- the proof notification that makes the paid capability feel real;
- the outcome headline and single mechanism sentence;
- the optional eligibility-aware commercial line;
- the eligibility-aware CTA (`Try Pro free` or `Upgrade to Pro`);
- the reason/source analytics and the intent resumed after purchase.

**Reductive UI contract**

- **Job:** help someone recognize a desirable paid outcome and confidently begin upgrading without making them study a plan catalog.
- **Authority chain:** the contextual paid outcome is dominant; the proof moment substantiates it; the commercial line and CTA make the offer actionable.
- **Three-second read:** what Pro lets me do, evidence that it is real, and one obvious way to get it.
- **Primary action:** begin the Pro upgrade path. **Primary information:** the contextual outcome.
- **Secondary information:** one mechanism sentence and, when truthful, one trial/savings line.
- **Reveal later:** plan comparison, exact localized prices, renewal terms, complete inclusions, Terms, Privacy, and Restore.
- **Scan order:** brand/hero proof → outcome → commercial line when present → anchored CTA.
- **Must not add:** feature checklists, duplicate dismissals, unsupported urgency, invented prices, or explanatory copy that competes with the outcome.
- **Reuse map:** canonical drawer chrome, Pine brand token, Pro lockup, radiused media treatment, proof-notification treatment, large inverse button, and bottom action geometry.
- **Nearest internal precedent:** the reviewed Money Pro drawer described above. No external exemplar overrides it.
- **Behavior sources:** RevenueCat/StoreKit offer truth, the originating paywall reason/source, and the existing entitlement/resume-intent flow.
- **Required states:** verified trial eligible, ineligible, unknown, loading, unavailable, and misconfigured offer duration.
- **Proof path:** focused component tests plus screenshots from the real Simulator route at target device sizes; Apple purchase behavior requires separate Sandbox and signed-device proof.

| Store state | Contextual Money offer | Contextual CTA | Selected plan CTA | Selected plan disclosure |
| --- | --- | --- | --- | --- |
| Eligible, one-month free offer, annual pairs loaded | `One month free. Save up to {maxSavings}% with annual.` | `Try Pro free` | `Start one month free` | `Free for one month, then {localized price}/{cadence}. Renews automatically until canceled.` |
| Eligible, one-month free offer, annual comparison unavailable | `One month free.` | `Try Pro free` | `Start one month free` | Same renewal disclosure with the selected live price |
| Ineligible or no introductory offer, annual pairs loaded | `Save up to {maxSavings}% with annual.` | `Upgrade to Pro` | `Subscribe to Pro` | `{Localized price}/{cadence}. Renews automatically until canceled.` |
| Eligibility unknown, annual pairs loaded | `Save up to {maxSavings}% with annual.` | `Upgrade to Pro` | `Subscribe to Pro` | Same non-trial disclosure |
| Store data loading | Omit the optional commercial line; preserve layout | `Upgrade to Pro` | Disable purchase controls while showing `KwiltLoader` | None until StoreKit data arrives |
| Store data unavailable | Omit the drawer's optional commercial line | `Upgrade to Pro` | Show `We couldn’t load Apple’s current plans.` with `Try again` | Never render `Price unavailable`, invented pricing, or trial copy |
| Eligible offer is not exactly Apple's one-month free period | Do not advertise the trial; retain any valid annual savings | `Upgrade to Pro` | Use the live offer duration only in a diagnostic/test build; block paid release until App Store Connect is corrected | Never silently convert the offer to seven days or a hardcoded duration |

Annual savings uses StoreKit's numeric prices for matching Individual or Family monthly/annual products:

```ts
Math.round((1 - annualPrice / (monthlyPrice * 12)) * 100)
```

The contextual claim uses the highest available plan-specific percentage and therefore says **up to**. The selected plan says the exact percentage for that plan, for example `Save 50%`.

## File map

- Create `docs/product/contextual-pro-offer-migration-matrix.md` — inventory every current paywall reason and map its paid job, proof moment, creative requirement, CTA, analytics, and migration status against the Money template.
- Modify `src/features/paywall/FEATURE.md` — record the reviewed Money drawer as the canonical contextual Pro-offer template and distinguish its fixed structure from context-specific content.
- Modify `docs/feature-briefs/monetization-paywall-revenuecat.md` — replace the old “commercial details only in the plan chooser” rule with the eligibility-aware message matrix above.
- Modify `docs/release/kwilt-pro-monetization-rollout.md` — add source, App Store Connect, RevenueCat, and Sandbox evidence checkpoints.
- Modify `docs/testing/paywall-manual-test-plan.md` — add eligible, ineligible, unknown, misconfigured-duration, and unavailable-store cases.
- Modify `src/services/entitlements.ts` — normalize live price, introductory offer, and RevenueCat eligibility into one store snapshot.
- Modify `src/services/entitlements.test.ts` — prove eligible/ineligible/unknown/no-offer normalization and legacy SKU alias behavior.
- Modify `src/features/account/subscriptionPricing.ts` — replace customer-facing hardcoded savings math with live-price helpers and define the commercial presentation model.
- Modify `src/features/account/subscriptionPricing.test.ts` — prove savings, trial, renewal-disclosure, and failure-closed behavior.
- Create `src/features/account/useProStoreOffer.ts` — own loading/retry state and prevent duplicate StoreKit interpretation in the drawer and plan chooser.
- Create `src/features/account/useProStoreOffer.test.tsx` — prove loading, ready, unavailable, identity change, and retry behavior.
- Modify `src/features/paywall/PaywallDrawer.tsx` — render the optional commercial line and choose `Try Pro free` or `Upgrade to Pro` from verified eligibility.
- Modify `src/features/paywall/PaywallContent.test.tsx` — cover the Money hero's commercial states.
- Modify `src/features/paywall/PaywallInterstitialScreen.test.tsx` — verify the hosted bottom CTA still opens plan selection.
- Modify `src/features/account/ManageSubscriptionScreen.tsx` — show exact selected-plan savings, eligibility-aware CTA, renewal disclosure, and a useful load failure.
- Modify `src/features/account/ChangePlanScreen.tsx` — remove the unreachable placeholder's hardcoded prices/date and route real plan changes to Apple subscription management.
- Create `src/features/account/ManageSubscriptionScreen.offer.test.tsx` — cover eligible/ineligible/unknown/loading/unavailable plan chooser states and analytics.
- Modify `src/services/analytics/events.ts` and its registry/schema tests only if a store-offer-state property is not already allowed — preserve the existing funnel while making trial attribution truthful.
- Update `docs/app-store/submission-readiness-ledger.md` only after evidence is captured — record external configuration and signed purchase proof, not source intent.

### Task 0: Establish the overlapping-change baseline

**Files:**
- Inspect all paths in the File map without modifying them

- [x] **Step 1: Record checkout provenance**

Record `git branch --show-current`, `git rev-parse --short HEAD`, and `git status --short`. Confirm the current checkout remains the sole owner of Simulator/runtime verification.

- [x] **Step 2: Preserve affected-file diffs**

Review the current diffs for every already-modified affected file, especially `PaywallDrawer.tsx`, `PaywallContent.test.tsx`, `ManageSubscriptionScreen.tsx`, `entitlements.ts`, analytics contracts, and the three monetization documents. Classify each hunk as prerequisite work, task-owned work, or unrelated work. Never overwrite an unclassified hunk.

- [x] **Step 3: Run the focused baseline**

```bash
npm test -- --runInBand \
  src/services/entitlements.test.ts \
  src/features/account/subscriptionPricing.test.ts \
  src/features/paywall/PaywallContent.test.tsx \
  src/features/paywall/PaywallInterstitialScreen.test.tsx \
  src/features/account/ManageSubscriptionScreen.test.tsx \
  src/services/analytics/analytics.test.ts
```

Record exact failures as baseline evidence. Do not fix unrelated failures under this plan.

### Task 1: Amend the monetization contract before implementation

**Files:**
- Create: `docs/product/contextual-pro-offer-migration-matrix.md`
- Modify: `src/features/paywall/FEATURE.md`
- Modify: `docs/feature-briefs/monetization-paywall-revenuecat.md`
- Modify: `docs/release/kwilt-pro-monetization-rollout.md`
- Modify: `docs/testing/paywall-manual-test-plan.md`

- [x] **Step 1: Codify the accepted contextual-offer template**

Update `src/features/paywall/FEATURE.md` and the monetization brief to name the reviewed Money drawer as the canonical starting point for every contextual Pro offer. Preserve the fixed/adaptable split from this plan: future paths reuse the immersive hierarchy, proof moment, reductive copy, and bottom action geometry while supplying imagery, proof, and copy that are true to their own paid outcome.

Create the migration matrix by enumerating every active `PaywallReason`. For each reason, record the user-requested paid outcome, mechanism, retained control, proof moment, creative asset needed, CTA state, originating source/resume intent, current template compliance, and follow-up implementation status. This plan implements Money only; the matrix prevents the remaining contextual paths from being mistaken for complete.

- [x] **Step 2: Replace the outdated contextual-offer rule**

Change the brief so a contextual offer may display live-derived introductory and annual-savings claims, while the Apple-backed plan chooser remains the only purchase surface. Include the complete offer-state matrix from this plan and retain these invariants:

```md
- Trial copy appears only when RevenueCat reports `eligible` for the presented product and StoreKit reports a one-month free introductory period.
- `unknown`, `ineligible`, and `no_offer` never receive trial copy.
- Annual savings is calculated from the current storefront's numeric monthly and annual prices; it is never copied from the launch-price table.
- The contextual CTA is **Try Pro free** only for a verified one-month-eligible offer and **Upgrade to Pro** otherwise. **Start one month free**, purchase confirmation, localized renewal price, Terms, Privacy, and Restore remain in the Apple-backed plan chooser.
```

- [x] **Step 3: Add release and manual-proof checkpoints**

Add distinct checkboxes for source behavior, App Store Connect configuration, RevenueCat mapping, StoreKit local UI proof, Apple Sandbox purchase proof, webhook/mirror proof, and TestFlight verification. Explicitly state that a source merge does not prove the offer exists.

- [x] **Step 4: Validate the product documents**

Run:

```bash
npm run product:lint
```

Expected: all persona, JTBD, feature, job-flow, and brief references pass.

- [ ] **Step 5: Commit the contract change**

```bash
git add src/features/paywall/FEATURE.md docs/product/contextual-pro-offer-migration-matrix.md docs/feature-briefs/monetization-paywall-revenuecat.md docs/release/kwilt-pro-monetization-rollout.md docs/testing/paywall-manual-test-plan.md
git commit -m "docs: define truthful Pro trial offer states"
```

### Task 2: Normalize live StoreKit offer truth through RevenueCat

**Files:**
- Modify: `src/services/entitlements.ts`
- Modify: `src/services/entitlements.test.ts`

- [x] **Step 1: Write failing normalization tests**

Extend the RevenueCat mock with `checkTrialOrIntroductoryPriceEligibility` and `INTRO_ELIGIBILITY_STATUS`. Add table-driven cases asserting that canonical and legacy Pro SKUs return live numeric prices plus one of four normalized eligibility states.

```ts
const mockPurchases = {
  // existing methods
  checkTrialOrIntroductoryPriceEligibility: jest.fn(),
  INTRO_ELIGIBILITY_STATUS: {
    INTRO_ELIGIBILITY_STATUS_UNKNOWN: 0,
    INTRO_ELIGIBILITY_STATUS_INELIGIBLE: 1,
    INTRO_ELIGIBILITY_STATUS_ELIGIBLE: 2,
    INTRO_ELIGIBILITY_STATUS_NO_INTRO_OFFER_EXISTS: 3,
  },
};

it.each([
  [2, 'eligible'],
  [1, 'ineligible'],
  [0, 'unknown'],
  [3, 'no_offer'],
] as const)('normalizes RevenueCat eligibility %s to %s', async (status, expected) => {
  mockPurchases.getOfferings.mockResolvedValue(oneMonthFreeOffering());
  mockPurchases.checkTrialOrIntroductoryPriceEligibility.mockResolvedValue({
    pro_monthly: { status, description: expected },
  });

  const snapshot = await getProStoreOfferSnapshot('user-a');

  expect(snapshot.products.pro_monthly).toMatchObject({
    price: 9.99,
    priceString: '$9.99',
    introEligibility: expected,
    introPrice: {
      type: 'FREE_TRIAL',
      periodUnit: 'MONTH',
      periodNumberOfUnits: 1,
    },
  });
});
```

Also prove that a rejected eligibility call normalizes to `unknown`, not `eligible`, and that missing offerings return an unavailable snapshot without fabricated values.

Add regression coverage proving `purchaseProSku` purchases only the exact canonical or supported legacy SKU requested. When that package is absent, it must throw `SubscriptionPackagesUnavailableError`; it must never fall back to `availablePackages[0]` or buy a different plan/cadence.

- [x] **Step 2: Run the focused test and confirm failure**

```bash
npm test -- --runInBand src/services/entitlements.test.ts
```

Expected: FAIL because `getProStoreOfferSnapshot` and the normalized types do not exist.

- [x] **Step 3: Add the normalized store-offer types**

Add these public contracts to `src/services/entitlements.ts`:

```ts
export type IntroEligibilityState = 'eligible' | 'ineligible' | 'unknown' | 'no_offer';

export type ProStoreProductOffer = {
  sku: string;
  price?: number;
  priceString?: string;
  currencyCode?: string;
  introEligibility: IntroEligibilityState;
  introPrice?: {
    priceString: string;
    type?: string;
    cycles?: number;
    periodUnit?: string;
    periodNumberOfUnits?: number;
  };
};

export type ProStoreOfferSnapshot = {
  status: 'ready' | 'unavailable';
  products: Record<string, ProStoreProductOffer>;
};
```

Extend `EntitlementsSnapshot` with normalized post-purchase period truth derived from the active RevenueCat `pro` entitlement:

```ts
proPeriodType?: 'trial' | 'intro' | 'normal' | 'promotional' | 'unknown';
```

Extend `RevenueCatPurchasesLike` with the installed SDK's API:

```ts
checkTrialOrIntroductoryPriceEligibility?: (
  productIdentifiers: string[],
) => Promise<Record<string, { status: number; description: string }>>;
INTRO_ELIGIBILITY_STATUS?: Record<string, number>;
```

- [x] **Step 4: Fetch offerings and eligibility once**

Implement `getProStoreOfferSnapshot(appUserID?)` so it:

1. binds RevenueCat to the known app user ID;
2. loads the current Offering;
3. filters the current and legacy Pro product identifiers;
4. calls `checkTrialOrIntroductoryPriceEligibility` with those identifiers on iOS;
5. maps numeric eligibility values to the four string states;
6. preserves canonical SKU aliases;
7. returns `unknown` when eligibility cannot be determined;
8. returns `unavailable` when no live products/prices exist.

Also remove `matchingPackage ?? availablePackages[0]` from `purchaseProSku`. Require an exact supported SKU match and include the requested SKU plus available product identifiers in redacted diagnostics when it is missing. Extract `proPeriodType` from the completed purchase's active `pro` entitlement so downstream analytics describes what Apple actually granted.

Keep `getProSkuPricing()` as a compatibility wrapper during the migration, then remove it after both consumers use the new snapshot.

- [x] **Step 5: Run focused tests**

```bash
npm test -- --runInBand src/services/entitlements.test.ts
```

Expected: PASS, including legacy Money alias mapping and all eligibility states.

- [ ] **Step 6: Commit the RevenueCat adapter**

```bash
git add src/services/entitlements.ts src/services/entitlements.test.ts
git commit -m "feat(subscriptions): normalize live Pro offer eligibility"
```

### Task 3: Derive persuasive copy from live offer data

**Files:**
- Modify: `src/features/account/subscriptionPricing.ts`
- Modify: `src/features/account/subscriptionPricing.test.ts`

- [x] **Step 1: Write failing pure-logic tests**

Add tests for these exact outcomes:

```ts
expect(getAnnualSavingsPercentFromPrices(9.99, 59.99)).toBe(50);
expect(getAnnualSavingsPercentFromPrices(14.99, 79.99)).toBe(56);
expect(getAnnualSavingsPercentFromPrices(0, 59.99)).toBeNull();

expect(buildContextualCommercialOffer(eligibleOneMonthSnapshot)).toEqual({
  text: 'One month free. Save up to 56% with annual.',
  cta: 'Try Pro free',
  trialAdvertised: true,
  maximumAnnualSavingsPercent: 56,
});

expect(buildContextualCommercialOffer(ineligibleSnapshot)).toEqual({
  text: 'Save up to 56% with annual.',
  cta: 'Upgrade to Pro',
  trialAdvertised: false,
  maximumAnnualSavingsPercent: 56,
});

expect(buildContextualCommercialOffer(unknownWithoutPrices)).toBeNull();
expect(buildContextualCommercialOffer(eligibleSevenDaySnapshot)?.trialAdvertised).toBe(false);
expect(buildContextualCommercialOffer(eligibleSevenDaySnapshot)?.cta).toBe('Upgrade to Pro');
```

Add selected-plan tests for `Start one month free`, `Subscribe to Pro`, `Save 50%`, and the localized renewal disclosure.

Savings tests must also prove both prices are finite, positive, and use the same currency. A missing or mismatched currency suppresses the savings claim rather than comparing unlike storefront values.

- [x] **Step 2: Run the focused test and confirm failure**

```bash
npm test -- --runInBand src/features/account/subscriptionPricing.test.ts
```

Expected: FAIL because the live-price presentation helpers do not exist.

- [x] **Step 3: Implement the pure helpers**

Export these functions, all of which accept `ProStoreOfferSnapshot` or numeric live prices and never read `SUBSCRIPTION_PRICING`:

```ts
export function getAnnualSavingsPercentFromPrices(
  monthlyPrice: number | undefined,
  annualPrice: number | undefined,
  monthlyCurrencyCode?: string,
  annualCurrencyCode?: string,
): number | null;

export function buildContextualCommercialOffer(
  snapshot: ProStoreOfferSnapshot,
): {
  text: string;
  cta: 'Try Pro free' | 'Upgrade to Pro';
  trialAdvertised: boolean;
  maximumAnnualSavingsPercent: number | null;
} | null;

export function buildSelectedPlanOffer(args: {
  snapshot: ProStoreOfferSnapshot;
  plan: SubscriptionPlan;
  cadence: SubscriptionCadence;
}): {
  cta: 'Start one month free' | 'Subscribe to Pro';
  savingsLabel: string | null;
  renewalDisclosure: string | null;
  expectsTrial: boolean;
};
```

Treat a trial as advertisable in the selected-plan chooser only when the selected product has all four properties:

```ts
product.introEligibility === 'eligible'
&& product.introPrice?.type === 'FREE_TRIAL'
&& product.introPrice?.periodUnit === 'MONTH'
&& product.introPrice?.periodNumberOfUnits === 1
```

For the contextual drawer's broader `One month free` claim, require all four displayed Pro products to satisfy that predicate. If even one product is missing, unknown, ineligible, or configured with another duration, omit the drawer-level trial claim and let the chooser describe only the selected product's verified terms.

- [x] **Step 4: Remove customer-facing hardcoded savings use**

Retain the approved launch-price table only if another non-customer operational use still requires it. The drawer, plan chooser, savings badges, and purchase disclosures must use the live snapshot.

- [x] **Step 5: Run the focused tests**

```bash
npm test -- --runInBand src/features/account/subscriptionPricing.test.ts
```

Expected: PASS with no hardcoded trial duration or customer-facing savings calculation.

- [ ] **Step 6: Commit the presentation model**

```bash
git add src/features/account/subscriptionPricing.ts src/features/account/subscriptionPricing.test.ts
git commit -m "feat(subscriptions): derive trial offer copy from StoreKit"
```

### Task 4: Share loading and retry behavior between both offer surfaces

**Files:**
- Create: `src/features/account/useProStoreOffer.ts`
- Create: `src/features/account/useProStoreOffer.test.tsx`

- [x] **Step 1: Write failing hook tests**

Use a mocked `getProStoreOfferSnapshot` to prove:

```ts
type ProStoreOfferLoadState =
  | { status: 'loading'; snapshot: null }
  | { status: 'ready'; snapshot: ProStoreOfferSnapshot }
  | { status: 'unavailable'; snapshot: ProStoreOfferSnapshot | null };
```

The hook must load on mount, reload when `identifiedAppUserID` changes, ignore a stale request after identity change, expose `retry()` after an unavailable result, and retain unavailable-snapshot provenance so a development fixture remains visibly labeled.

- [x] **Step 2: Run the hook test and confirm failure**

```bash
npm test -- --runInBand src/features/account/useProStoreOffer.test.tsx
```

Expected: FAIL because the hook does not exist.

- [x] **Step 3: Implement the hook**

Use `useEntitlementsStore((state) => state.identifiedAppUserID)` as the identity input. Keep this hook read-only: it loads offer truth but does not purchase, restore, or mutate entitlement state.

- [x] **Step 4: Run the hook test**

```bash
npm test -- --runInBand src/features/account/useProStoreOffer.test.tsx
```

Expected: PASS for loading, ready, unavailable, identity change, stale result, and retry.

- [x] **Step 4a: Preserve a complete, honest development review path**

In development only, default the store-offer adapter to a complete planned launch catalog and expose deliberate `eligible`, `ineligible`, `unavailable`, and `live` states in Dev Tools. Label every fixture-backed chooser as **Simulator offer preview** and state that its prices were not loaded from Apple. A fixture CTA must never call purchase or imitate Apple's confirmation sheet; it directs the developer to choose **Live Apple** for real StoreKit testing. Production always uses the live RevenueCat path and never receives fixture pricing.

- [ ] **Step 5: Commit the shared loader**

```bash
git add src/features/account/useProStoreOffer.ts src/features/account/useProStoreOffer.test.tsx
git commit -m "feat(subscriptions): share live Pro offer loading"
```

### Task 5: Add the commercial offer to the Money hero

**Files:**
- Modify: `src/features/paywall/PaywallDrawer.tsx`
- Modify: `src/features/paywall/PaywallContent.test.tsx`
- Modify: `src/features/paywall/PaywallInterstitialScreen.test.tsx`

- [x] **Step 1: Write Money hero state tests**

Mock `useProStoreOffer` and assert:

```ts
expect(getByText('One month free. Save up to 56% with annual.')).toBeTruthy();
expect(getByLabelText('Try Pro free')).toBeTruthy();
expect(queryByText('Price unavailable')).toBeNull();
```

Add separate cases proving ineligible, unknown, unavailable, and misconfigured-duration states use `Upgrade to Pro`, show no trial claim, add no store-error text to the hero, and retain the full-width notification and bottom CTA.

Add structural assertions that the contextual template still renders one hero media frame, one proof notification, one outcome block, and one bottom action—with no feature list, legal copy, `Not now`, pricing grid, white footer, or second CTA.

- [ ] **Step 2: Run focused paywall tests and confirm failure**

```bash
npm test -- --runInBand src/features/paywall/PaywallContent.test.tsx src/features/paywall/PaywallInterstitialScreen.test.tsx
```

Expected: FAIL because the commercial line and eligibility-aware Money CTA are not implemented.

- [x] **Step 3: Render the optional commercial line**

Place one quiet but legible line below the explanatory body and above the independently anchored bottom action. Treat it as a small addition to the accepted template, not a redesign: preserve the single Pine field, `Kwilt | Pro` lockup, radiused tall image, focal-point-safe full-width proof notification, concise outcome block, canonical large white button, and equal-inset bottom geometry. Do not add a pricing card, feature list, terms, footer, or a second CTA. Use existing typography and spacing tokens.

```tsx
{commercialOffer ? (
  <Text style={styles.moneyCommercialOffer}>{commercialOffer.text}</Text>
) : null}
```

Replace the single `MONEY_UPGRADE_CTA_LABEL` with `MONEY_TRIAL_CTA_LABEL = 'Try Pro free'` and `MONEY_UPGRADE_CTA_LABEL = 'Upgrade to Pro'`. Read the CTA from `buildContextualCommercialOffer` when a verified one-month offer exists; otherwise use `Upgrade to Pro`. The press continues to save paywall reason/source and open the plan chooser; it does not invoke purchase directly.

- [x] **Step 4: Run focused tests**

```bash
npm test -- --runInBand src/features/paywall/PaywallContent.test.tsx src/features/paywall/PaywallInterstitialScreen.test.tsx
```

Expected: PASS for eligible, ineligible, unknown, loading, and unavailable states.

- [ ] **Step 5: Inspect the real Simulator route**

Open the Money setup path in the current iOS Simulator and capture screenshots for eligible, ineligible, and unavailable mocked StoreKit states. Compare each state with the canonical Money template: confirm the scan order is photo/notification → outcome → commercial line → bottom CTA; the photograph remains tall and radiused; the notification is full-width within the image and does not cover the subject; and the large white CTA stays independently anchored with equal side/bottom geometry. Confirm there is no collision, wrapping, white footer, or duplicate dominant action.

Repeat at the smallest supported iPhone viewport and with a large accessibility text size. Verify the drawer remains dismissible, the CTA remains reachable without obscuring content, the photograph crop protects its focal point, VoiceOver announces the proof notification as one coherent status, and traversal order follows the visual scan order.

- [ ] **Step 6: Commit the contextual offer**

```bash
git add src/features/paywall/PaywallDrawer.tsx src/features/paywall/PaywallContent.test.tsx src/features/paywall/PaywallInterstitialScreen.test.tsx
git commit -m "feat(paywall): add truthful Money trial offer"
```

### Task 6: Make the plan chooser complete the offer

**Files:**
- Create: `src/features/account/ProPlanChooserScreen.tsx`
- Modify: `src/features/account/ManageSubscriptionScreen.tsx`
- Modify: `src/navigation/RootNavigator.tsx`
- Modify: `src/services/paywall.ts`
- Modify: `src/features/account/ChangePlanScreen.tsx`
- Create: `src/features/account/ManageSubscriptionScreen.offer.test.tsx`
- Modify: `src/features/account/ManageSubscriptionScreen.test.tsx` if its existing assertions overlap

- [x] **Step 1: Write plan-chooser state tests**

Cover these behaviors:

- eligible Individual Annual shows `Save 50%`, `Start free trial`, and one quiet disclosure: `1 month free, then $59.99/year. Auto-renews until canceled.`;
- eligible Family Annual shows its own live savings percentage and renewal price;
- ineligible, unknown, and no-offer states show `Subscribe to Pro` with no trial claim;
- loading shows `KwiltLoader` and disables purchase;
- unavailable shows `We couldn’t load Apple’s current plans.` plus `Try again`, never `Price unavailable`;
- Terms, Privacy, and Restore remain in this purchase surface;
- the selected subscription name, duration, and concise Pro inclusion statement are present;
- the full localized amount Apple will bill is the most prominent pricing element, while savings and equivalent monthly math remain subordinate;
- purchase cancellation preserves the originating intent, emits no failure/success/trial event, and shows no failure alert.

The chooser is a dedicated full-screen destination, not a drawer nested inside Subscriptions. It uses the standard page Back affordance and the canonical bottom action dock. Because it is registered in the top-level navigation history, Back returns to the actual originating upgrade moment—including Money, Activities, Chat, More, or Subscriptions. An orphaned/direct entry falls back to Subscriptions. `kwilt://settings/subscription` continues to open account management rather than the purchase chooser.

The user-approved plan-chooser reference is the 2026-09-02 visual mockup with a quiet white canvas, Back/title/Restore header, one concrete outcome sentence, a full-width Annual/Monthly control, two large selectable plan rows, centered charge and renewal disclosure, legal links immediately above the canonical bottom action, and no feature list or competing CTA. Annual is the default comparison because it makes the verified savings visible without hiding Monthly. Translate the mockup through Kwilt tokens and live StoreKit values; do not hard-code its sample renewal date, prices, or incremental Family price.

- [ ] **Step 2: Run the focused screen tests and confirm failure**

```bash
npm test -- --runInBand src/features/account/ManageSubscriptionScreen.offer.test.tsx src/features/account/ManageSubscriptionScreen.test.tsx
```

Expected: FAIL because the chooser still infers a trial from intro metadata and defaults to seven days.

- [x] **Step 3: Replace local pricing state with `useProStoreOffer`**

Delete the screen's duplicated `skuPricing` and `pricingLoadState` interpretation. Derive the selected offer using `buildSelectedPlanOffer`.

Remove the separate Change Plan placeholder's hardcoded launch prices, fake effective date, inert Done action, and unwired cancellation dialog. That route must either open Apple subscription management or present an honest retryable failure; it must not resemble a working in-app plan change.

- [x] **Step 4: Render exact savings and renewal disclosure**

Add the plan-specific savings badge to annual plan rows only when both numeric live prices exist. Place the renewal disclosure adjacent to the purchase CTA and above `SubscriptionLegalLinks`.

- [x] **Step 5: Make purchase outcome and trial analytics transaction-confirmed**

Before purchase, capture `expectsTrial` only as the merchandising state shown to the customer. After `purchase()` resolves, emit `free_trial_started` only when the completed RevenueCat result confirms both active Pro and an actual trial period:

```ts
snapshot.isPro && snapshot.proPeriodType === 'trial'
```

Delete the current `introPrice === '$0.00'` guess and the `?? 7` duration fallback. Treat RevenueCat's user-cancelled purchase result as a neutral dismissal: preserve the intent and emit no `purchase_failed`, success, or trial event. Continue to emit `purchase_started`, `purchase_succeeded`, and the originating paywall reason/source for completed purchase attempts.

- [x] **Step 6: Register the measurable offer funnel**

Add explicit bounded analytics schemas and tests for `offer_state`, `variant`, `product_id`, `plan`, and `cadence`; use `money_contextual_template_v1` as the first variant. Do not send price, currency amount, transaction content, Apple identifiers, or free-form error text. Verify these stages retain the same `paywall_reason` and `paywall_source` where applicable:

```text
paywall_viewed
→ paywall_upgrade_cta_tapped
→ purchase_started
→ purchase_succeeded
→ upgrade_intent_resumed
```

Treat `free_trial_started` as a transaction classification, not an additional funnel step. The first release establishes a baseline by reason/source/variant; it does not invent a conversion target before observed data exists.

- [x] **Step 7: Run focused tests**

```bash
npm test -- --runInBand src/features/account/ManageSubscriptionScreen.offer.test.tsx src/features/account/ManageSubscriptionScreen.test.tsx src/services/analytics/analytics.test.ts
```

Expected: PASS with trial analytics emitted only for an eligibility-confirmed successful Pro activation.

- [ ] **Step 8: Inspect the plan chooser in Simulator**

Reach the chooser from the Money hero. Exercise Monthly/Annual and Individual/Family selection, partial-catalog failure, loading, retry, and purchase cancellation using a StoreKit configuration or mocks. Capture each state and verify VoiceOver labels include plan, cadence, localized price, savings, and selection state. Confirm the full amount billed remains visually dominant over savings and equivalent-rate language.

Development-preview execution record, 2026-09-02:

- [x] The real Simulator route shows the complete planned Individual/Family catalog for Monthly and Annual, including `$9.99/mo`, `$14.99/mo`, `$59.99/yr` with `Save 50%`, and `$79.99/yr` with `Save 56%`.
- [x] Eligible preview shows `Start free trial` and one compact trial-and-renewal disclosure; ineligible preview shows `Subscribe to Pro` with no trial claim.
- [x] Unavailable preview shows the retry state and never renders `Price unavailable`.
- [x] Fixture-backed states add no development banner to the customer surface, refresh after returning from Dev Tools, and cannot initiate a purchase; an intentional CTA tap explains how to switch to Live Apple testing.
- [x] The chooser now renders as a dedicated full-screen destination following the approved quiet purchase-page reference, with a standard Back affordance, no duplicate Restore action, annual-first comparison, stable plan-card geometry, and the canonical bottom action dock. Back from the Subscriptions entry returns to Subscriptions, where Restore remains available; route and screen tests cover contextual-history and orphaned-entry behavior. The chooser contains no generic Pro slogan: its job is plan selection and transparent purchase terms. The annual full-screen capture is `artifacts/upgrade-offer/plan-chooser-full-screen-annual.png`.
- [ ] Loading, partial live catalog, Apple cancellation, and the actual Apple purchase sheet remain StoreKit/Sandbox proof—not development-fixture proof.

- [ ] **Step 9: Commit the plan chooser**

```bash
git add src/features/account/ManageSubscriptionScreen.tsx src/features/account/ManageSubscriptionScreen.offer.test.tsx src/features/account/ManageSubscriptionScreen.test.tsx src/services/analytics
git commit -m "feat(subscriptions): present eligible one-month Pro trial"
```

### Task 7: Run source completion gates before external activation

**Files:**
- Review all files changed in Tasks 1–6

- [x] **Step 1: Run focused subscription and paywall verification**

```bash
npm test -- --runInBand \
  src/services/entitlements.test.ts \
  src/features/account/subscriptionPricing.test.ts \
  src/features/account/useProStoreOffer.test.tsx \
  src/features/paywall/PaywallContent.test.tsx \
  src/features/paywall/PaywallInterstitialScreen.test.tsx \
  src/features/account/ManageSubscriptionScreen.offer.test.tsx
```

Expected: all focused suites pass.

- [x] **Step 2: Run the task-completion gate once**

```bash
npm run verify:changed -- --run
```

Expected: all diff-derived gates pass. If the shared checkout contains unrelated failures, preserve those changes and report focused success separately with the exact unrelated blocker.

- [x] **Step 3: Record source provenance**

Record branch, commit, dirty state, Simulator/device, installed build, Metro path/port, and screenshots. Mark App Store Connect, RevenueCat, Sandbox, webhook, and TestFlight claims as unverified until the following tasks are complete.

Execution record, 2026-09-02:

- checkout: `/Users/andrewwatanabe/Kwilt`, branch `main`, HEAD `afd63cfc`, shared dirty checkout preserved;
- runtime: iOS 26.5 Simulator `Kwilt Chat Matrix` (`6B3B2C60-50AD-4CB5-8253-A6B578793829`), installed native shell build 117, Metro from this checkout on port 8081;
- source proof: focused regression suite passed 3 suites / 29 tests; app and test typechecks passed; the final diff-aware gate passed all checks, including 1,178 suites / 7,329 tests, product lint, EAS upload policy, code-health ratchets, generated agent map, and architecture lint;
- runtime proof: the canonical Money drawer and plan chooser were inspected from the real development route. The chooser now defaults to a clearly labeled, non-purchasing Simulator preview of the complete planned catalog; eligible, ineligible, unavailable, Monthly, and Annual states were exercised. The saved screenshot is `artifacts/upgrade-offer/plan-chooser-trial-preview.png`;
- proof boundary: fixture-backed Simulator states prove layout, interaction, copy branching, and failure presentation only. They do not prove Apple prices, introductory-offer eligibility, or purchase behavior;
- not yet verified: live eligible/ineligible StoreKit presentation, live App Store Connect product/offer configuration, RevenueCat mapping, Sandbox purchase lifecycle, webhook projection, and processed TestFlight behavior. Both external dashboards required fresh authentication.

### Task 8: Configure the one-month introductory offer in App Store Connect

**External system:** App Store Connect

- [ ] **Step 1: Resolve the exact production subscription group**

In App Store Connect, open Kwilt → Subscriptions. Confirm `pro_monthly`, `pro_annual`, `pro_family_monthly`, and `pro_family_annual` are in one subscription group. Record the group reference name and ID in the private release evidence; do not copy credentials or financial agreements into the repository.

- [ ] **Step 2: Verify product structure and storefront availability**

Confirm each product's duration, current localized price, cleared-for-sale state, localization, and territory coverage. Confirm Family Sharing is enabled only for the two Family products. Verify Individual and Family service levels produce the intended upgrade/downgrade behavior before launch.

- [ ] **Step 3: Create the introductory offer on all four products**

For each product, choose **Set up Introductory Offer** → intended countries/regions → **Free** → **1 Month**. Use the same start date and storefront coverage. Apple permits only one redeemed introductory offer per subscription group, even though the offer is configured on each product.

- [ ] **Step 4: Capture configuration evidence**

Capture product identifier, base duration, standard price, offer type `Free`, offer duration `1 Month`, start/end dates, and storefront coverage for each product. Wait at least one hour before treating missing Sandbox metadata as an app defect because Apple notes propagation can take that long.

- [ ] **Step 5: Keep release status on Hold**

Do not mark the offer live from dashboard screenshots alone. App Store configuration must agree with RevenueCat and a real Sandbox purchase sheet.

### Task 9: Map the products, entitlement, and Offering in RevenueCat

**External system:** RevenueCat

- [ ] **Step 1: Verify the correct Apple app and bundle mapping**

Confirm the RevenueCat project points to Kwilt's production Apple app and that the iOS public SDK key used by the signed build belongs to that app.

- [ ] **Step 2: Import and attach all four products**

Import `pro_monthly`, `pro_annual`, `pro_family_monthly`, and `pro_family_annual` from Apple. Attach every product to the single `pro` entitlement. Keep supported legacy Money identifiers attached only as purchase/restore compatibility aliases; they must not create another customer-facing entitlement.

- [ ] **Step 3: Configure the Current Offering**

Create or update the current Offering with four unambiguous packages:

```text
individual_monthly -> pro_monthly
individual_annual  -> pro_annual
family_monthly     -> pro_family_monthly
family_annual      -> pro_family_annual
```

Confirm the app's `getOfferings().current.availablePackages` returns all four product identifiers on a signed development build.

- [ ] **Step 4: Verify webhook and entitlement projection**

Confirm the authenticated RevenueCat webhook is enabled for the correct environment and that Sandbox events reach the subscription mirror without granting a second partial-trial entitlement. Preserve `pro` as the only customer-facing access signal.

- [ ] **Step 5: Capture RevenueCat evidence**

Capture the product-to-entitlement mapping, current Offering packages, app/API-key identity, and a Sandbox customer timeline. Keep secrets, receipts, and full customer identifiers out of screenshots and repository files.

### Task 10: Prove the real Apple purchase lifecycle

**Environments:** StoreKit local configuration, Apple Sandbox, signed physical iPhone, then TestFlight

- [ ] **Step 1: Prove presentation with StoreKit local testing**

Use a local StoreKit configuration mirroring all four products and a one-month introductory offer. Verify eligible/ineligible/loading/error visual states and all four plan/cadence selections. This proves UI behavior, not live App Store configuration.

- [ ] **Step 2: Prove an eligible Sandbox purchase**

Use a fresh Sandbox Apple account that has never redeemed an introductory offer in the Kwilt subscription group. From the Money hero:

1. confirm the drawer says `One month free`, shows live-derived annual savings, and uses `Try Pro free`;
2. open the plan chooser through `Try Pro free`;
3. confirm Apple's sheet displays the one-month trial and exact renewal price;
4. complete the purchase;
5. verify RevenueCat activates `pro` immediately;
6. verify Kwilt records `purchase_started`, `purchase_succeeded`, and exactly one `free_trial_started` with the Money reason/source;
7. verify the app resumes the original Money setup intent.

- [ ] **Step 3: Prove an ineligible Sandbox purchase path**

Use an Apple account that already consumed the group's introductory offer. Confirm neither the contextual drawer nor chooser promises a trial, Apple's sheet shows the standard charge, and Kwilt emits no `free_trial_started` event.

- [ ] **Step 4: Prove all product choices with separate Sandbox identities**

Because Apple grants only one introductory offer per subscription group, use fresh accounts as needed to verify Individual Monthly, Individual Annual, Family Monthly, and Family Annual metadata and purchase routing.

- [ ] **Step 5: Prove lifecycle state transitions**

Verify renewal, cancellation with access through expiration, billing retry/grace, grace recovery, confirmed expiration, refund, Restore Purchases, reinstall, account switch, and resubscribe. Confirm Money operations pause only after confirmed expiration/refund and retained history remains readable.

- [ ] **Step 6: Reconcile each system**

For the eligible trial case, confirm agreement among:

```text
Apple transaction: introductory offer + one-month period
RevenueCat customer: active pro entitlement + expected expiration
Webhook delivery: one initial purchase event, idempotent on replay
Subscription mirror: active trial/pro projection
Client: isPro === true
Analytics: one trial start with originating reason/source
```

- [ ] **Step 7: Verify the processed TestFlight build**

Repeat eligible and ineligible presentation plus one purchase/restore path in the processed internal TestFlight build. Record build number and date. Do not infer TestFlight behavior from the development client.

- [ ] **Step 8: Update the release ledger and lift Hold only with complete evidence**

Update `docs/app-store/submission-readiness-ledger.md` with redacted evidence references and the exact remaining gaps. Lift the monetization Hold only when App Store Connect, RevenueCat, signed-device, webhook/mirror, analytics, and TestFlight evidence all agree.

## Final self-review checklist

- [ ] No requested plan/cadence can silently purchase a different RevenueCat package.
- [ ] Trial analytics comes from the completed entitlement period, not pre-purchase eligibility alone.
- [ ] The selected plan makes the full localized charge more prominent than savings or equivalent-rate math.
- [ ] User cancellation is neutral and preserves the originating paid intent without failure messaging.
- [ ] The bounded funnel retains reason/source/variant through purchase and resume without collecting financial or personal content.
- [ ] The canonical drawer survives the smallest supported viewport, large text, and VoiceOver traversal.
- [ ] Every active paywall reason appears in the contextual-offer migration matrix even though this implementation slice changes Money only.
- [ ] The contextual Money offer still matches the reviewed canonical template: one Pine drawer, Pro lockup, radiused hero, in-image proof notification, reductive outcome copy, and one large white bottom CTA.
- [ ] The plan documents which template elements are fixed and which must adapt to each paid job; other upsell paths do not blindly reuse Money imagery or copy.
- [ ] The Money hero sells the outcome first and uses only one compact commercial line.
- [ ] Trial copy appears only for a RevenueCat-confirmed eligible Apple account.
- [ ] The advertised free period is Apple's one-month duration, never a custom 30-day timer or seven-day fallback.
- [ ] Annual savings comes from live numeric storefront prices and says `up to` before plan selection.
- [ ] The selected plan shows its exact localized renewal price, cadence, savings, and auto-renewal disclosure.
- [ ] No customer sees `Price unavailable` or invented fallback pricing.
- [ ] The contextual CTA is `Try Pro free` only for verified one-month eligibility and `Upgrade to Pro` otherwise.
- [ ] The contextual CTA opens plan choice; only `Start one month free` at the selected-plan step opens Apple confirmation.
- [ ] A successful introductory purchase activates the normal `pro` entitlement immediately.
- [ ] Ineligible and unknown accounts receive no trial promise and emit no trial-start analytics.
- [ ] App Store Connect, RevenueCat, source, Simulator, Sandbox, webhook, physical-device, and TestFlight proof remain explicitly distinct.
