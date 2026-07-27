# Money Detail Restoration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Do not dispatch subagents unless Andrew explicitly asks for parallel agent work. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the sophisticated historical comparison, press-and-scrub chart inspection, and working Unsplash cover behavior on category detail while simplifying Money drawer headers to one clear title.

**Architecture:** Port the retired Money chart calculation and direct-manipulation inspection into tested native Money helpers, using the current snapshot's category-projected transactions (including splits and category credits). Keep the current chart as the decision-oriented foundation, render the historical average as subordinate evidence beside the actual and forecast lines, and reveal daily detail only while the user scrubs. Replace screen-local eyebrow/title stacks with the shared drawer header. Restore cover selection through Kwilt's existing Unsplash service and persist complete attribution metadata on the category; never depend on hard-coded name matching.

**Tech Stack:** React Native, `react-native-svg`, TypeScript, Jest, Supabase/Postgres, existing `src/services/unsplash.ts`, `BottomDrawerHeader`.

## UI contract

- **Job:** When reviewing a category, the user needs to compare this month's actual spending with the plan, likely month-end outcome, and trustworthy historical behavior so they can decide whether anything needs attention.
- **Primary action:** Inspect the chart directly by pressing and dragging across the month.
- **Must show:** Actual cumulative spend, planned capacity, forecast, current-day position, and a qualified historical average when evidence exists.
- **Reveal later:** Exact selected date, cumulative spend through that date, and spending on that date appear only while scrubbing; forecast explanation and settings remain in their existing drawers.
- **Must not add:** A second chart, a permanent tooltip, new forecast modes, historical behavior presented as advice, or decorative chart controls.
- **Reuse map:** Existing `MoneyDetailMeter`, `react-native-svg`, `BottomDrawerHeader`, Money haptic policy, and Unsplash service.
- **Behavior sources:** Current chart hierarchy, retired press-and-scrub interaction, the explicit decision to restore it, and the historical-line contract below.
- **Required states:** No eligible history, partial history, zero current spend, over-plan spend, reserve category, scrub start/move/release, interrupted gesture, VoiceOver adjustment, image loading/error/empty, and offline cover search.
- **Proof path:** Authenticated iPhone 17 Pro simulator through the current checkout and Metro port 8081; unit tests prove math and selection contracts, while simulator operation proves gesture ownership and layout.

---

## Historical line contract

- Use up to the prior 12 completed calendar months; never include the selected/current month.
- Project each historical month to 0–100% of its own calendar length, then average cumulative spend at each day position in the displayed month.
- Include counted posted outflows and category credits; exclude pending, transfers, and outside-plan activity.
- Respect split allocations by using the category-projected amount.
- Show no line with zero eligible months. With fewer than 12 eligible months, label the actual count (`4 mo avg`).
- Typical history, planned capacity, and forecast remain visually and semantically distinct.

## Scrub interaction contract

- Long-press anywhere inside the plotted chart to activate inspection, then drag horizontally across the month.
- Snap selection to a calendar day and show the date, cumulative spend through that day, and that day's net counted spend.
- Never allow selection after the current day for the active month; completed months may be inspected through period end.
- Temporarily disable the parent detail scroll while scrubbing, retain responder ownership during diagonal movement, and always restore scrolling on release, cancellation, or termination.
- Keep the tooltip inside chart bounds. Dismiss it on release so the chart returns to its quiet default state.
- Trigger one light selection haptic when scrubbing activates, not continuously while moving.
- Expose the chart as adjustable to assistive technology, with increment/decrement moving one day at a time and announcing the same date and spend values.

### Task 1: Replace Eyebrow Stacks With Shared Single Headers

**Files:**
- Modify: `src/capabilities/money/screens/MoneyTransactionDetailScreen.tsx`
- Modify: `src/capabilities/money/screens/MoneyCategoryDetailScreen.tsx`
- Create: `src/capabilities/money/screens/MoneyTransactionDetailScreen.test.tsx`
- Create: `src/capabilities/money/screens/MoneyCategoryDetailScreen.test.tsx`

