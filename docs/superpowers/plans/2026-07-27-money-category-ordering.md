# Money Category Ordering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Do not dispatch subagents unless Andrew explicitly asks for parallel agent work. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a household deliberately reorder Money categories once and see that durable order across Summary and category pickers.

**Architecture:** Reuse `budget_categories.sort_order`, but add an owner-scoped atomic RPC that accepts the complete active-category ID sequence and rewrites contiguous order values in one transaction. The client uses a dedicated reorder drawer with `react-native-draggable-flatlist`, applies a confirmed local category-array patch, and refreshes full Money truth in the background.

**Tech Stack:** React Native, TypeScript, Jest, `react-native-draggable-flatlist`, Supabase/Postgres, `HapticsService`.

---

Design source: [`docs/design-explorations/money-category-ordering/`](../../design-explorations/money-category-ordering/) and [`docs/feature-briefs/money-category-ordering.md`](../../feature-briefs/money-category-ordering.md).

### Task 1: Add The Atomic Order Contract

**Files:**
- Create: `supabase/migrations/20260727200000_reorder_budget_categories.sql`
- Create: `src/capabilities/money/domain/categoryOrder.ts`
- Create: `src/capabilities/money/domain/categoryOrder.test.ts`

- [ ] **Step 1: Write failing pure validation tests**

```ts
expect(validateCategoryOrder(['a', 'b'], ['b', 'a'])).toEqual({ valid: true, changed: true });
expect(validateCategoryOrder(['a', 'b'], ['a', 'a'])).toEqual({ valid: false, reason: 'duplicate' });
expect(validateCategoryOrder(['a', 'b'], ['a'])).toEqual({ valid: false, reason: 'set_mismatch' });
expect(validateCategoryOrder(['a', 'b'], ['a', 'b'])).toEqual({ valid: true, changed: false });
```

- [ ] **Step 2: Create the migration with the Supabase CLI**

```bash
npx supabase migration new reorder_budget_categories
```

Implement:

```sql
public.reorder_budget_categories(p_category_ids uuid[]) returns jsonb
```

The security-definer function must:

- require `auth.uid()`;
- reject null/empty arrays, duplicates, foreign IDs, inactive IDs, and any set that differs from all of the owner's active categories;
- lock the owner's active rows `for update`;
- update `sort_order = ordinality - 1` from `unnest(p_category_ids) with ordinality`;
- return `{ "category_ids": [...], "confirmed_at": "..." }`;
- set `search_path = public, pg_temp`, revoke public execute, and grant authenticated execute.

- [ ] **Step 3: Verify SQL and pure tests**

```bash
npx jest src/capabilities/money/domain/categoryOrder.test.ts --runInBand
npx supabase db lint --local
```

