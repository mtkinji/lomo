# Shared Meal Cart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Meal Planning's organizer-run choice round with one household-private shared meal cart that eligible members can add to and positively react to, while the organizer alone settles meals for Groceries.

**Architecture:** Keep `kwilt_meal_plans` and `kwilt_meal_plan_candidates` as the plan aggregate and add only a candidate-reaction table plus narrow shared-cart RPCs. New clients read an actor-aware JSON projection and mutate through permanent-user `security definer` functions; legacy choice-round tables and APIs remain intact for released binaries. The existing Plan count and `BottomDrawer` become the collaborative surface, and settlement reuses the existing immutable finalization authority.

**Tech Stack:** PostgreSQL 17/Supabase RLS and RPC, TypeScript, React Native/Expo, Jest/React Native Testing Library, Supabase SQL rollback tests.

---

### Task 1: Lock the shared-cart domain and migration contract

**Files:**
- Create: `src/capabilities/meal-planning/domain/sharedMealCart.ts`
- Create: `src/capabilities/meal-planning/domain/sharedMealCart.test.ts`
- Create: `src/capabilities/meal-planning/domain/sharedMealCartMigration.test.ts`
- Modify: `src/capabilities/meal-planning/domain/mealPlanValidation.test.ts`
- Modify: `supabase/migrations/20260808034339_shared_meal_cart.sql`

- [ ] **Step 1: Write failing domain tests** for projection parsing, insertion-order preservation, `canWithdraw`/`canReact`/`canSettle`, implicit contributor support, and organizer selection that never derives from reaction count.
- [ ] **Step 2: Run the red tests:** `npx jest src/capabilities/meal-planning/domain/sharedMealCart.test.ts --runInBand`; expect missing-module failure.
- [ ] **Step 3: Implement `SharedMealCartProjection`, `SharedMealCartCandidate`, `parseSharedMealCartProjection`, and permission helpers** with strict runtime validation and no popularity sorting.
- [ ] **Step 4: Write the failing migration contract test** requiring `kwilt_meal_candidate_reactions`, RLS, explicit grants/revokes, permanent-user checks, empty `search_path`, actor-aware projection, add/withdraw/reaction RPCs, organizer-only settle, and no `realtime` schema DDL.
- [ ] **Step 5: Run the red contract test:** `npx jest src/capabilities/meal-planning/domain/sharedMealCartMigration.test.ts --runInBand`; expect missing SQL clauses.
- [ ] **Step 6: Implement the migration** with:
  - reaction uniqueness `(candidate_id, person_id)`;
  - helper eligibility for active adults and activated children;
  - `get_kwilt_shared_meal_cart(uuid)` resolving newest draft first, else latest finalized;
  - `add_kwilt_shared_meal_candidate(uuid,uuid,jsonb)` creating a draft under the active owner when needed, appending idempotently, and inserting contributor support;
  - `withdraw_kwilt_shared_meal_candidate(uuid)` allowing contributor or organizer only on a draft;
  - `set_kwilt_shared_meal_reaction(uuid,boolean)` controlling only the actor's reaction;
  - `settle_kwilt_shared_meal_cart(uuid,integer,uuid[],jsonb,text,text,text)` requiring organizer authority and explicit selections before delegating immutable finalization;
  - RLS enabled, direct writes revoked, explicit `authenticated` execute grants, and publication registration only through `supabase_realtime`.
- [ ] **Step 7: Run domain and contract tests:** `npx jest src/capabilities/meal-planning/domain/sharedMealCart.test.ts src/capabilities/meal-planning/domain/sharedMealCartMigration.test.ts src/capabilities/meal-planning/domain/mealPlanValidation.test.ts --runInBand`; expect PASS.

### Task 2: Add repository authority methods

**Files:**
- Modify: `src/capabilities/meal-planning/data/mealPlanningRepository.ts`
- Modify: `src/capabilities/meal-planning/data/mealPlanningRepository.test.ts`