- [x] **Step 1: Add failing header assertions**

The category picker must render one heading, `Where does this belong?`, and no `CATEGORY` eyebrow. Apply the same rule to touched Money drawers: `Rule for {category}`, `How this forecast works`, `Category settings`, and `Forecast settings`.

- [x] **Step 2: Use `BottomDrawerHeader`**

Replace local `drawerHeader`, `drawerEyebrow`, `drawerTitle`, and `closeButton` composition with:

```tsx
<BottomDrawerHeader title="Where does this belong?" variant="withClose" onClose={closePicker} />
```

Preserve each existing accessibility label and drawer containment. Do not change category-picker semantics from the previous refinement.

- [x] **Step 3: Verify and commit**

```bash
npx jest src/capabilities/money/screens/MoneyTransactionDetailScreen.test.tsx src/capabilities/money/screens/MoneyCategoryDetailScreen.test.tsx --runInBand
git add src/capabilities/money/screens
git commit -m "refactor(money): simplify drawer headers"
```

### Task 2: Port The Twelve-Month Historical Spend Contract

**Files:**
- Modify: `src/capabilities/money/domain/moneyDetailView.ts`
- Modify: `src/capabilities/money/domain/moneyDetailView.test.ts`
- Modify: `src/capabilities/money/domain/moneyPeriodView.ts`
- Modify: `src/capabilities/money/domain/moneyPeriodView.test.ts`

- [ ] **Step 1: Write failing historical-series tests**

Define:

```ts
export type HistoricalAverageSpend = {
  monthsUsed: number;
  series: MoneySpendPoint[];
};

export function buildHistoricalAverageSpendSeries(input: {
  transactions: MoneyTransaction[];
  periodStartIso: string;
  periodEndIso: string;
  maxMonths?: number;
}): HistoricalAverageSpend;
```

Test front-loaded Housing, continuous Groceries, category credit subtraction, excluded transfers/pending rows, split projected amounts, 28/29/30/31-day interpolation, fewer than 12 eligible months, and rejection of the displayed month.

- [ ] **Step 2: Port the proven algorithm**

Use the retired source's `getHistoricalAverageSpendSeries` behavior as provenance, but adapt it to `MoneyTransaction` and existing UTC-safe day helpers. Generate one point for every day in the displayed period and average only eligible month series.

- [ ] **Step 3: Expose full category history to detail**

Add `historicalTransactions` to `MoneyCategoryPeriodView`. Populate it by calling `projectMoneyTransactionsForCategory(snapshot.transactions, sourceCategory)` and filtering to completed months in the pure helper—not in the screen.

- [ ] **Step 4: Verify and commit**

```bash
npx jest src/capabilities/money/domain/moneyDetailView.test.ts src/capabilities/money/domain/moneyPeriodView.test.ts --runInBand
git add src/capabilities/money/domain
git commit -m "feat(money): restore historical spend comparison"
```

### Task 3: Render The Ghost Line And Restore Direct Chart Inspection

**Files:**
- Modify: `src/capabilities/money/components/MoneyDetailMeter.tsx`
- Create: `src/capabilities/money/components/MoneyDetailMeter.test.tsx`
- Modify: `src/capabilities/money/screens/MoneyCategoryDetailScreen.tsx`

- [ ] **Step 1: Add failing chart-presentation tests**

Prove:

- y-domain includes actual, historical, planned, and projected visible values;
- the historical path uses `colors.gray300`, 1.5 px stroke, 0.45 opacity, and no fill;
- actual remains solid and forecast remains dashed;
- label is `12 mo avg by today {amount}` or `{n} mo avg by today {amount}`;
- reserve categories do not render a monthly-spend comparison.
- scrub selection snaps to days, clamps to the observable period, and reports cumulative plus daily spend;
- tooltip placement stays within measured chart bounds;
- accessibility increment/decrement moves one day at a time;
- activation emits one haptic signal and release/cancellation clears selection and restores parent scrolling.

