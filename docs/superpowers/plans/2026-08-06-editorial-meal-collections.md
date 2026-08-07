# Editorial Meal Collections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add rotating editorial meal Collections that let a user choose some meals or review a complete prepared plan before explicitly saving an editable household Meal Plan draft.

**Architecture:** Recipes owns immutable Collection content and recipe references; Meal Planning owns prepared templates and converts a serializable editorial seed into deduplicated Recipe-snapshot candidates. A deterministic edition resolver inserts at most two invitations into the existing Meals shelves. One new Collection screen holds temporary selection state and hands both adoption paths into the existing Meal Plan editor; no Collection state is persisted.

**Tech Stack:** React Native, Expo, TypeScript, React Navigation, Jest, React Native Testing Library, existing Recipe and Meal Planning repositories.

---

### Task 1: Editorial publishing contracts

**Files:**
- Create: `src/capabilities/recipes/domain/editorialMealCollectionContracts.ts`
- Create: `src/capabilities/recipes/domain/editorialMealCollectionContracts.test.ts`
- Create: `src/capabilities/recipes/data/editorialMealCollections.ts`

- [ ] **Step 1: Write failing contract tests**

Test that validation rejects missing recipes, duplicate entries, invalid
templates, more than two placements, and cuisine-led content without sourcing.
Test that the weekly resolver is stable within a week and changes at the next
calendar-week boundary.

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
npx jest src/capabilities/recipes/domain/editorialMealCollectionContracts.test.ts --runInBand
```

Expected: FAIL because the contract module does not exist.

- [ ] **Step 3: Implement the contracts and authored records**

Define:

```ts
export type EditorialCollectionJobIntent =
  | 'inspire_achievable'
  | 'escape_rotation'
  | 'explore_cuisine'
  | 'plan_budget'
  | 'reduce_effort';

