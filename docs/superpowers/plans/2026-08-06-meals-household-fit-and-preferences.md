# Meals Household Fit and Preferences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Do not use subagents or create another worktree unless Andrew explicitly approves parallel execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Meals quietly adapt to the people eating by adding reversible meal hiding, optional first-run setup, person-specific food needs, diner-aware quantities, and multiple dishes within one planned meal without turning food into a household administration system.

**Architecture:** Preserve Recipes as reusable food knowledge, Meal Planning as the owner of diners and meal occasions, and Groceries as the consumer of finalized dish quantities. Add three narrow persisted concepts—personal hidden recipes, person-owned food needs, and planner defaults—then extend finalized Meal Plan entries with an occasion and intended diners while retaining entry-level provenance for grocery compilation. Normal meal selection stays one tap; fit controls appear only during setup, explicit editing, or a recorded conflict.

**Tech Stack:** React Native/Expo, React Navigation, Zustand, existing `BottomDrawer`, `DropdownMenu`, `SettingsSurface`, and toast primitives, Supabase Postgres/RLS/RPC, Jest/RNTL, pgTAP, Deno grocery compilation tests, and iOS Simulator/device verification.

---

## Product contract

### Job

When a household does not share one appetite, one set of food needs, or one dish, help the organizer choose food that works for the people eating so dinner can stay one coherent family moment without unsafe assumptions or repeated arithmetic.

### Reductive UI contract

- **Primary action:** add or keep a meal in the plan.
- **Must show now:** the meal, intended diners, and any recorded food conflict that affects them.
- **Reveal later:** individual food needs, per-dish servings, alternatives, planner defaults, and hidden meals.
- **Must not add:** adult/kid serving classes, a diet dashboard, a compulsory onboarding wizard, allergy badges on every library card, a third floating card control, household-wide hiding by default, or claims that a recipe is safe.
- **Normal state:** when there is no recorded conflict, adding a meal remains one tap and planner defaults are applied silently.
- **Conflict state:** name the recorded ingredient conflict and affected diner when the viewer is authorized; otherwise state only that one recorded food need conflicts.
- **Unknown state:** when structured ingredients are incomplete, say `Not checked against food needs`; never translate missing evidence into compatibility.

### Enhancement catalog

| ID | Enhancement | Owner | Release slice | Decision |
| --- | --- | --- | --- | --- |
| HF-01 | `Hide this meal` with immediate Undo | Recipes | A | Personal, reversible, and limited to catalog/editorial meals; it does not delete a Recipe or change a Meal Plan. |
| HF-02 | `Hidden meals` recovery drawer | Recipes | A | Open from the Meals ellipsis and restore in place; no standalone hidden-content dashboard. |
| HF-03 | Optional first-run Meals setup | Household Food | B | Show Meals first, then offer a two-row drawer for usual diners and food needs with `Not now`. |
| HF-04 | Usual diners | Meal Planning | B | Store people, not adult/kid serving categories; use a numeric fallback only when no diner identities exist. |
| HF-05 | Person-specific food needs | Household Food | B | Initial durable kind is `must_avoid`; dislikes and dietary styles remain separate signals. |
| HF-06 | Recorded conflict derivation | Meal Planning | B | Derive from structured recipe ingredient concepts and selected diners; persist source facts, not a safety verdict. |
| HF-07 | Contextual conflict resolution | Meal Planning | B | Offer `Make for everyone else`, `Choose another meal`, `Add another dish`, or `Not eating this time` without a warning modal. |
| HF-08 | One meal occasion with multiple dishes | Meal Planning | B | Group adult and child alternatives, allergy accommodations, and other split meals under one optional date/label. |
| HF-09 | Diner-aware quantities | Meal Planning + Recipes | B | Diners answer who; servings answer how much. Keep per-dish `− / +` and `Make one extra`; do not infer child portions. |
| HF-10 | Grocery compilation across all dishes | Groceries | B | Compile every finalized dish once, scaled by its servings, while preserving the exact Meal Plan entry source. |
| HF-11 | Contextual Meals controls plus canonical global settings | Meals + Settings | B | Ellipsis exposes quick summaries/editors; global `Settings > Meals` mirrors the same data. Remove the local full-page settings detour. |
| HF-12 | Explicit preference semantics | Food loop | B | Favorite means repeat, `Pass this time` is temporary, Hide suppresses future personal discovery, and `must_avoid` is person-specific. |
| HF-13 | Planning reminder after earned intent | Meal Planning + Activities | C | Offer only after the first finalized plan; default off and support one-time or recurring timing. Never ask during Meals onboarding. |

### Release boundaries

**Release A — Personal meal hiding** is independently shippable and does not require household setup or food-need authority.

**Release B — Household meal fit** ships as one coherent value unit. Do not release food-needs collection without conflict detection and a usable resolution path.

**Release C — Earned planning reminder** follows successful real planning. It is deliberately absent from first-run setup.

## File map

### Create