- [ ] **Step 1: Write failing repository tests** asserting exact RPC names/arguments for `getSharedCart`, `addSharedCandidate`, `withdrawSharedCandidate`, `setSharedReaction`, and `settleSharedCart`, plus projection parsing.
- [ ] **Step 2: Run the red test:** `npx jest src/capabilities/meal-planning/data/mealPlanningRepository.test.ts --runInBand`; expect missing-method failures.
- [ ] **Step 3: Implement the repository methods** using the shared parser and keep legacy methods unchanged.
- [ ] **Step 4: Expand realtime invalidation** to plan, candidate, reaction, entry, and occasion tables without exposing row payloads as authority.
- [ ] **Step 5: Run the repository test:** `npx jest src/capabilities/meal-planning/data/mealPlanningRepository.test.ts --runInBand`; expect PASS.

### Task 3: Make recipe-card toggles append/withdraw through shared authority

**Files:**
- Modify: `src/capabilities/recipes/domain/mealPlanSelection.ts`
- Modify: `src/capabilities/recipes/domain/mealPlanSelection.test.ts`
- Modify: `src/capabilities/recipes/screens/RecipeLibraryScreen.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeHomeScreen.tsx`

- [ ] **Step 1: Rewrite failing selection tests** so first add and later adds call `addSharedCandidate`, while removal calls `withdrawSharedCandidate`; no whole-candidate-set replacement or automatic finalized-plan revision remains in the primary path.
- [ ] **Step 2: Run the red test:** `npx jest src/capabilities/recipes/domain/mealPlanSelection.test.ts --runInBand`; expect RPC-shape failures.
- [ ] **Step 3: Implement append/withdraw selection helpers** accepting the household id and current shared-cart projection.
- [ ] **Step 4: Update Recipe Library and Meals Home loading** to use `getSharedCart`, keep the top-right count truthful, and reload after every mutation.
- [ ] **Step 5: Run focused tests:** `npx jest src/capabilities/recipes/domain/mealPlanSelection.test.ts src/capabilities/recipes/screens/RecipeLibraryScreen.test.tsx --runInBand`; expect PASS.

### Task 4: Turn the Plan drawer into the shared cart and settlement surface

**Files:**
- Modify: `src/capabilities/recipes/screens/RecipeLibraryDrawers.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeLibraryScreen.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeLibraryScreen.test.tsx`

- [ ] **Step 1: Write failing drawer tests** for contributor labels, named support, reversible `Sounds good`, permission-specific withdraw/remove, organizer-only `Choose next meals`, zero-selection disabled state, and `Use these meals` settlement.
- [ ] **Step 2: Run the red UI test:** `npx jest src/capabilities/recipes/screens/RecipeLibraryScreen.test.tsx --runInBand`; expect missing labels/actions.
- [ ] **Step 3: Expand `MealPlanTrayItem`** with contributor and reaction projections and add feature-local accessible row controls using existing tokens, `RecipeArtwork`, `ProfileAvatar`/`OverlappingAvatarStack`, `Button`, and `BottomDrawer`.
- [ ] **Step 4: Implement local organizer settlement state** in the drawer; start with no preselected meals, preserve insertion order, and send explicit candidate ids to `settleSharedCart` with ordinary diner/serving defaults.
- [ ] **Step 5: Remove the primary `Ask the family` handoff** while preserving legacy routes for historical links.
- [ ] **Step 6: Run focused UI and navigation tests:** `npx jest src/capabilities/recipes/screens/RecipeLibraryScreen.test.tsx src/capabilities/meal-planning/screens/NextMealsScreen.test.tsx --runInBand`; expect PASS.

### Task 5: Prove SQL authority locally

**Files:**
- Create: `supabase/tests/shared_meal_cart.sql`
- Modify: `supabase/tests/meals_household_fit.sql` only if shared finalization changes its expectations.