export type CollectionMealEntry = {
  id: string;
  recipeId: string;
  recipeVersion: number;
  discoveryRole: 'familiar_anchor' | 'adjacent_discovery' | 'stretch';
  whyTry: string;
  whyDoable: string;
  firstTimeNote?: string;
};
```

Add `EditorialCollection`, `MealPlanTemplate`, and `MealEditorialPlacement`
records, a validator that resolves every reference against
`RecipeProjection[]`, and a UTC calendar-week resolver. Author at least a
Japanese weeknight Collection and a budget-minded dinner Collection using only
bundled Kwilt Recipe ids and qualitative cost language.

- [ ] **Step 4: Run the focused test and verify pass**

Run the Task 1 Jest command. Expected: PASS.

### Task 2: Meal Planning editorial seed conversion

**Files:**
- Create: `src/capabilities/meal-planning/domain/editorialMealPlanSeed.ts`
- Create: `src/capabilities/meal-planning/domain/editorialMealPlanSeed.test.ts`
- Modify: `src/features/household-food/FoodNavigator.tsx`
- Modify: `src/capabilities/meal-planning/screens/MealPlanEditorScreen.tsx`

- [ ] **Step 1: Write failing seed tests**

Test that a selection or template seed:

- resolves ordered Recipe ids into Recipe candidates;
- copies immutable Recipe version/media/source facts;
- records `{ kind, sourceId, sourceVersion }` inside snapshot provenance;
- deduplicates an existing draft by Recipe version;
- ignores missing Recipe ids rather than inventing candidates.

- [ ] **Step 2: Run the focused test and verify failure**

```bash
npx jest src/capabilities/meal-planning/domain/editorialMealPlanSeed.test.ts --runInBand
```

Expected: FAIL because the seed module does not exist.

- [ ] **Step 3: Implement serializable route and conversion**

Add this plain-data route shape:

```ts
export type EditorialMealPlanSeed = {
  kind: 'collection_selection' | 'meal_plan_template';
  sourceId: string;
  sourceVersion: number;
  sourceTitle: string;
  recipeIds: string[];
  horizon?: MealPlanHorizon;
};
```

Export `buildEditorialMealPlanCandidates` and
`mergeEditorialMealPlanCandidates`. Update `MealPlanEditor` to initialize or
merge the seed once, show the editorial source and unsaved boundary, and retain
all existing horizon/edit/save behavior.

- [ ] **Step 4: Run the focused tests**

Run the Task 2 test and existing Meal Plan lifecycle/presentation tests.
Expected: PASS.

### Task 3: Curated Collection page

**Files:**
- Create: `src/capabilities/recipes/screens/EditorialMealCollectionScreen.tsx`
- Create: `src/capabilities/recipes/screens/EditorialMealCollectionScreen.test.tsx`
- Modify: `src/features/household-food/FoodNavigator.tsx`
- Modify: `src/navigation/linkingConfig.ts`

- [ ] **Step 1: Write the component behavior tests**

Render the exported view and verify the hero premise, authored sections,
`Why try it?`, `Why it works tonight`, reversible selection, selected-count
tray, `Review selected meals`, and optional `Review the plan` action.

- [ ] **Step 2: Run the component test and verify failure**

```bash
npx jest src/capabilities/recipes/screens/EditorialMealCollectionScreen.test.tsx --runInBand
```

Expected: FAIL because the screen does not exist.

- [ ] **Step 3: Implement the Collection screen and route**

Resolve the Collection against `buildRecipeLibraryInventory`, keep selection in
component state, preserve it across Recipe detail navigation, and prepare the
appropriate `EditorialMealPlanSeed`. Before navigating, inspect Meal Planning;
if a draft exists, present explicit `Add to current draft` and `Start next plan`
choices. Repository failure must still permit review as a new unsaved plan.

- [ ] **Step 4: Run the screen tests**

Run the Task 3 Jest command. Expected: PASS.

### Task 4: Weekly offers in the Meals shelves

**Files:**
- Modify: `src/capabilities/recipes/screens/RecipeLibraryScreen.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeLibraryScreen.test.tsx`
- Modify: `src/services/analytics/events.ts`

- [ ] **Step 1: Replace the generic-offer assertions with failing editorial assertions**

Verify that broad shelf browsing shows no more than two current-edition offers,
places them after the third and sixth shelves when enough shelves exist, opens
the exact Collection, and omits them from narrowed results.

- [ ] **Step 2: Run the Recipe Library test and verify failure**

```bash
npx jest src/capabilities/recipes/screens/RecipeLibraryScreen.test.tsx --runInBand
```

Expected: FAIL until the editorial placement component is wired.

- [ ] **Step 3: Implement cards and placement**

Replace `PlanWithKwiltOffer` with a quiet `EditorialCollectionOffer` using
bundled Recipe artwork. Interleave placement records in the shelf list after
the configured section count. Navigate to `EditorialMealCollection` with a
plain collection id. Add metadata-only Collection open, selection-change, and
plan-review events; never emit recipe titles or ids.

- [ ] **Step 4: Run focused UI tests**

Run Recipe Library and Collection screen tests. Expected: PASS.

### Task 5: Documentation, lint, and diff-aware verification

**Files:**
- Modify: `docs/feature-briefs/household-food-loop.md`
- Create: `docs/design-explorations/editorial-meal-collections/04-learning-release.md`
- Create: `docs/design-explorations/editorial-meal-collections/05-evaluate-learning.md`

- [ ] **Step 1: Validate editorial records at test time**

Ensure the authored-data test asserts zero validation errors against the
bundled inventory.

- [ ] **Step 2: Run focused tests and typechecks**

```bash
npx jest \
  src/capabilities/recipes/domain/editorialMealCollectionContracts.test.ts \
  src/capabilities/meal-planning/domain/editorialMealPlanSeed.test.ts \
  src/capabilities/recipes/screens/EditorialMealCollectionScreen.test.tsx \
  src/capabilities/recipes/screens/RecipeLibraryScreen.test.tsx \
  --runInBand
npm run lint
npm run lint:tests
npm run product:lint
```

Expected: PASS with no new errors.

- [ ] **Step 3: Run repository completion verification**

```bash
npm run verify:changed -- --run
```

Expected: all gates caused by the current diff pass. If an unrelated existing
failure remains, record the exact suite, expectation, and why it is outside this
feature rather than claiming full verification.

- [ ] **Step 4: Record manual gates**

Document that Simulator/device verification must still prove shelf rhythm,
Collection scrolling, selection persistence through Recipe detail, active-draft
choice, Save behavior, plan finalization, and Grocery derivation from the exact
installed bundle.

## Self-review

- Spec coverage: contracts, authored content, rotation, curated page,
  choose-some, prepared plan, active-draft handling, copy provenance,
  analytics, and verification each have an implementation task.
- Deliberate exclusions: CMS, notifications, saved Collections, personalization,
  price promises, finalization, and Grocery changes are absent from code tasks.
- Type consistency: `EditorialMealPlanSeed` is the single route-to-editor
  handoff type; both Collection adoption paths use it.