- [ ] **Step 2: Extend `MoneySpendChart`**

Pass `historicalSeries` and render its path before actual so it remains visually subordinate. Keep only the current-day vertical guide and existing plan line. Interpolate the historical value at `elapsedPercent` for the label; do not call it “allowed,” “expected,” or “forecast.”

- [ ] **Step 3: Restore press-and-scrub inspection**

Add a transparent responder layer over the SVG. Long-press starts inspection; horizontal movement selects the nearest inspectable day. Render a bounded tooltip with the selected date, cumulative spend, and that day's spend. Notify `MoneyCategoryDetailScreen` while scrubbing so its parent `ScrollView` uses `scrollEnabled={!chartScrubbing}`. Refuse responder termination during an active scrub, clear state on every exit path, and use the existing Money feedback policy for a single activation haptic.

- [ ] **Step 4: Add accessible chart summary and adjustment**

The chart container's accessibility label must distinguish: `{actual} spent; {historical} typical by today; {projected} forecast by month end; {planned} planned`. Give the inspection layer `accessibilityRole="adjustable"`; increment/decrement moves one day and announces the same selected-day facts as touch inspection.

- [ ] **Step 5: Verify and commit**

```bash
npx jest src/capabilities/money/components/MoneyDetailMeter.test.tsx src/capabilities/money/domain/moneyDetailView.test.ts --runInBand
git add src/capabilities/money/components/MoneyDetailMeter.tsx src/capabilities/money/components/MoneyDetailMeter.test.tsx src/capabilities/money/screens/MoneyCategoryDetailScreen.tsx
git commit -m "feat(money): show typical spend on category detail"
```

### Task 4: Restore A Real Persisted Unsplash Cover

**Files:**
- Create: `supabase/migrations/20260727201000_add_budget_category_cover.sql`
- Create: `src/capabilities/money/domain/moneyCategoryCover.ts`
- Create: `src/capabilities/money/domain/moneyCategoryCover.test.ts`
- Modify: `src/capabilities/money/data/moneySnapshot.ts`
- Modify: `src/capabilities/money/data/moneySnapshot.test.ts`
- Modify: `src/capabilities/money/data/moneyRepository.ts`
- Modify: `src/capabilities/money/data/moneyRepository.test.ts`

- [ ] **Step 1: Write failing cover validation tests**

```ts
export type MoneyCategoryCover = {
  source: 'unsplash';
  photoId: string;
  imageUrl: string;
  photographerName: string;
  photographerUrl: string;
  sourceUrl: string;
  color: string | null;
};
```

Reject non-HTTPS URLs, non-Unsplash image/source hosts, empty IDs/names, unknown keys, and payloads over 4 KB. Accept `null` to remove a cover.

- [ ] **Step 2: Add one constrained JSONB column**

Create the migration with:

```bash
npx supabase migration new add_budget_category_cover
```

Add `cover_image jsonb null` to `budget_categories` with an object/type/size check. In the same migration, add owner-scoped `public.set_budget_category_cover(p_category_id uuid, p_cover jsonb) returns jsonb`: require `auth.uid()`, update exactly one active category owned by that user, and return the confirmed category ID, cover payload, and timestamp. Set `search_path = public, pg_temp`, revoke public execute, and grant authenticated execute; no service-role bypass is introduced.

- [ ] **Step 3: Project and persist the exact metadata**

Select `cover_image` in `loadSnapshot`, validate it into `MoneyCategory.coverImage`, and add:

```ts
updateCategoryCover(categoryId: string, cover: MoneyCategoryCover | null): Promise<ConfirmedCategoryWrite>;
```

Call the owner-scoped RPC and require an exact receipt. Extend `ConfirmedCategoryWrite.changes` with `coverImage?: MoneyCategoryCover | null`, patch the confirmed category locally, and refresh in the background.