- `src/capabilities/recipes/data/hiddenRecipeRepository.ts`
- `src/capabilities/recipes/data/hiddenRecipeRepository.test.ts`
- `src/capabilities/recipes/data/hiddenRecipeCache.ts`
- `src/capabilities/recipes/data/hiddenRecipeCache.test.ts`
- `src/capabilities/recipes/runtime/useHiddenRecipeStore.ts`
- `src/capabilities/recipes/runtime/useHiddenRecipeStore.test.ts`
- `src/capabilities/recipes/components/HiddenMealsDrawer.tsx`
- `src/capabilities/recipes/components/HiddenMealsDrawer.test.tsx`
- `src/capabilities/recipes/components/AddToMealPlanSheet.test.tsx`
- `src/features/household-food/domain/householdMealFit.ts`
- `src/features/household-food/domain/householdMealFit.test.ts`
- `src/features/household-food/data/householdMealPreferencesRepository.ts`
- `src/features/household-food/data/householdMealPreferencesRepository.test.ts`
- `src/features/household-food/components/MealsSetupDrawer.tsx`
- `src/features/household-food/components/MealsSetupDrawer.test.tsx`
- `src/features/household-food/components/UsualDinersDrawer.tsx`
- `src/features/household-food/components/UsualDinersDrawer.test.tsx`
- `src/features/household-food/components/FoodNeedsDrawer.tsx`
- `src/features/household-food/components/FoodNeedsDrawer.test.tsx`
- `src/capabilities/meal-planning/components/MealFitCallout.tsx`
- `src/capabilities/meal-planning/components/MealFitCallout.test.tsx`
- `src/capabilities/meal-planning/components/MealOccasionDrawer.tsx`
- `src/capabilities/meal-planning/components/MealOccasionDrawer.test.tsx`
- `src/features/account/MealsSettingsScreen.tsx`
- `src/features/account/MealsSettingsScreen.test.tsx`
- `src/capabilities/meal-planning/components/MealPlanningReminderOfferDrawer.tsx`
- `src/capabilities/meal-planning/components/MealPlanningReminderOfferDrawer.test.tsx`
- `src/capabilities/meal-planning/screens/MealPlanFinalizeScreen.test.tsx`
- `src/capabilities/meal-planning/screens/NextMealsScreen.test.tsx`
- `src/capabilities/groceries/screens/GroceryListScreen.test.tsx`
- `supabase/functions/grocery-compile/index.test.ts`
- `supabase/migrations/20260806220000_meals_household_fit.sql`
- `supabase/tests/meals_household_fit.sql`

### Modify

- `src/capabilities/recipes/screens/RecipeLibraryScreen.tsx`
- `src/capabilities/recipes/screens/RecipeLibraryScreen.test.tsx`
- `src/capabilities/recipes/screens/RecipeHomeScreen.tsx`
- `src/capabilities/recipes/screens/RecipeHomeScreen.test.tsx`
- `src/capabilities/recipes/components/AddToMealPlanSheet.tsx`
- `src/capabilities/recipes/domain/mealPreferences.ts`
- `src/capabilities/recipes/domain/mealPreferences.test.ts`
- `src/capabilities/meal-planning/domain/mealPlanContracts.ts`
- `src/capabilities/meal-planning/domain/mealPlanContracts.test.ts`
- `src/capabilities/meal-planning/data/mealPlanningRepository.ts`
- `src/capabilities/meal-planning/data/mealPlanningRepository.test.ts`
- `src/capabilities/meal-planning/screens/MealPlanFinalizeScreen.tsx`
- `src/capabilities/meal-planning/screens/NextMealsScreen.tsx`
- `src/capabilities/groceries/screens/GroceryListScreen.tsx`
- `src/capabilities/meal-planning/activity/mealPlanningActivityCardProvider.ts`
- `src/capabilities/meal-planning/activity/mealPlanningActivityCardProvider.test.ts`
- `src/features/household-food/FoodNavigator.tsx`
- `src/features/account/SettingsHomeScreen.tsx`
- `src/features/account/SettingsHomeScreen.test.tsx`
- `src/navigation/RootNavigator.tsx`
- `src/domain/types.ts`
- `supabase/functions/grocery-compile/index.ts`
- `docs/design-explorations/meals-recipes-groceries/use-case-catalog.md`
- `docs/feature-briefs/household-food-loop.md`
- `src/features/household-food/FEATURE.md`

### Delete after the canonical Settings route is registered

- `src/capabilities/recipes/screens/MealsSettingsScreen.tsx`

---

### Task 1: Lock the pure household-fit and meal-occasion contracts

**Files:**
- Create: `src/features/household-food/domain/householdMealFit.ts`
- Test: `src/features/household-food/domain/householdMealFit.test.ts`
- Modify: `src/capabilities/meal-planning/domain/mealPlanContracts.ts`
- Test: `src/capabilities/meal-planning/domain/mealPlanContracts.test.ts`
- Modify: `src/capabilities/recipes/domain/mealPreferences.ts`
- Test: `src/capabilities/recipes/domain/mealPreferences.test.ts`

- [ ] **Step 1: Write failing tests for person-scoped fit evidence.**