If Docker/local DB is unavailable, run repository SQL lint and record remote application as a separate authorized step.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations src/capabilities/money/domain/categoryOrder.ts src/capabilities/money/domain/categoryOrder.test.ts
git commit -m "feat(money): add atomic category ordering"
```

### Task 2: Add Confirmed Repository And Snapshot Patches

**Files:**
- Modify: `src/capabilities/money/data/moneyRepository.ts`
- Modify: `src/capabilities/money/data/moneyRepository.test.ts`
- Modify: `src/capabilities/money/data/moneyConfirmedPatches.ts`
- Modify: `src/capabilities/money/data/moneyConfirmedPatches.test.ts`
- Modify: `src/capabilities/money/data/moneyDataState.ts`
- Modify: `src/capabilities/money/data/moneyDataState.test.ts`
- Modify: `src/capabilities/money/data/MoneyDataContext.tsx`

- [ ] **Step 1: Write failing receipt tests**

Add:

```ts
export type ConfirmedCategoryOrderWrite = {
  confirmedAt: string;
  categorySourceIds: string[];
};
```

The repository test must reject a malformed response, a missing ID, or a reordered response that differs from the request.

- [ ] **Step 2: Add the repository method**

```ts
reorderCategories(categorySourceIds: string[]): Promise<ConfirmedCategoryOrderWrite>;
```

Call `rpc('reorder_budget_categories', { p_category_ids: categorySourceIds })`, validate the exact receipt, and return without loading the full snapshot.

- [ ] **Step 3: Add a confirmed local patch**

`applyConfirmedCategoryOrderPatch(snapshot, ids)` must reorder `snapshot.categories` by exact `sourceId`, leave every category object and all transactions unchanged, and throw on a set mismatch.

Add reducer action:

```ts
{ type: 'confirmed_category_order'; categorySourceIds: string[] }
```

The context applies the confirmed patch, triggers success/error haptics, and starts the existing versioned background refresh.

- [ ] **Step 4: Verify and commit**

```bash
npx jest src/capabilities/money/data/moneyRepository.test.ts src/capabilities/money/data/moneyConfirmedPatches.test.ts src/capabilities/money/data/moneyDataState.test.ts --runInBand
git add src/capabilities/money/data
git commit -m "feat(money): persist confirmed category order"
```

### Task 3: Build The Dedicated Reorder Drawer

**Files:**
- Create: `src/capabilities/money/components/MoneyCategoryReorderDrawer.tsx`
- Create: `src/capabilities/money/components/MoneyCategoryReorderDrawer.test.tsx`
- Modify: `src/capabilities/money/screens/MoneySummaryScreen.tsx`
- Create: `src/capabilities/money/screens/MoneySummaryScreen.test.tsx`

- [ ] **Step 1: Write failing drawer behavior tests**

Cover:

- title is exactly `Reorder categories` with no eyebrow;
- dragging changes local order but does not save immediately;
- Done calls `onSave` only when order changed;
- failed save keeps the drawer open and restores the prior authoritative order;
- `accessibilityActions` expose `Move up` and `Move down` and announce the new position.

- [ ] **Step 2: Implement the drawer**

Use `BottomDrawer`, `BottomDrawerHeader`, and `DraggableFlatList`. Each row shows only category name and a trailing `menu` drag handle. Long press begins drag and triggers `canvas.selection`. While saving, disable further drags and label the primary button `Saving…`.

- [ ] **Step 3: Add the Summary entry point**

Add `Reorder categories` after `Add category` in `summaryMenu`. Keep meter-grid behavior unchanged. When the confirmed save resolves, close the drawer, announce `Category order saved`, and let the confirmed snapshot patch update all current-month views.

- [ ] **Step 4: Verify and commit**

```bash
npx jest src/capabilities/money/components/MoneyCategoryReorderDrawer.test.tsx src/capabilities/money/screens/MoneySummaryScreen.test.tsx --runInBand
git add src/capabilities/money/components/MoneyCategoryReorderDrawer.tsx src/capabilities/money/components/MoneyCategoryReorderDrawer.test.tsx src/capabilities/money/screens/MoneySummaryScreen.tsx
git commit -m "feat(money): add category reorder drawer"
```

### Task 4: Prove Shared Ordering And Finish

- [ ] **Step 1: Add cross-surface projection coverage**

Extend `moneySnapshot.test.ts`, `moneyPeriodView.test.ts`, and transaction picker tests to prove a reordered category array is preserved in Summary, category selection, and split allocation lists. Search results may filter the sequence but must not alphabetize it.

- [ ] **Step 2: Run completion gates**

```bash
npm run product:lint
npm run verify:changed -- --run
```

- [ ] **Step 3: Run authenticated simulator proof**

Move Housing to first, save, refresh, relaunch, and confirm it remains first in Summary and the transaction picker. Confirm plan totals, category amounts, and transaction assignments are unchanged. Repeat with VoiceOver Move up/Move down.

- [ ] **Step 4: Keep deployment proof separate**

Local migration/source tests do not prove the linked Supabase function is deployed. Apply/deploy only with the normal authorized database workflow, then record the remote migration and same-account receipt separately.
