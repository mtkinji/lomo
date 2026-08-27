# Household Meal Count Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Save an authoritative usual household meal count independently from optional named diners and use it across Recipes and Meal Planning.

**Architecture:** Add one field to the existing household meal-preferences authority and carry it through the repository, cache, Zustand store, drawer, Settings summaries, Recipes default resolution, and Meal Planning. Preserve selected person IDs for food-need checks and keep People management in a separate future Settings surface.

**Tech Stack:** Expo React Native, TypeScript, Zustand, Jest/React Native Testing Library, Supabase Postgres/RPC/RLS.

**Execution note:** Run inline in the current checkout. Do not create a worktree or commit unrelated dirty changes.

---

### Task 1: Add the server authority field

**Files:**
- Modify: `supabase/pending-migrations/20260817180341_add_usual_diner_count.sql`
- Test: `src/features/household/data/householdMigration.test.ts`

- [x] Add failing migration-contract assertions for `usual_diner_count`, its 1–20 check, deterministic backfill, RPC parameter, count-versus-ID validation, and execute grants.
- [x] Run `npm test -- --runInBand src/features/household/data/householdMigration.test.ts`; expect the new assertions to fail against the empty migration.
- [x] Add the column, backfill existing rows from unique selected IDs or four, make it non-null with default four, and add the count-aware `set_kwilt_meal_planner_preferences` overload while retaining authority checks and the released command as a safe compatibility wrapper.
- [x] Revoke execution from `public, anon`, grant only `authenticated`, and rerun the focused migration test.

### Task 2: Carry count through pure logic and persistence

**Files:**
- Modify: `src/capabilities/recipes/domain/mealPreferences.ts`
- Modify: `src/capabilities/recipes/domain/mealPreferences.test.ts`
- Modify: `src/features/household-food/data/householdMealPreferencesRepository.ts`
- Modify: `src/features/household-food/data/householdMealPreferencesRepository.test.ts`
- Modify: `src/features/household-food/data/householdMealPreferencesCache.ts`
- Modify: `src/features/household-food/data/householdMealPreferencesCache.test.ts`

- [x] Add failing tests proving `usualDinerCount` wins over selected-ID length, malformed counts are rejected, and the RPC receives `p_usual_diner_count: 7` atomically with IDs.
- [x] Run the three focused suites and confirm the new expectations fail.
- [x] Extend `resolveSuggestedMealServings` so precedence is explicit dish servings, usual count, selected IDs, then numeric fallback.
- [x] Parse and validate `usual_diner_count`, provide a compatibility fallback from IDs or four, and include it in repository writes and cache parsing.
- [x] Re-run the three focused suites.

### Task 3: Add one atomic optimistic store command

**Files:**
- Modify: `src/features/household-food/runtime/useHouseholdMealPreferencesStore.ts`
- Modify: `src/features/household-food/runtime/useHouseholdMealPreferencesStore.test.ts`

- [x] Add failing tests for saving `{ usualDinerCount: 7, personIds: ['adult', 'child'] }`, rejecting counts below selected IDs, and rolling both values back after an RPC failure.
- [x] Run the focused store suite and confirm failure.
- [x] Change `setUsualDiners` to accept count and IDs together and pass the current count from setup-state writes.
- [x] Re-run the focused store suite.

### Task 4: Build the count-first drawer and shared entry points

**Files:**
- Modify: `src/features/household-food/components/UsualDinersDrawer.tsx`
- Modify: `src/features/household-food/components/UsualDinersDrawer.test.tsx`
- Modify: `src/features/account/MealsSettingsScreen.tsx`
- Modify: `src/features/account/MealsSettingsScreen.test.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeLibraryScreen.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeLibraryPresentation.tsx`

- [x] Add component tests for `7 people`, `People (optional)`, the selected-person lower bound, selection-driven count increase, count-preserving deselection, and the atomic Save payload.
- [x] Add Settings/Recipes tests showing summaries and contextual quantity use the count rather than ID length.
- [x] Implement the drawer using BottomDrawerHeader, Button/Icon/Typography, theme tokens, 44-point controls, accessibility labels/states, neutral selected checkboxes, and one Save action.
- [x] Wire Settings and RecipeLibrary to the atomic command. Use profile `defaultServings` only without Household preferences; otherwise make Recipes overflow edits update the household count.
- [x] Run the focused component and screen tests.

### Task 5: Preserve unnamed diners downstream

**Files:**
- Modify: `src/capabilities/recipes/components/AddToMealPlanSheet.tsx`
- Modify: `src/capabilities/recipes/components/AddToMealPlanSheet.test.tsx`
- Modify: `src/capabilities/meal-planning/screens/MealPlanFinalizeScreen.tsx`
- Modify: `src/capabilities/meal-planning/screens/MealPlanFinalizeScreen.test.tsx`

- [x] Add failing tests proving seven servings stays seven initially and becomes six—not one—when one conflicting named diner is excluded.
- [x] Add a failing finalization test proving usual count supplies servings while named IDs remain the diner list.
- [x] Subtract only newly excluded named diners from the current quantity and pass `usualDinerCount` into finalization default resolution.
- [x] Run both focused suites.

### Task 6: Verify product linkage and the real path

**Files:**
- Verify: `docs/feature-briefs/household-meal-count.md`
- Verify: `src/features/household-food/FEATURE.md`

- [x] Run `npm run product:lint` and fix any brief/manifest drift.
- [x] Run all focused suites touched above.
- [x] Run `npm run verify:changed -- --run` and read the complete result.
- [x] Start the current checkout's Metro runtime and open Settings → Meals → Usually cooking for on the iPhone 17 Pro Simulator.
- [ ] Exercise persistence and the next recipe/Meal Plan quantity path after the additive migration is deployed. The current-build visual pass covered 2 → 7 and selected-person hierarchy without pressing Save.
- [x] Run `git diff --check` on intentional files and reconcile the two Kwilt control-plane Activities, marking only the implemented count slice done.