```ts
expect(deriveMealFit({
  dinerPersonIds: ['adult', 'child'],
  foodNeeds: [{ id: 'need-1', personId: 'child', kind: 'must_avoid', ingredientConcept: 'peanut', displayLabel: 'Peanuts' }],
  recipe: { ingredientConcepts: ['bread', 'peanut'], ingredientEvidenceComplete: true },
})).toEqual({
  status: 'recorded_conflict',
  conflicts: [{ personId: 'child', ingredientConcept: 'peanut', displayLabel: 'Peanuts' }],
});

expect(deriveMealFit({
  dinerPersonIds: ['adult'],
  foodNeeds: [{ id: 'need-1', personId: 'child', kind: 'must_avoid', ingredientConcept: 'peanut', displayLabel: 'Peanuts' }],
  recipe: { ingredientConcepts: ['bread', 'peanut'], ingredientEvidenceComplete: true },
}).status).toBe('no_recorded_conflict');

expect(deriveMealFit({
  dinerPersonIds: ['child'],
  foodNeeds: [],
  recipe: { ingredientConcepts: [], ingredientEvidenceComplete: false },
}).status).toBe('not_checked');
```

- [ ] **Step 2: Run the focused tests and verify failure because the contracts do not exist.**

Run:

```bash
npx jest src/features/household-food/domain/householdMealFit.test.ts src/capabilities/meal-planning/domain/mealPlanContracts.test.ts src/capabilities/recipes/domain/mealPreferences.test.ts --runInBand
```

Expected: FAIL on missing `deriveMealFit`, `MealPlanOccasion`, and diner-aware quantity helpers.

- [ ] **Step 3: Implement the smallest pure types and derivation.**

```ts
export type PersonFoodNeed = {
  id: string;
  personId: string;
  kind: 'must_avoid';
  ingredientConcept: string;
  displayLabel: string;
};

export type MealFitResult =
  | { status: 'recorded_conflict'; conflicts: Array<{ personId: string; ingredientConcept: string; displayLabel: string }> }
  | { status: 'no_recorded_conflict'; conflicts: [] }
  | { status: 'not_checked'; conflicts: [] };

export function deriveMealFit(input: {
  dinerPersonIds: string[];
  foodNeeds: PersonFoodNeed[];
  recipe: { ingredientConcepts: string[]; ingredientEvidenceComplete: boolean };
}): MealFitResult {
  const diners = new Set(input.dinerPersonIds);
  const ingredients = new Set(input.recipe.ingredientConcepts.map((value) => value.trim().toLowerCase()));
  const conflicts = input.foodNeeds
    .filter((need) => diners.has(need.personId) && ingredients.has(need.ingredientConcept.trim().toLowerCase()))
    .map(({ personId, ingredientConcept, displayLabel }) => ({ personId, ingredientConcept, displayLabel }));
  if (conflicts.length) return { status: 'recorded_conflict', conflicts };
  return input.recipe.ingredientEvidenceComplete
    ? { status: 'no_recorded_conflict', conflicts: [] }
    : { status: 'not_checked', conflicts: [] };
}
```

- [ ] **Step 4: Extend the Meal Plan contract without adult/kid classes.**

```ts
export type MealPlanDish = {
  id: string;
  candidateId: string;
  kind: MealCandidate['kind'];
  recipeSnapshot: PlannedRecipeSnapshot | null;
  title: string;
  dinerPersonIds: string[];
  servings: number | null;
};

export type MealPlanOccasion = {
  id: string;
  title: string | null;
  placementDate: string | null;
  dishes: MealPlanDish[];
};
```

Validation must reject duplicate occasion IDs, duplicate dish IDs, unknown candidates, duplicate diner IDs, non-positive servings, and a finalized occasion with no dishes. Existing one-entry plans map to one occasion containing one dish.

- [ ] **Step 5: Replace the user-facing default calculation with diner-aware fallback.**

```ts
export function resolveSuggestedMealServings(input: {
  selectedServings?: number | null;
  usualDinerPersonIds?: string[];
  numericFallback?: number | null;
}): number {
  if (typeof input.selectedServings === 'number') return clampDefaultMealServings(input.selectedServings);
  if (input.usualDinerPersonIds?.length) return clampDefaultMealServings(input.usualDinerPersonIds.length);
  return resolveDefaultMealServings(input.numericFallback);
}
```

- [ ] **Step 6: Run tests and commit the pure model.**

```bash
npx jest src/features/household-food/domain/householdMealFit.test.ts src/capabilities/meal-planning/domain/mealPlanContracts.test.ts src/capabilities/recipes/domain/mealPreferences.test.ts --runInBand
git add src/features/household-food/domain/householdMealFit.ts src/features/household-food/domain/householdMealFit.test.ts src/capabilities/meal-planning/domain/mealPlanContracts.ts src/capabilities/meal-planning/domain/mealPlanContracts.test.ts src/capabilities/recipes/domain/mealPreferences.ts src/capabilities/recipes/domain/mealPreferences.test.ts
git commit -m "feat: model diner-aware household meals"
```

### Task 2: Add private persistence and authorization

**Files:**
- Create: `supabase/migrations/20260806220000_meals_household_fit.sql`
- Test: `supabase/tests/meals_household_fit.sql`

- [ ] **Step 1: Write pgTAP failures for ownership and scope.**

Prove all of the following:

- a person can hide and restore a recipe only for themselves;
- an active household member cannot read another household's planner defaults or food needs;
- an adult can manage their own `must_avoid` records;
- a caregiver can manage a dependent's records only when current Household authority permits it;
- a child or unrelated adult cannot mutate another adult's records;
- usual diners must be unique active people from the selected household;
- removing a member removes them from saved usual diners;
- a finalized plan can group two dishes under one occasion;
- each dish retains a valid candidate, diner list, servings, and source snapshot;
- stale plan versions and unauthorized finalization are rejected.

