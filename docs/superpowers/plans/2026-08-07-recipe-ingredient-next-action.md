# Recipe Ingredient Next Action Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Recipe Home recommend ingredient review before cooking, using the exact To-do split-dock grammar and supporting either one Meal or a finalized Meal Plan without hidden plan mutation.

**Architecture:** Extract the existing To-do split action content into the project-owned UI layer, keep domain action selection in a tested Recipe helper, and route both scopes into the existing Groceries Already-have review. Extend Grocery persistence with an explicit `recipe_version` source alongside the existing `meal_plan` source, and authorize compilation through the existing authenticated Edge Function plus an owner-scoped security-definer RPC.

**Tech Stack:** React Native, TypeScript, React Navigation, Jest, Supabase Edge Functions (Deno), PostgreSQL migrations.

---

## UI contract

Job: When a Meal looks plausible but cooking has not begun, the user needs to identify what must be bought, so they can move from intention to one trustworthy Grocery list.

Authority chain: Andrew's explicit direction -> Household Food and Object Detail briefs -> iOS/accessibility requirements -> Kwilt UI constitution and tokens -> To-do Detail production precedent -> localized `ActionDock` and `DropdownMenu`.

Three-second read: Get ingredients is the next action; the chevron reveals scope and cooking/plan alternatives.

Primary action: Get ingredients before cooking; Continue cooking during an active Cook Session.

Primary information: Meal ingredients and whether the Meal is part of the current Meal Plan.

Secondary information: alternate ingredient scope, plan membership, and Start cooking.

Reveal later: the batch Already-have checklist, Grocery provenance, corrections, and retailer handoff.

Scan order: Meal identity -> ingredients -> state-derived dock action.

Must not add: a pantry database, separate questions per ingredient, hidden Meal Plan mutation, a second Recipe-specific dock component, or a new dashboard.

Reuse map: dock shell -> `ActionDock`; split anatomy -> shared extraction from `ActivityNextActionInlineContent`; selection -> `AlreadyHaveReviewScreen`; compilation -> `grocery-compile`; menu -> canonical `DropdownMenu`.

Nearest precedent: To-do Detail ActionDock. Recipe differs because its menu chooses Grocery scope and cooking/plan actions rather than Activity operations.

External exemplar ledger: N/A. The current-project To-do Detail is the selected accepted production precedent.

Behavior sources: ingredient-first next action and batch review -> Andrew's explicit decision; capability ownership -> `household-food-loop`; placement/anatomy -> To-do Detail production behavior; one-Meal source -> no-silent-plan decision.

Unresolved decisions: none that block the learning release. Unfinalized plans route to Meal Plan review rather than compiling speculative candidates.

Required states: not in plan, in draft plan, in finalized plan, active Cook Session, compilation busy/error, offline/cache, long labels/Dynamic Type, VoiceOver menu state.

Proof path: iPhone 17 Pro Simulator -> Meals -> open Meal -> inspect both plan states -> Get ingredients for this Meal -> batch Already-have review -> Grocery list; repeat with a finalized multi-Meal plan.

### Task 1: Shared split-action content

**Files:**
- Create: `src/ui/ActionDockSplitContent.tsx`
- Modify: `src/features/activities/ActivityNextActionDock.tsx`
- Test: `src/ui/ActionDockSplitContent.test.tsx`

- [ ] Write a component test that renders a primary action and menu actions, presses both, and verifies `primary` versus `menu` source callbacks plus disabled accessibility state.
- [ ] Run `npm test -- --runInBand src/ui/ActionDockSplitContent.test.tsx` and confirm it fails because the shared component does not exist.
- [ ] Move the current split pressable/divider/dropdown anatomy into `ActionDockSplitContent`, parameterized by `{ recommendedAction, menuActions, onActionPress, disabledActionIds, menuAccessibilityLabel, getMenuTestID }`.
- [ ] Make `ActivityNextActionInlineContent` a typed adapter around the shared component so To-do behavior and tests remain stable.
- [ ] Run the focused test and existing Activity dock tests.

### Task 2: Recipe next-action selection

**Files:**
- Create: `src/capabilities/recipes/domain/recipeNextAction.ts`
- Test: `src/capabilities/recipes/domain/recipeNextAction.test.ts`

