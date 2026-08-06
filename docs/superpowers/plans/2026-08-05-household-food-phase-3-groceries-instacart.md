# Household Food Phase 3: Groceries and Instacart Implementation Plan

## Implementation checkpoint — August 5, 2026

Source and automated tests are complete for conservative compilation,
provenance, correction, Already have, offline list use, plain export, Activity
projection, and the remotely disableable Instacart list-link adapter. The
adapter excludes non-needed items and distinguishes link creation, opening, and
user-reported checkout. Supabase Local and live development-key list-link proof
remain required; no checkout or order state is claimed.

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Do not use subagents or create another worktree unless Andrew explicitly approves parallel execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compile a finalized MealPlan into a durable, correctable GroceryList with Recipe provenance, an ephemeral Already have review, a useful shopping Activity, and an honest Instacart or plain-list handoff.

**Architecture:** A deterministic server compiler consumes one immutable finalized MealPlan version plus its Recipe versions and writes a versioned GroceryList. Grocery items remain canonical food concepts; provider mappings and handoffs are separate records. Instacart link creation is server-side, idempotent by list revision/payload hash, remotely disableable, and never treated as checkout.

**Tech Stack:** Supabase Postgres/RLS/RPC/Edge Functions, TypeScript/Deno pure compiler, React Native, AsyncStorage read cache, Activity action cards, Instacart Developer Platform, Jest/RNTL, and pgTAP.

---

## Scope and file map

Create:

- `supabase/migrations/20260806030000_groceries.sql`
- `supabase/tests/groceries.sql`
- `src/capabilities/groceries/domain/groceryTypes.ts`
- `packages/food-core/package.json`, `tsconfig.json`, and source/tests for fractions, units, ingredient parsing, merging, aisle assignment, and provider payloads
- `src/capabilities/groceries/data/groceryRepository.ts` and test
- `src/capabilities/groceries/data/groceryCache.ts` and test
- `src/capabilities/groceries/screens/GroceryListScreen.tsx` and test
- `src/capabilities/groceries/screens/GroceryItemEditScreen.tsx` and test
- `src/capabilities/groceries/screens/AlreadyHaveReviewScreen.tsx` and test
- `src/capabilities/groceries/screens/GroceryHandoffScreen.tsx` and test
- `src/capabilities/groceries/activity/groceryActivityCardProvider.ts` and test
- `supabase/functions/_shared/groceryCompiler.ts` and Deno test
- `supabase/functions/_shared/groceryRetailerAdapters.ts` and test
- `supabase/functions/grocery-compile/index.ts`
- `supabase/functions/grocery-handoff/index.ts`

Modify capability registry/navigation, Activity provider registry, execution
destination copy, analytics, and `package.json` workspace scripts.

## Honest state machines

```text
GroceryList: compiling -> review_needed -> ready -> stale -> archived
GroceryItem: needed | already_have | purchased | skipped
RetailerHandoff:
  list_ready -> provider_link_requested -> provider_link_created
  -> opened_for_product_review -> user_reported_checkout_complete | abandoned | expired
```

There is no `ordered` state.

### Task 1: Add GroceryList, item, correction, and handoff schema

**Files:** migration, pgTAP, `groceryTypes.ts`

- [ ] **Step 1: Write schema/RLS tests** for owner reads, source plan/version,
  unique list revision, stable items, source-line provenance, user corrections,
  current/stale derivation, handoff idempotency, wrong-account denial, and RPC-
  only compilation/handoff writes.
- [ ] **Step 2: Run and verify failure.**
- [ ] **Step 3: Implement tables** `kwilt_grocery_lists`,
  `kwilt_grocery_items`, `kwilt_grocery_item_sources`,
  `kwilt_grocery_item_corrections`, and `kwilt_retailer_handoffs`. A list stores
  `source_meal_plan_id`, `source_meal_plan_version`, `revision`, `status`, and
  owner. Handoff stores provider, list revision, payload hash, state, encrypted
  or private URL, expiry, provider request id, and exact user-visible next step.