- [ ] **Step 2: Run the database tests and verify failure because the new tables and RPCs are absent.**

```bash
supabase test db
```

Expected: FAIL on missing relations and functions.

- [ ] **Step 3: Create the narrow tables.**

```sql
create table public.kwilt_hidden_recipes (
  person_id uuid not null references public.kwilt_people(id) on delete cascade,
  recipe_ref text not null check (char_length(btrim(recipe_ref)) between 1 and 200),
  created_at timestamptz not null default now(),
  primary key (person_id, recipe_ref)
);

create table public.kwilt_person_food_needs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.kwilt_households(id) on delete cascade,
  person_id uuid not null references public.kwilt_people(id) on delete cascade,
  kind text not null check (kind = 'must_avoid'),
  ingredient_concept text not null check (char_length(btrim(ingredient_concept)) between 1 and 120),
  display_label text not null check (char_length(btrim(display_label)) between 1 and 120),
  created_by_person_id uuid not null references public.kwilt_people(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, person_id, kind, ingredient_concept)
);

create table public.kwilt_meal_planner_preferences (
  person_id uuid primary key references public.kwilt_people(id) on delete cascade,
  household_id uuid not null references public.kwilt_households(id) on delete cascade,
  usual_diner_person_ids uuid[] not null default '{}',
  setup_state text not null default 'unseen' check (setup_state in ('unseen','skipped','completed')),
  updated_at timestamptz not null default now()
);

create table public.kwilt_meal_plan_occasions (
  id uuid primary key,
  plan_id uuid not null references public.kwilt_meal_plans(id) on delete cascade,
  plan_version integer not null,
  position integer not null check (position >= 0),
  title text,
  placement_date date,
  unique (plan_id, plan_version, position)
);

alter table public.kwilt_meal_plan_entries
  add column occasion_id uuid references public.kwilt_meal_plan_occasions(id) on delete cascade,
  add column diner_person_ids uuid[] not null default '{}';
```

- [ ] **Step 4: Add idempotent RPCs and restrictive RLS.**

Implement:

```text
set_kwilt_recipe_hidden(recipe_ref, hidden)
set_kwilt_person_food_need(person_id, ingredient_concept, display_label, present)
set_kwilt_meal_planner_preferences(household_id, usual_diner_person_ids, setup_state)
finalize_kwilt_meal_plan(plan_id, expected_version, occasions, organizer_note, idempotency_key, content_hash)
```

The food-need RPC computes `household_id` and `created_by_person_id` from authorized server state. Client input never supplies authority fields. The finalization RPC inserts occasions first and then their dishes into `kwilt_meal_plan_entries`; it validates every diner against the plan household and retains the entry IDs used by Groceries.

- [ ] **Step 5: Run pgTAP and commit the forward migration.**

```bash
supabase test db
git add supabase/migrations/20260806220000_meals_household_fit.sql supabase/tests/meals_household_fit.sql
git commit -m "feat: persist private meal fit preferences"
```

### Task 3: Build repositories, caches, and account-scoped stores

**Files:**
- Create: hidden-recipe repository/cache/store files listed in the file map
- Create: `src/features/household-food/data/householdMealPreferencesRepository.ts`
- Test: corresponding repository and store tests
- Modify: `src/domain/types.ts`
- Modify: `src/features/household-food/FoodNavigator.tsx`

- [ ] **Step 1: Write repository tests for validation and exact RPC payloads.**

```ts
await hidden.set('catalog:pbj', true);
expect(client.rpc).toHaveBeenCalledWith('set_kwilt_recipe_hidden', {
  p_recipe_ref: 'catalog:pbj',
  p_hidden: true,
});

await preferences.setFoodNeed({ personId: 'child', ingredientConcept: 'peanut', displayLabel: 'Peanuts', present: true });
expect(client.rpc).toHaveBeenCalledWith('set_kwilt_person_food_need', {
  p_person_id: 'child',
  p_ingredient_concept: 'peanut',
  p_display_label: 'Peanuts',
  p_present: true,
});
```

Also test malformed rows, account switching, cached read fallback, logout clearing, duplicate diner removal, failed optimistic mutations, and no persistence of person names or food labels in analytics/cache keys.

- [ ] **Step 2: Implement repository projections.**

```ts
export type HouseholdMealPreferencesProjection = {
  householdId: string;
  usualDinerPersonIds: string[];
  setupState: 'unseen' | 'skipped' | 'completed';
  foodNeeds: PersonFoodNeed[];
};
```

`hiddenRecipeCache` is keyed by authenticated user ID and supports signed-out local state. Household preferences remain server-authoritative; offline mode may show cached values but must not queue food-need mutations that could outlive changed Household authority.

- [ ] **Step 3: Initialize both stores from `FoodNavigator`.**

Set identity whenever `authIdentity.userId` changes, mirroring `useRecipeFavoriteStore`. Do not place food needs inside the broad global app store.

- [ ] **Step 4: Run tests and commit.**