- [ ] Write table tests for outside-plan, draft-plan, finalized-plan, and active-Cook states.
- [ ] Run the focused test and confirm the missing helper failure.
- [ ] Implement `deriveRecipeNextActions` returning one recommended action plus ordered alternatives using concrete ids: `get_this_meal`, `get_meal_plan`, `review_meal_plan`, `start_cooking`, `continue_cooking`, `add_to_plan`, and `remove_from_plan`.
- [ ] Run the focused test and confirm all state cases pass.

### Task 3: One-Meal Grocery authority

**Files:**
- Modify: `supabase/functions/_shared/groceryCompiler.ts`
- Modify: `supabase/functions/_shared/__tests__/groceryCompiler_deno_test.ts`
- Modify: `supabase/functions/grocery-compile/index.ts`
- Modify: `src/capabilities/groceries/data/groceryRepository.ts`
- Modify: `src/capabilities/groceries/data/groceryRepository.test.ts`
- Create: generated migration `supabase/migrations/*_support_recipe_scoped_grocery_lists.sql`
- Modify: `src/capabilities/groceries/domain/groceryPersistence.test.ts`

- [ ] Add failing Deno tests proving a readable immutable Recipe version compiles with serving scaling and bundled catalog snapshots retain catalog provenance.
- [ ] Add failing Jest repository tests proving `compileRecipe` sends only the immutable Recipe snapshot and requested servings.
- [ ] Generate the migration with `supabase migration new support_recipe_scoped_grocery_lists`.
- [ ] Extend `kwilt_grocery_lists` with an explicit source kind and nullable, mutually exclusive Meal Plan/Recipe source columns plus source-specific unique indexes.
- [ ] Add `compile_kwilt_recipe_grocery_list`, validating permanent identity, Recipe read authority or strict bundled-catalog snapshot shape, item/source bounds, idempotency, and owner-scoped insertion. Keep RLS enabled and revoke execution from public/anon.
- [ ] Extend the Edge Function request union and compiler helper for one Recipe without weakening finalized Meal Plan authority.
- [ ] Add `compileRecipe` to the repository and map source metadata without exposing private Recipe details.
- [ ] Run focused Jest and Deno verification.

### Task 4: Recipe Home dock and navigation

**Files:**
- Modify: `src/capabilities/recipes/screens/RecipeHomeScreen.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeHomeScreen.test.tsx`
- Modify: `src/features/household-food/FoodNavigator.tsx`
- Modify: `src/capabilities/groceries/screens/AlreadyHaveReviewScreen.tsx`
- Modify: `src/capabilities/groceries/screens/AlreadyHaveReviewScreen.test.tsx`

- [ ] Replace the Recipe bespoke cook content with shared split-action content and exact To-do insets (`spacing.xl`, `16`, half safe-area lift).
- [ ] Remove Recipe Home ingredient check-state interaction so rows remain recipe information.
- [ ] Wire `get_this_meal` to `compileRecipe` then replace into `AlreadyHaveReview`; wire `get_meal_plan` to existing finalized-plan compilation; wire draft-plan review to `NextMeals`; retain cooking and explicit plan membership actions.
- [ ] Change Already-have copy to `What do you already have?`, show quantities with each concept, and label completion `Make grocery list` while preserving offline synchronization truth.
- [ ] Update component tests for dock action/menu behavior, plan state, plain ingredient rows, compilation navigation, batch-review copy, and long/accessibility labels.
- [ ] Run focused Recipe Home and Already-have tests.

### Task 5: Reduction, verification, and runtime proof

**Files:**
- Modify only files required by failures from the scoped change.

- [ ] Confirm one dominant dock action, one bottom fade owner, no duplicate cooking CTA, no body ingredient checkboxes, and no checkmark-only Meal Plan communication.
- [ ] Run `npm run verify:changed -- --run` and fix scoped failures without altering unrelated Cook Mode work.
- [ ] Run focused Supabase Deno tests and migration checks available in the local environment.
- [ ] Open the owned iPhone 17 Pro Simulator runtime, verify Metro checkout/port provenance, exercise the real one-Meal and finalized-plan paths, and capture screenshots for normal, menu-open, and Already-have states.
- [ ] Compare render evidence with To-do Detail for inset, height, split anatomy, safe area, Dynamic Type, and VoiceOver labels; rerender after any correction.