- [ ] **Step 4: Add RPCs** `compile_kwilt_grocery_list`,
  `update_kwilt_grocery_item`, `set_kwilt_grocery_item_state`,
  `add_kwilt_grocery_item`, and `mark_kwilt_grocery_list_reviewed` with optimistic
  revisions and stale-plan checks.
- [ ] **Step 5: Run pgTAP and commit.**

```bash
git add supabase/migrations/20260806030000_groceries.sql supabase/tests/groceries.sql src/capabilities/groceries/domain/groceryTypes.ts
git commit -m "feat: add versioned grocery lists"
```

### Task 2: Build the conservative ingredient compiler in `packages/food-core`

**Files:** package and all pure test/source files

- [ ] **Step 1: Write table-driven tests** for `1 1/2`, `1-2`, Unicode
  fractions, `one 14-ounce can`, count/weight separation, safe mass/volume
  conversions, whole versus crushed preparation, divided ingredients, optional
  garnish, `to taste`, produce bunch/count, serving scaling, incompatible units,
  original-line provenance, and deterministic output ordering.
- [ ] **Step 2: Run and verify failure.**

```bash
npm test -- --runInBand packages/food-core
```

- [ ] **Step 3: Implement these pure stages:**

```text
parseQuantity -> normalizeUnit -> splitConceptAndPreparation
-> scaleIngredient -> classifyMergeSafety -> mergeSafeIngredients
-> assignAisle -> buildGroceryCompilation
```

Only exact/high-confidence concepts with compatible units and preparation may
merge. Every output line retains all source recipe/version/ingredient-line ids.
Uncertain pairs remain separate with `reviewReason`.

- [ ] **Step 4: Add correction-learning shape without automatic learning.** A
  correction records before/after and reason; it does not create a global rule
  until repeated real evidence is reviewed in a later release.
- [ ] **Step 5: Run all pure tests and commit.**

```bash
git add packages/food-core package.json package-lock.json
git commit -m "feat: compile meal ingredients conservatively"
```

### Task 3: Compile atomically from finalized authority

**Files:** `groceryCompiler.ts`, Deno test, `grocery-compile/index.ts`

- [ ] **Step 1: Write Deno tests** for finalized-version load, stale plan,
  missing/deleted Recipe version, duplicate request, partial failure rollback,
  revision two after plan revision, and provenance persistence.
- [ ] **Step 2: Implement `grocery-compile`.** It accepts plan id and expected
  version, loads authority server-side, invokes `food-core`, then writes list,
  items, and sources in one RPC/transaction. Repeated identical input returns
  the existing list. A revised plan creates a new GroceryList revision and marks
  the prior list stale; it never rewrites reviewed items silently.
- [ ] **Step 3: Run and commit.**

```bash
deno test supabase/functions/_shared/__tests__/groceryCompiler_deno_test.ts
git add supabase/functions/_shared/groceryCompiler.ts supabase/functions/_shared/__tests__/groceryCompiler_deno_test.ts supabase/functions/grocery-compile
git commit -m "feat: compile finalized plans into groceries"
```

### Task 4: Build repository, offline cache, list correction, and Already have

**Files:** repository/cache, Grocery list/item/Already-have screens and tests

- [ ] **Step 1: Write tests** for cache account isolation, compiled grouping,
  recipe-source expansion, uncertain merge presentation, edit/split/merge/add/
  remove, revision conflict, Already have, reset, offline read, and stale plan.
- [ ] **Step 2: Implement repository/cache.** Cache validated owner projections
  only. All edits use expected list revision and refresh on conflict.
- [ ] **Step 3: Implement UI.** GroceryList groups by the bounded aisle
  vocabulary and shows Recipe provenance on demand. `Already have` is one quick
  pass over needed items; it creates no pantry database or replenishment model.