```bash
npx jest src/capabilities/recipes/data/hiddenRecipeRepository.test.ts src/capabilities/recipes/data/hiddenRecipeCache.test.ts src/capabilities/recipes/runtime/useHiddenRecipeStore.test.ts src/features/household-food/data/householdMealPreferencesRepository.test.ts --runInBand
git add src/capabilities/recipes/data/hiddenRecipeRepository.ts src/capabilities/recipes/data/hiddenRecipeRepository.test.ts src/capabilities/recipes/data/hiddenRecipeCache.ts src/capabilities/recipes/data/hiddenRecipeCache.test.ts src/capabilities/recipes/runtime/useHiddenRecipeStore.ts src/capabilities/recipes/runtime/useHiddenRecipeStore.test.ts src/features/household-food/data/householdMealPreferencesRepository.ts src/features/household-food/data/householdMealPreferencesRepository.test.ts src/domain/types.ts src/features/household-food/FoodNavigator.tsx
git commit -m "feat: sync personal meal preferences"
```

### Task 4: Ship reversible personal meal hiding

**Files:**
- Create: `src/capabilities/recipes/components/HiddenMealsDrawer.tsx`
- Test: `src/capabilities/recipes/components/HiddenMealsDrawer.test.tsx`
- Modify/Test: `RecipeHomeScreen.tsx`, `RecipeLibraryScreen.tsx`

- [ ] **Step 1: Write failing UI tests.**

Require:

- `Hide this meal` appears in Recipe Home overflow only for catalog/editorial meals;
- hiding removes the recipe from shelves, recommendation rows, and ordinary results;
- the toast says `Hidden from your Meals` and offers `Undo`;
- Undo restores the recipe and server state;
- existing Meal Plans remain unchanged;
- `Pass this time` and removing a favorite do not hide a meal;
- Meals ellipsis shows `Hidden meals` only when at least one exists;
- the recovery drawer lists title/image and restores without leaving Meals;
- failed persistence restores the visible meal and shows a contained error.

- [ ] **Step 2: Run tests and verify they fail on missing hide behavior.**

```bash
npx jest src/capabilities/recipes/screens/RecipeHomeScreen.test.tsx src/capabilities/recipes/screens/RecipeLibraryScreen.test.tsx src/capabilities/recipes/components/HiddenMealsDrawer.test.tsx --runInBand
```

- [ ] **Step 3: Implement one overflow action, not another card button.**

```ts
showToast({
  message: 'Hidden from your Meals',
  actionLabel: 'Undo',
  actionOnPress: () => void setHidden(recipeRef, false),
});
```

Filter hidden references before calling `buildRecipeShelves`, recommendation derivation, and results rendering. Preserve direct resolution inside `HiddenMealsDrawer` so recovery does not depend on hidden content appearing in search.

- [ ] **Step 4: Run tests, inspect the real Recipe Home and Meals paths, and commit Release A.**

```bash
npx jest src/capabilities/recipes/screens/RecipeHomeScreen.test.tsx src/capabilities/recipes/screens/RecipeLibraryScreen.test.tsx src/capabilities/recipes/components/HiddenMealsDrawer.test.tsx --runInBand
git add src/capabilities/recipes/screens/RecipeHomeScreen.tsx src/capabilities/recipes/screens/RecipeHomeScreen.test.tsx src/capabilities/recipes/screens/RecipeLibraryScreen.tsx src/capabilities/recipes/screens/RecipeLibraryScreen.test.tsx src/capabilities/recipes/components/HiddenMealsDrawer.tsx src/capabilities/recipes/components/HiddenMealsDrawer.test.tsx
git commit -m "feat: hide and restore personal meals"
```

### Task 5: Build optional setup and mirrored settings ownership

**Files:**
- Create/Test: setup, usual-diner, food-needs drawers listed in the file map
- Create/Test: `src/features/account/MealsSettingsScreen.tsx`
- Modify/Test: `RecipeLibraryScreen.tsx`, `SettingsHomeScreen.tsx`
- Modify: `RootNavigator.tsx`, `FoodNavigator.tsx`

- [ ] **Step 1: Write failing tests for the reductive entry contract.**

Require:

- first Meals entry renders food before setup;
- `unseen` offers a drawer with exactly `Usually cooking for`, `Food needs`, `Done`, and `Not now`;
- `Not now` stores `skipped` and never blocks Meals;
- setup has no dislikes, diet quiz, serving classes, reminder, or notification permission;
- `Usually cooking for` selects active people and permits lightweight dependents already represented by Household;
- `Food needs` adds `must_avoid` to a named person and shows the evidence disclaimer once;
- Meals ellipsis exposes `Usually cooking for`, `Food needs`, and `Hidden meals` summaries;
- contextual controls open drawers rather than the full settings page;
- global Settings has one `Meals` destination using the same repositories and drawers;
- no duplicate state is stored in the contextual and global surfaces.

- [ ] **Step 2: Run tests and verify failure.**

```bash
npx jest src/features/household-food/components src/features/account/MealsSettingsScreen.test.tsx src/features/account/SettingsHomeScreen.test.tsx src/capabilities/recipes/screens/RecipeLibraryScreen.test.tsx --runInBand
```

- [ ] **Step 3: Implement the setup summary.**

```text
Make Meals fit your household

Usually cooking for      Everyone  >
Food needs               Add       >

Done
Not now
```