- [ ] **Step 4: Verify and commit the data slice**

```bash
npx jest src/capabilities/money/domain/moneyCategoryCover.test.ts src/capabilities/money/data/moneySnapshot.test.ts src/capabilities/money/data/moneyRepository.test.ts --runInBand
git add supabase/migrations src/capabilities/money/domain/moneyCategoryCover.ts src/capabilities/money/domain/moneyCategoryCover.test.ts src/capabilities/money/data
git commit -m "feat(money): persist category cover metadata"
```

### Task 5: Add Cover Search, Attribution, And Failure Fallback

**Files:**
- Create: `src/capabilities/money/components/MoneyCategoryCover.tsx`
- Create: `src/capabilities/money/components/MoneyCategoryCoverDrawer.tsx`
- Create: `src/capabilities/money/components/MoneyCategoryCover.test.tsx`
- Modify: `src/capabilities/money/screens/MoneyCategoryDetailScreen.tsx`
- Reuse unchanged: `src/services/unsplash.ts`

- [ ] **Step 1: Write failing UI tests**

Cover persisted image rendering, image-load failure fallback, photographer/Unsplash links, `Edit cover` menu entry, category-name initial query, search loading/error/empty states, save, and remove.

- [ ] **Step 2: Replace `getCategoryCover()`**

Delete the four hard-coded name checks. `MoneyCategoryCover` renders the persisted image with a gradient fallback. On `Image.onError`, keep the gradient visible and expose `Cover image unavailable` only to accessibility; do not leave a blurred empty band.

- [ ] **Step 3: Build explicit Unsplash selection**

Open `MoneyCategoryCoverDrawer` from category detail's existing overflow menu as `Edit cover`. Search occurs only after the user opens/uses this surface, using:

```ts
searchUnsplashPhotos(query, { perPage: 12, orientation: 'landscape' })
```

Default the query to the category name, show result thumbnails, and persist the selected photo's regular URL plus attribution metadata. After confirmed persistence, call `trackUnsplashDownload(photo.id)` best-effort. Never expose the access key or raw API error.

- [ ] **Step 4: Add quiet attribution**

Overlay `Photo by {name} on Unsplash` at the lower edge of the cover with tappable referred URLs from `withUnsplashReferral`. The overlay remains readable over light images and is omitted for the gradient fallback.

- [ ] **Step 5: Verify and commit**

```bash
npx jest src/capabilities/money/components/MoneyCategoryCover.test.tsx src/capabilities/money/domain/moneyCategoryCover.test.ts --runInBand
npm run lint
git add src/capabilities/money/components/MoneyCategoryCover.tsx src/capabilities/money/components/MoneyCategoryCoverDrawer.tsx src/capabilities/money/components/MoneyCategoryCover.test.tsx src/capabilities/money/screens/MoneyCategoryDetailScreen.tsx
git commit -m "fix(money): restore category cover images"
```

### Task 6: Finish And Prove The Detail Restoration

- [ ] **Step 1: Run completion gates**

```bash
npm run product:lint
npm run verify:changed -- --run
```

- [ ] **Step 2: Run authenticated simulator proof**

Check Housing with 12 eligible months, a category with fewer months, zero-spend current month, a split transaction month, reserve category, drawer headers, Unsplash search/select/remove, offline image failure, Dynamic Type, VoiceOver, and reduced motion. On the chart, verify long-press activation, horizontal and diagonal scrubbing, day snapping, tooltip bounds near both edges, one activation haptic signal, release/cancellation cleanup, and parent-scroll restoration.

- [ ] **Step 3: Keep proof boundaries explicit**

Unit tests prove chart math and payload validation. Simulator proves layout and interactions. A configured Unsplash key/network proves live search. Linked Supabase migration, signed-device persistence, and installed TestFlight remain separate until exercised.