- [ ] **Step 4: Run tests and signed Simulator grocery-cycle QA.**
- [ ] **Step 5: Commit.**

```bash
git add src/capabilities/groceries/data src/capabilities/groceries/screens
git commit -m "feat: review and correct compiled groceries"
```

### Task 5: Add plain-list fallback before provider integration

**Files:** provider payload helpers/tests, `GroceryHandoffScreen.tsx`, test

- [ ] **Step 1: Write tests** for deterministic Markdown/plain-text export,
  share sheet, clipboard, provider unavailable, stale list, excluded Already-have
  items, and no hidden product substitution.
- [ ] **Step 2: Implement permanent fallback.** Export includes list title,
  grouped needed items, quantities, and optional notes; it excludes private
  Recipe story text and retailer identifiers.
- [ ] **Step 3: Run and commit.** The product is now useful without Instacart.

### Task 6: Add the Instacart list-link adapter

**Files:** retailer adapter files/tests, `grocery-handoff/index.ts`, Handoff UI/tests

- [ ] **Step 1: Write adapter contract tests** using recorded fixtures for
  payload construction, quantity/measure mapping, optional instructions,
  provider success, 4xx, 429/retry-after, timeout, malformed response, remote
  disable, expiry, stale revision, and idempotent replay.
- [ ] **Step 2: Implement server-only credentials and adapter registry.** The
  Instacart adapter supports only `list_link`. It sends reviewed `needed` items,
  records a payload hash and provider request id, stores the returned URL
  privately, and returns `provider_link_created` plus “Review products and check
  out on Instacart.”
- [ ] **Step 3: Implement regeneration and opening.** Expired links regenerate
  only from the current reviewed revision. Opening records
  `opened_for_product_review`; app foreground may ask the user whether checkout
  completed, but user report remains `user_reported_checkout_complete`.
- [ ] **Step 4: Run fixture tests, development-key proof, and commit.**

```bash
deno test supabase/functions/_shared/__tests__/groceryRetailerAdapters_deno_test.ts
npx jest src/capabilities/groceries/screens/GroceryHandoffScreen.test.tsx --runInBand
git add supabase/functions/_shared/groceryRetailerAdapters.ts supabase/functions/_shared/__tests__/groceryRetailerAdapters_deno_test.ts supabase/functions/grocery-handoff src/capabilities/groceries/screens/GroceryHandoffScreen.tsx src/capabilities/groceries/screens/GroceryHandoffScreen.test.tsx
git commit -m "feat: hand reviewed groceries to Instacart"
```

### Task 7: Project shopping work into an Activity without duplicating authority

**Files:** Grocery card provider/test, Activity registry, Activity lifecycle tests

- [ ] **Step 1: Write tests** for list-ready, needs-review, stale,
  provider-link-created, opened, expired, disconnected, and checkout-reported
  projections; Activity completion/deletion leaves GroceryList intact.
- [ ] **Step 2: Implement one optional `shopping_list` Activity** bound to the
  GroceryList. Primary action is Review list or Shop ingredients depending on
  state. Secondary is Copy list. The provider resolves current list revision
  and never embeds ingredients in the Activity binding.
- [ ] **Step 3: Run and commit.**

### Task 8: Phase completion gate

- [ ] Run all `food-core`, Supabase, Deno, Jest, lint, and changed-verification
  gates.
- [ ] Compile three real finalized plans and record merge/split/edit burden.
- [ ] Prove offline list use, account switch, stale regeneration, duplicate
  request, timeout, expired link, and remote-disable fallback.
- [ ] Use a development Instacart key to generate and open ten representative
  list pages; record whether product review is easier than re-entry.
- [ ] Request production review only after the compliant demo and real list-
  quality threshold pass.
- [ ] Do not start Kroger or savings if list correction remains the dominant
  work; fix canonical groceries first.
