# Collaborative Household Recipe Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mature Recipes > Plan into one persistent household shortlist whose reactions, grocery contributions, readiness, and Made/Removed outcomes stay truthful without dates or planning rounds.

**Architecture:** Keep the existing open-horizon `kwilt_meal_plans` row as the household Plan and evolve its candidates into durable lifecycle occurrences. Reuse reaction records, grocery compilation, and grocery source rows; add candidate-scoped contributions and rebuild a latest household-Plan grocery revision atomically whenever sent membership changes. Ready to cook remains a projection derived from required grocery source satisfaction.

**Tech Stack:** Expo 55, React Native, TypeScript, Jest, Supabase Postgres/RLS/Realtime, Deno Edge Functions, `@kwilt/food-core`.

---

### Task 1: Replace the bounded-round product contract

**Files:**
- Modify: `docs/feature-briefs/live-family-meal-board.md`
- Modify: `src/capabilities/meal-planning/FEATURE.md`
- Modify: `src/features/household-food/FEATURE.md`
- Remove: `docs/design-explorations/live-family-meal-board/`
- Remove: `src/capabilities/meal-planning/domain/liveFamilyMealBoardMigration.test.ts`
- Remove: `supabase/migrations/20260811120000_bound_live_family_meal_board.sql`

- [ ] Rewrite the accepted brief around one persistent Plan, lifecycle grouping, contribution reconciliation, and truthful purchase evidence.
- [ ] Remove obsolete bounded-round artifacts and manifest claims.
- [ ] Run `npm run product:lint`; expect exit 0.

### Task 2: Preserve quantity on every grocery contribution

**Files:**
- Modify: `packages/food-core/src/index.ts`
- Modify: `packages/food-core/src/compiler.test.ts`
- Modify: `supabase/functions/_shared/groceryCompiler.ts`
- Modify: `supabase/functions/_shared/__tests__/groceryCompiler_deno_test.ts`

- [ ] Add failing tests proving merged cheese retains each recipe's scaled quantity and optional flag.
- [ ] Run the focused Jest and Deno tests; expect the new assertions to fail.
- [ ] Add `quantityMin`, `quantityMax`, `unit`, and `optional` to compiled source contributions.
- [ ] Re-run focused tests; expect exit 0.

### Task 3: Add the persistent Plan and grocery reconciliation authority

**Files:**
- Create: `supabase/migrations/<generated>_collaborative_household_recipe_plan.sql`
- Create: `supabase/tests/collaborative_household_recipe_plan.sql`
- Modify: `supabase/tests/meals_household_fit.sql`

- [ ] Generate the migration with `npx supabase migration new collaborative_household_recipe_plan`.
- [ ] Add candidate lifecycle/audit fields, household Plan grocery scope, candidate source FKs, contribution quantities, RLS, explicit grants, and Realtime publication guards.
- [ ] Replace destructive withdraw/finalize behavior with narrow RPCs for sending selected candidates, removing with or without grocery retention, and marking Made.
- [ ] Project lifecycle groups, reaction counts, missing-item counts, active count, and adult permissions from `get_kwilt_shared_meal_cart`.
- [ ] Recompile the latest Plan grocery revision from all active sent candidates, preserving matched manual corrections and acquired item history while excluding removed unpurchased contributions.
- [ ] Add SQL tests for single and shared quantities, permissions, lifecycle transitions, readiness, Made, Remove, and purchased-history preservation.
- [ ] Run the SQL contract tests available in the repository; expect exit 0.

### Task 4: Compile selected Plan candidates through the existing grocery edge

**Files:**
- Modify: `supabase/functions/_shared/groceryCompiler.ts`
- Modify: `supabase/functions/grocery-compile/index.ts`
- Modify: `supabase/functions/_shared/__tests__/groceryCompiler_deno_test.ts`
- Modify: `src/capabilities/meal-planning/data/mealPlanningRepository.ts`

- [ ] Add failing authority tests for candidate selection and non-adult rejection.
- [ ] Compile immutable candidate recipe snapshots using candidate IDs as contribution identity.
- [ ] Add repository methods `sendToGroceries`, `removeCandidate`, and `markMade`; retain reaction/add methods.
- [ ] Subscribe to current grocery list/item/source changes so readiness refreshes live.
- [ ] Run focused Edge Function and repository tests; expect exit 0.

### Task 5: Render the collaborative lifecycle in the existing Plan drawer

**Files:**
- Modify: `src/capabilities/meal-planning/domain/sharedMealCart.ts`
- Create: `src/capabilities/meal-planning/domain/planLifecycle.ts`
- Create: `src/capabilities/meal-planning/domain/planLifecycle.test.ts`
- Modify: `src/capabilities/recipes/screens/RecipeLibraryScreen.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeLibraryDrawers.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeLibraryScreen.styles.ts`
- Modify: `src/capabilities/recipes/screens/RecipeLibraryScreen.test.tsx`

- [ ] Add failing projection/sort tests: Ready, Sent, Ideas; votes descending; recency ties; stable interaction order.
- [ ] Replace Decide/Timing/Confirm with grouped active rows and compact second-line reactions.
- [ ] Add contextual `Send to Groceries` selection mode for Ideas without permanent checkboxes.
- [ ] Put Made and Remove in quiet contextual actions; use `AlertDialog` for the first sent-recipe removal consequence.
- [ ] Keep `Plan · N` as the only entry point and count active candidates only.
- [ ] Exercise empty, Ideas, Sent, Ready, selection, permission, long-title, and removal-confirmation component states.

### Task 6: Teach post-shopping continuation without overstating Kroger

**Files:**
- Create: `src/capabilities/recipes/data/planEducation.ts`
- Create: `src/capabilities/recipes/data/planEducation.test.ts`
- Modify: `src/capabilities/recipes/screens/RecipeLibraryScreen.tsx`
- Modify: `src/capabilities/groceries/screens/GroceryListScreen.tsx`
- Modify: `src/capabilities/groceries/screens/KrogerCartScreen.tsx`
- Modify: relevant navigation route contracts and tests

- [ ] Persist first-time orientation per person.
- [ ] Show `View Plan` only after manual/authoritative grocery satisfaction, never cart acknowledgment.
- [ ] Point a lightweight Coachmark at the existing Plan control on the first truthful ready transition.
- [ ] Add tests proving Kroger cart acknowledgment cannot create readiness.

### Task 7: Verify the full household story

**Files:**
- Modify: `docs/job-flows/job-flow-maya-feed-household-with-less-work.md`
- Modify: `docs/feature-briefs/live-family-meal-board.md`

- [x] Run focused Jest, Deno, product, and architecture tests. The SQL contract test passes; applying the migration locally remains blocked because Docker is not running.
- [x] Run `npm run verify:changed -- --run`; expect exit 0 or document exact external/runtime blocker.
- [ ] In the iPhone 17 Pro Simulator, enter through Recipes, add/react, send a subset, manually satisfy groceries, return through Plan, mark Made, and remove a shared-source recipe.
- [ ] Capture screenshots of Ideas, selection, Sent, Ready, and first removal confirmation.
- [x] Run the reductive critic on the live empty Plan and the populated component states: job clarity, hierarchy, action count, system fit, interaction, and long-title resilience pass. Populated end-to-end Simulator and Dynamic Type proof remain follow-up gates after the migration is applied.