Use `BottomDrawer` with dynamic sizing, shared `SettingsRow` semantics inside the global screen, neutral buttons, and semantic warning color only for a real recorded conflict. Remove the contextual navigation to the current `MealsSettings` route. Add `SettingsMeals` to `SettingsStackParamList` and register it in the Settings stack.

Delete the old capability-local `MealsSettingsScreen.tsx` after the global route and all contextual drawers are covered by tests; do not leave two settings owners.

- [ ] **Step 4: Run tests and commit.**

```bash
npx jest src/features/household-food/components src/features/account/MealsSettingsScreen.test.tsx src/features/account/SettingsHomeScreen.test.tsx src/capabilities/recipes/screens/RecipeLibraryScreen.test.tsx --runInBand
git add src/features/household-food/components src/features/account/MealsSettingsScreen.tsx src/features/account/MealsSettingsScreen.test.tsx src/features/account/SettingsHomeScreen.tsx src/features/account/SettingsHomeScreen.test.tsx src/capabilities/recipes/screens/RecipeLibraryScreen.tsx src/capabilities/recipes/screens/RecipeLibraryScreen.test.tsx src/navigation/RootNavigator.tsx src/features/household-food/FoodNavigator.tsx src/capabilities/recipes/screens/MealsSettingsScreen.tsx
git commit -m "feat: add optional household meal setup"
```

### Task 6: Add conflict-aware selection without cluttering the library

**Files:**
- Create/Test: `MealFitCallout.tsx`
- Modify/Test: `AddToMealPlanSheet.tsx`, `RecipeHomeScreen.tsx`

- [ ] **Step 1: Write failing tests for normal, conflict, and unknown evidence states.**

Require:

- no fit row appears in ordinary library cards;
- no-conflict Add-to-Plan remains one tap;
- a known conflict names the ingredient and authorized affected person;
- `Make for everyone else` removes affected diners and changes the primary action to `Add for N`;
- `Choose another meal` returns without mutating the plan;
- excluding a diner creates an unresolved alternative requirement unless `Not eating this time` is chosen;
- incomplete structured ingredients render `Not checked against food needs` plus `Review ingredients`;
- no code or copy emits `safe`, `allergy-safe`, or `compatible` as a medical conclusion;
- private food-need labels are absent from analytics events and generic Activity projections.

- [ ] **Step 2: Run tests and verify failure.**

```bash
npx jest src/capabilities/meal-planning/components/MealFitCallout.test.tsx src/capabilities/recipes/components/AddToMealPlanSheet.test.tsx src/capabilities/recipes/screens/RecipeHomeScreen.test.tsx --runInBand
```

- [ ] **Step 3: Implement contextual fit presentation.**

```ts
type MealFitCalloutProps = {
  fit: MealFitResult;
  personLabelsById: Record<string, string>;
  canRevealPersonLabels: boolean;
  onMakeForOthers(): void;
  onChooseAnother(): void;
  onReviewIngredients(): void;
};
```

Known conflict copy: `Peanuts conflict with Avery's food needs.` Unauthorized copy: `This meal conflicts with 1 recorded food need.` Unknown copy: `Not checked against food needs.` The callout is inline inside the existing Add-to-Plan drawer; do not use `Alert.alert` for resolution.

- [ ] **Step 4: Run tests and commit.**

```bash
npx jest src/capabilities/meal-planning/components/MealFitCallout.test.tsx src/capabilities/recipes/components/AddToMealPlanSheet.test.tsx src/capabilities/recipes/screens/RecipeHomeScreen.test.tsx --runInBand
git add src/capabilities/meal-planning/components/MealFitCallout.tsx src/capabilities/meal-planning/components/MealFitCallout.test.tsx src/capabilities/recipes/components/AddToMealPlanSheet.tsx src/capabilities/recipes/components/AddToMealPlanSheet.test.tsx src/capabilities/recipes/screens/RecipeHomeScreen.tsx src/capabilities/recipes/screens/RecipeHomeScreen.test.tsx
git commit -m "feat: resolve recorded meal conflicts"
```

### Task 7: Finalize meal occasions with multiple diner-assigned dishes

**Files:**
- Create/Test: `MealOccasionDrawer.tsx`
- Modify/Test: `mealPlanningRepository.ts`, `MealPlanFinalizeScreen.tsx`, `NextMealsScreen.tsx`

- [ ] **Step 1: Write failing repository and UI tests.**

Cover:

- default one occasion/one dish per selected candidate;
- usual diners preselected;
- two dishes can share one occasion;
- a diner can be assigned to only the appropriate dish without being globally excluded from the plan;
- an excluded diner requires another dish or explicit `Not eating this time` resolution;
- servings default from selected diners, remain independently adjustable, and support `Make one extra`;
- dates remain optional and live on the occasion, not repeated across dishes;
- family choice counts remain input rather than authority;
- stale finalization and invalid diners preserve the reviewable draft;
- Next Meals groups dishes under one occasion and does not expose configuration fields in the summary.

- [ ] **Step 2: Run tests and verify failure on the old flat-entry model.**

```bash
npx jest src/capabilities/meal-planning/data/mealPlanningRepository.test.ts src/capabilities/meal-planning/components/MealOccasionDrawer.test.tsx src/capabilities/meal-planning/screens/MealPlanFinalizeScreen.test.tsx src/capabilities/meal-planning/screens/NextMealsScreen.test.tsx --runInBand
```