- [ ] **Step 1: Write rollback-only SQL tests** covering owner/caregiver/activated-child eligibility, deactivated child denial, anonymous denial, cross-household denial, idempotent append, insertion order, implicit support, actor-only reaction removal, contributor withdrawal, organizer removal, organizer-only settlement, and unselected-candidate preservation.
- [ ] **Step 2: Start/reset a local Supabase database using the repository's existing test workflow** and run `supabase test db supabase/tests/shared_meal_cart.sql`; expect the new assertions to fail before migration completion and pass afterward.
- [ ] **Step 3: Run security-oriented static checks:** confirm no grant to `anon`, no direct DML grant to `authenticated`, no authorization via JWT user metadata, and no DDL in the `realtime` schema.

### Task 6: Verify the app diff

**Files:**
- Modify only files identified by failed verification.

- [ ] **Step 1: Run focused Jest suites:** `npx jest src/capabilities/meal-planning src/capabilities/recipes/domain/mealPlanSelection.test.ts src/capabilities/recipes/screens/RecipeLibraryScreen.test.tsx --runInBand`; expect PASS.
- [ ] **Step 2: Run test typecheck:** `npm run lint:tests`; expect PASS.
- [ ] **Step 3: Run product and architecture lint:** `npm run product:lint && npm run architecture:lint`; expect PASS apart from documented pre-existing warnings.
- [ ] **Step 4: Run the repository completion gate:** `npm run verify:changed -- --run`; expect every derived automated gate to pass and manual native follow-ups to be listed separately.

### Task 7: Deploy additive migrations to production Supabase

**Files:**
- Read: `supabase/migrations/20260808034329_support_recipe_scoped_grocery_lists.sql`
- Deploy in order: `20260808034329_support_recipe_scoped_grocery_lists.sql`, then `20260808034339_shared_meal_cart.sql` if both remain absent remotely.

- [ ] **Step 1: Re-list local and production migration histories** and verify checksums/content for every common version; stop on divergence.
- [ ] **Step 2: Run pre-deploy production probes** for project `sqxwjtorodqjdfnuvprf`: current advisors, active-plan multiplicity, ownership uniqueness, and dependent function signatures.
- [ ] **Step 3: Apply only missing migrations in timestamp order** through Supabase migration authority; do not repair or rewrite history.
- [ ] **Step 4: Re-list migrations and schema objects** and verify the exact reaction table, indexes, RLS flags, policies, grants, function ownership, `proconfig` search paths, and publication membership.
- [ ] **Step 5: Run production authority probes in a rollback transaction** for anonymous, eligible, ineligible, cross-household, reaction, withdrawal, and organizer settlement behavior without retaining synthetic household data.
- [ ] **Step 6: Re-run security and performance advisors** and classify every new warning; no unresolved security regression may ship.

### Task 8: Verify the native journey and hand off proof

**Files:**
- Modify only files required by a reproduced native defect.

- [ ] **Step 1: Identify runtime ownership** with `lsof -nP -iTCP:8081 -sTCP:LISTEN`, current branch/commit/dirty state, installed app binary provenance, and Metro working directory before launch.
- [ ] **Step 2: Verify on iPhone 17 Pro Simulator**: add from a meal card, count increments, drawer relaunch recovery, provenance/support display, reaction reversal, organizer zero-selection state, settlement, and Grocery continuation.
- [ ] **Step 3: Repeat at the smallest supported iPhone viewport and accessibility text size**; record layout or truncation issues.
- [ ] **Step 4: Report proof boundaries separately** for source/tests, local SQL, production schema/authority, Simulator, two-account physical device, VoiceOver, Android, signed build, and TestFlight.

## Inline execution note

This repository requires an ordinary branch in the current checkout unless Andrew explicitly approves a parallel worktree, and no subagent delegation was requested. Execute this plan inline on `feature/meal-planning-jobs`, keeping exact-path staging and checkpoints visible.