- [ ] **Step 3: Change the finalization input to occasions.**

```ts
finalize(input: {
  planId: string;
  expectedVersion: number;
  occasions: Array<{
    id: string;
    title: string | null;
    placementDate: string | null;
    dishes: Array<{
      id: string;
      candidateId: string;
      dinerPersonIds: string[];
      servings: number | null;
    }>;
  }>;
  organizerNote: string | null;
}): Promise<unknown>;
```

Hash the complete occasion payload. Map old finalized entries read from cache into one-dish occasions so recovery remains inspectable during the transition.

- [ ] **Step 4: Implement the reductive summary and drawer.**

The screen shows occasion cards with dish title and diner summary. Tapping a dish opens `MealOccasionDrawer` for diner selection, servings, `Make one extra`, `Add another dish`, and `Not eating this time`. Do not render adult/kid labels or always-visible text inputs.

- [ ] **Step 5: Run tests and commit.**

```bash
npx jest src/capabilities/meal-planning/data/mealPlanningRepository.test.ts src/capabilities/meal-planning/components/MealOccasionDrawer.test.tsx src/capabilities/meal-planning/screens/MealPlanFinalizeScreen.test.tsx src/capabilities/meal-planning/screens/NextMealsScreen.test.tsx --runInBand
git add src/capabilities/meal-planning/data/mealPlanningRepository.ts src/capabilities/meal-planning/data/mealPlanningRepository.test.ts src/capabilities/meal-planning/components/MealOccasionDrawer.tsx src/capabilities/meal-planning/components/MealOccasionDrawer.test.tsx src/capabilities/meal-planning/screens/MealPlanFinalizeScreen.tsx src/capabilities/meal-planning/screens/MealPlanFinalizeScreen.test.tsx src/capabilities/meal-planning/screens/NextMealsScreen.tsx src/capabilities/meal-planning/screens/NextMealsScreen.test.tsx
git commit -m "feat: plan split household meals"
```

### Task 8: Preserve grocery, Activity, Chat, and analytics boundaries

**Files:**
- Modify/Test: `supabase/functions/grocery-compile/index.ts`
- Modify/Test: `GroceryListScreen.tsx`
- Modify/Test: `mealPlanningActivityCardProvider.ts`
- Modify relevant Unified Chat context/policy tests only when they consume Meal Plan entries

- [ ] **Step 1: Write failing integration tests.**

Require:

- grocery compilation consumes every finalized dish exactly once;
- quantities scale from each dish's servings;
- two dishes in one occasion remain two provenance sources;
- grocery output contains no diner names, food-need labels, or allergy claims;
- stale plan versions still mark the grocery list stale;
- Activity cards summarize unresolved meal fit as `1 meal needs attention` without naming a person or ingredient;
- Chat reads authorized diner assignments but cannot invent, infer, or mutate food needs without the canonical RPC;
- analytics contain counts and state labels only: `conflict_count`, `diner_count`, `dish_count`, `fit_status`.

- [ ] **Step 2: Run tests and verify failure where flat entries are assumed.**

```bash
deno test supabase/functions/grocery-compile/index.test.ts
npx jest src/capabilities/groceries/screens/GroceryListScreen.test.tsx src/capabilities/meal-planning/activity/mealPlanningActivityCardProvider.test.ts src/features/unifiedChat --runInBand
```

- [ ] **Step 3: Update consumers to flatten dishes only at their authority boundary.**

Groceries receives entry-level snapshots and servings from finalized occasions, not raw food needs. Activity receives only aggregate unresolved state. Chat operations call the same preference and Meal Plan RPCs as native UI and preserve confirmation requirements.

- [ ] **Step 4: Run tests and commit.**

```bash
deno test supabase/functions/grocery-compile/index.test.ts
npx jest src/capabilities/groceries/screens/GroceryListScreen.test.tsx src/capabilities/meal-planning/activity/mealPlanningActivityCardProvider.test.ts src/features/unifiedChat --runInBand
git add supabase/functions/grocery-compile/index.ts supabase/functions/grocery-compile/index.test.ts src/capabilities/groceries/screens/GroceryListScreen.tsx src/capabilities/groceries/screens/GroceryListScreen.test.tsx src/capabilities/meal-planning/activity/mealPlanningActivityCardProvider.ts src/capabilities/meal-planning/activity/mealPlanningActivityCardProvider.test.ts src/features/unifiedChat
git commit -m "feat: carry diner-aware meals through the food loop"
```

### Task 9: Offer planning reminders only after earned intent

**Files:**
- Create/Test: `MealPlanningReminderOfferDrawer.tsx`
- Modify/Test: `MealPlanFinalizeScreen.tsx`
- Modify/Test: `mealPlanningActivityCardProvider.ts`

- [ ] **Step 1: Write failing activation tests.**

Require:

- no reminder or notification permission appears in Meals setup;
- the offer appears only after the current person successfully finalizes their first plan;
- dismissing it does not reappear on the next launch;
- choosing `One time` creates one nonrecurring Meal Planning Activity;
- choosing `Every week` creates recurrence only after the user chooses a weekday/time;
- all reminder defaults are off;
- the reminder opens the current plan or starts a new draft using current authority;
- deleting or completing the Activity never archives or finalizes the Meal Plan.

- [ ] **Step 2: Run tests and verify failure because the earned offer is absent.**

```bash
npx jest src/capabilities/meal-planning/components/MealPlanningReminderOfferDrawer.test.tsx src/capabilities/meal-planning/screens/MealPlanFinalizeScreen.test.tsx src/capabilities/meal-planning/activity/mealPlanningActivityCardProvider.test.ts --runInBand
```

- [ ] **Step 3: Implement the post-success offer.**

```text
Plan again when it fits

One time
Every week
Not now
```

The weekly branch reveals weekday and time only after selection. Reuse the existing Activity recurrence model and Meal Planning action-card binding; do not create a parallel notification-only reminder record.

- [ ] **Step 4: Run tests and commit Release C.**

```bash
npx jest src/capabilities/meal-planning/components/MealPlanningReminderOfferDrawer.test.tsx src/capabilities/meal-planning/screens/MealPlanFinalizeScreen.test.tsx src/capabilities/meal-planning/activity/mealPlanningActivityCardProvider.test.ts --runInBand
git add src/capabilities/meal-planning/components/MealPlanningReminderOfferDrawer.tsx src/capabilities/meal-planning/components/MealPlanningReminderOfferDrawer.test.tsx src/capabilities/meal-planning/screens/MealPlanFinalizeScreen.tsx src/capabilities/meal-planning/screens/MealPlanFinalizeScreen.test.tsx src/capabilities/meal-planning/activity/mealPlanningActivityCardProvider.ts src/capabilities/meal-planning/activity/mealPlanningActivityCardProvider.test.ts
git commit -m "feat: offer meal planning reminders after success"
```

### Task 10: Update product artifacts and run the full completion gate

**Files:**
- Modify: `docs/design-explorations/meals-recipes-groceries/use-case-catalog.md`
- Modify: `docs/feature-briefs/household-food-loop.md`
- Modify: `src/features/household-food/FEATURE.md`

- [ ] **Step 1: Add the accepted use cases to the existing catalog.**

Add distinct entries for:

- hiding and restoring a meal from personal discovery;
- person-specific must-avoid foods without household-wide suppression;
- planning one occasion with different dishes for different diners;
- resolving an excluded diner's meal explicitly;
- adjusting quantity without adult/kid serving classes;
- earning a planning reminder after successful use.

- [ ] **Step 2: Update the feature brief and manifest.**

Document that Meals remains the cookbook, Meal Planning owns diners/occasions, Groceries owns compiled execution, and food needs are private user-provided context rather than medical guarantees. Preserve `serves:` links already present in the brief.

- [ ] **Step 3: Run focused and broad automated verification.**

```bash
supabase test db
deno test supabase/functions/grocery-compile/index.test.ts
npx jest src/capabilities/recipes src/capabilities/meal-planning src/capabilities/groceries src/features/household-food src/features/account/MealsSettingsScreen.test.tsx --runInBand
npm run lint
npm run lint:tests
npm run product:lint
npm run architecture:lint
npm run verify:changed -- --run
git diff --check
```

Expected: all commands pass. `verify:changed` may still prescribe manual Simulator and signed-device follow-ups; record them rather than converting them into automated proof.

- [ ] **Step 4: Exercise the real iOS paths from the one runtime-owning checkout.**

Record checkout path, branch, commit, dirty state, installed build provenance, and Metro port. Verify:

1. first Meals entry shows food and `Not now` works;
2. a person records peanuts for one dependent;
3. a peanut meal remains available for other diners;
4. the known conflict excludes only the affected diner;
5. an alternative dish resolves the same meal occasion;
6. an adult dish and simpler child dish render as one dinner;
7. servings change independently and `Make one extra` updates groceries;
8. incomplete ingredients say `Not checked against food needs`;
9. Hide removes a catalog meal, Undo restores it, and Hidden meals restores after relaunch;
10. global Settings and the Meals ellipsis edit the same state;
11. the first finalized plan offers a reminder and subsequent plans do not repeat a dismissed offer;
12. Dynamic Type, VoiceOver order/labels, reduced motion, keyboard, safe area, and the smallest supported iPhone remain usable.

- [ ] **Step 5: Run signed two-account Household authorization proof.**

Prove self-management, caregiver-dependent management, unrelated-account denial, removed-member denial, participant read boundaries, and that private food-need details do not leak through Shared Home, Activities, Groceries, analytics, or another household member lacking authorization.

- [ ] **Step 6: Commit documentation and evidence references.**

```bash
git add docs/design-explorations/meals-recipes-groceries/use-case-catalog.md docs/feature-briefs/household-food-loop.md src/features/household-food/FEATURE.md
git commit -m "docs: record household meal fit delivery"
```

## Completion threshold

Do not call Release B complete from source or Simulator evidence alone. Completion requires:

- all automated gates passing;
- real Simulator proof of every visible state;
- signed two-account authorization proof for person-specific food needs;
- no safety claim generated from absent or incomplete ingredient evidence;
- Groceries compiling a two-dish occasion with correct quantities and provenance;
- a hidden meal remaining recoverable after relaunch;
- unrelated work in the active Food worktree remaining unstaged and unmodified.
