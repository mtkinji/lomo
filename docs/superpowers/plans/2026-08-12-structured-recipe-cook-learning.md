# Structured Recipe Cook Learning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended when explicitly authorized) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn each completed Cook session into a durable private journal entry with an overall outcome rating, make-again signal, structured ingredient substitutions, and an accurate per-recipe cook count.

**Architecture:** Extend the existing exact-version `kwilt_recipe_cook_records` aggregate instead of introducing a second history system. Store one substitution row per source ingredient line and Cook record, snapshot the displayed ingredient text, and write the record plus substitutions transactionally through a capability-owned RPC. Keep public recipe ratings and community contributions out of this stage.

**Tech Stack:** React Native/Expo, TypeScript, Jest, Supabase Postgres, RLS, PL/pgSQL.

---

## Locked product and data rules

- `outcome_rating` is private evidence about one attempt, from 1 through 5. It is not a public recipe rating.
- A Cook record remains pinned to the exact `recipe_version_id` and completed session.
- A substitution identifies the source `kwilt_recipe_ingredients.id`, snapshots the original ingredient text, and records what was used instead.
- A Cook record may have at most one substitution row per source ingredient line. The replacement text can describe a blend when needed.
- Saving learning is idempotent: resaving the completion edits the same Cook record and replaces its substitution set in one transaction.
- Existing installed clients using `save_kwilt_recipe_cook_learning` remain supported. New clients use `save_kwilt_recipe_cook_journal`.
- Direct reads are owner-only through RLS. Writes remain RPC-only.
- Photos are the next Stage 2 slice after this structured journal proves sound; they do not block outcome/substitution history.
- Do not commit or stage unrelated dirty work. Do not create a commit unless Andrew requests it.

## Cook Complete UI contract

Job: When a cook is finished, the person needs to capture only the evidence worth carrying forward, so the next attempt starts from lived experience instead of memory.

Authority chain: accepted Recipe/Cook brief -> Kwilt tokens and local `Button`/`Typography` components -> iOS/Android accessibility conventions -> React Native Reusables anatomy reference.

Three-second read: **Dinner, done.** -> private outcome -> one **Done** action.

Primary action: **Done** saves the private Cook journal and returns to Recipe Home.

Primary information: overall result, substitutions actually made, and one next-time note.

Secondary information: make-again signal, per-substitution result, and optional recipe-edit proposal destination.

Reveal later: ingredient choices and substitution fields stay hidden until **Add a substitution**; note destination stays hidden until text exists.

Scan order: completion -> outcome -> changes -> next-time note -> Done.

Must not add: public sharing, community counts, canonical editing, required ratings, social feedback, or a second dominant action.

Reuse map: action -> local `Button`; copy -> local `Typography`; text entry -> native `TextInput` with persistent visible labels; grouping -> tokenized `View`/`ScrollView`.

Nearest precedent: the existing Recipe Cook Complete route; preserve its single-save exit and review-only edit proposal while extending private evidence.

External exemplar ledger: N/A.

Behavior sources: exact-version Cook contract, private-journal roadmap rule, existing Cook Complete navigation reset, and user-requested ratings/substitutions/learnings.

Unresolved decisions: none for the private journal slice; Cook photos remain the next independently gated slice.

Required states: default, ingredient chooser, one or more substitution rows, saving, validation error, missing Recipe projection, and persisted return to Recipe Home.

Proof path: Recipes -> Recipe Home -> Start cooking -> finish final cue -> Cook Complete -> save -> Recipe Home; verify on the current iOS runtime, then label signed-device proof separately.

### Task 1: Extend the domain contract regression-first

**Files:**
- Modify: `src/capabilities/recipes/domain/recipeCookContracts.ts`
- Modify: `src/capabilities/recipes/domain/recipeCookLearning.ts`
- Test: `src/capabilities/recipes/domain/recipeCookLearning.test.ts`

- [x] **Step 1: Write failing tests for private outcome ratings and substitutions**

Add assertions for this shape:

```ts
{
  outcomeRating: 4,
  substitutions: [{
    ingredientLineId: 'ingredient-1',
    ingredientText: '1 cup whole milk',
    usedInstead: 'oat milk',
    resultRating: 4,
    note: 'Needed a little less',
  }],
}
```

Also assert rejection of ratings outside `1...5`, blank replacement text, ingredient IDs not present in the exact version, duplicate ingredient IDs, and notes longer than 1,000 characters.

- [x] **Step 2: Run the focused domain test and observe RED**

Run: `npm test -- --runInBand src/capabilities/recipes/domain/recipeCookLearning.test.ts`

Expected: failures because the new input and output fields do not exist.

- [x] **Step 3: Add focused immutable types and validation**

Define:

```ts
export type RecipeCookSubstitution = {
  ingredientLineId: string;
  ingredientText: string;
  usedInstead: string;
  resultRating: number | null;
  note: string | null;
};
```

Extend `RecipeCookRecord` with `outcomeRating: number | null` and `substitutions: RecipeCookSubstitution[]`. Extend `buildRecipeCookLearning` input with the exact `RecipeVersion`, outcome rating, and substitution drafts; validate against `version.ingredients` and return normalized snapshots.

- [x] **Step 4: Run the domain test and observe GREEN**

Run: `npm test -- --runInBand src/capabilities/recipes/domain/recipeCookLearning.test.ts`

Expected: the focused suite passes.

### Task 2: Add the private journal schema and transactional RPC

**Files:**
- Create: a migration generated with `npx supabase migration new structured_recipe_cook_learning`
- Modify: `supabase/tests/global_recipe_catalog_foundation.sql`

- [x] **Step 1: Add failing pgTAP assertions**

Assert that an authenticated owner can save a rating and substitution for a completed Cook session, resave without creating a second record, retrieve only their own rows, and obtain the correct Cook count. Assert rejection for another person's session, a non-completed session, a rating outside `1...5`, a source ingredient outside the session's exact version, and duplicate source ingredient IDs.

- [x] **Step 2: Generate the migration file through the CLI**

Run: `npx supabase migration new structured_recipe_cook_learning`

Expected: one timestamped empty migration under `supabase/migrations/`.

- [x] **Step 3: Extend the record and create substitution storage**

Add `outcome_rating smallint check (outcome_rating between 1 and 5)` to `kwilt_recipe_cook_records`. Create `kwilt_recipe_cook_substitutions` with owner, record, exact recipe/version, source ingredient, snapshotted text, replacement, optional 1–5 result rating, optional 1,000-character note, timestamps, and `unique(cook_record_id, source_ingredient_line_id)`.

Enable RLS, add owner-select policy using `kwilt_current_person_id()`, grant only `select` to `authenticated`, and revoke direct mutation from `public`, `anon`, and `authenticated`.

- [x] **Step 4: Add the new RPC without breaking installed clients**

Create:

```sql
save_kwilt_recipe_cook_journal(
  p_session_id uuid,
  p_would_make_again boolean,
  p_outcome_rating integer,
  p_private_note text,
  p_recipe_edit_proposal jsonb,
  p_substitutions jsonb
) returns jsonb
```

The function must require a permanent user, lock and authorize the completed session, validate every substitution against an ingredient belonging to `v_session.recipe_version_id`, upsert one Cook record, replace its substitution rows, and return `recordId`, `sessionId`, `recipeVersionId`, `cookCount`, and `substitutionCount`. Revoke default/public execution and grant only `authenticated`.

- [x] **Step 5: Rehearse transactionally before applying**

Use a production transaction that creates only isolated probe rows, invokes the RPC, asserts results/RLS, and rolls back. Do not persist probe data.

- [x] **Step 6: Run security advisors and apply the migration**

Resolve every newly introduced advisor finding, apply the final migration once, then query live schema/counts to prove the migration is present without touching historical Cook data.

### Task 3: Map and retrieve bounded Cook history

**Files:**
- Modify: `src/capabilities/recipes/data/recipeCookRepository.ts`
- Test: `src/capabilities/recipes/data/recipeCookRepository.test.ts`

- [x] **Step 1: Write failing repository tests**

Assert that `saveLearning` sends `p_outcome_rating` and normalized `p_substitutions`, and that `historyForRecipe(recipeId, limit)` returns:

```ts
{
  cookCount: 3,
  records: [{ outcomeRating: 4, substitutions: [...] }],
}
```

Limit history to `1...20`, order newest-first, and never request canonical Recipe text beyond the snapshotted ingredient text.

- [x] **Step 2: Run the repository test and observe RED**

Run: `npm test -- --runInBand src/capabilities/recipes/data/recipeCookRepository.test.ts`

- [x] **Step 3: Implement the new RPC call and history mapping**

Use the new RPC for writes. Query owner-RLS-protected Cook records with nested `kwilt_recipe_cook_substitutions`, request an exact count, and map snake_case database rows to immutable camelCase projections.

- [x] **Step 4: Run the repository test and observe GREEN**

Run: `npm test -- --runInBand src/capabilities/recipes/data/recipeCookRepository.test.ts`

### Task 4: Capture the structured journal at Cook completion

**Files:**
- Modify: `src/capabilities/recipes/screens/RecipeCookCompleteScreen.tsx`
- Create: `src/capabilities/recipes/screens/RecipeCookCompleteScreen.test.tsx`

- [x] **Step 1: Add a component test for the completion flow**

Prove the screen can select a private 1–5 outcome, add a substitution from the exact recipe's ingredient list, enter replacement/result/note, save, and preserve the existing optional private note and review-only recipe-edit proposal behavior.

- [x] **Step 2: Add the minimal calm UI**

Show three progressive sections: **How did it turn out?**, **What changed?**, and **Remember for next time**. Keep substitution rows collapsed until **Add a substitution** is chosen. Do not present public-sharing language.

- [x] **Step 3: Run completion-screen and domain tests**

Run: `npm test -- --runInBand src/capabilities/recipes/screens/RecipeCookCompleteScreen.test.tsx src/capabilities/recipes/domain/recipeCookLearning.test.ts`

Expected: both suites pass.

### Task 5: Surface count and last-cook evidence on Recipe Home

**Files:**
- Modify: `src/capabilities/recipes/screens/RecipeHomeScreen.tsx`
- Test: `src/capabilities/recipes/screens/RecipeHomeScreen.test.tsx`

- [x] **Step 1: Write a failing Recipe Home test**

Pass three Cook records and assert the screen says **Cooked 3 times**, shows the latest private outcome, and renders **Last time you used oat milk instead of 1 cup whole milk** with its result rating/note.

- [x] **Step 2: Replace latest-only loading with bounded history**

Load `historyForRecipe(recipeId, 6)` on focus so returning from Cook Complete refreshes the evidence. Keep the full history owner-only and show only the latest relevant entry inline.

- [x] **Step 3: Run Recipe Home tests**

Run: `npm test -- --runInBand src/capabilities/recipes/screens/RecipeHomeScreen.test.tsx`

Expected: existing Recipe Home behavior and new Cook evidence both pass.

### Task 6: Documentation and completion verification

**Files:**
- Modify: `docs/feature-briefs/global-recipe-catalog.md`
- Modify: `docs/superpowers/plans/2026-08-12-living-recipe-cookbook-roadmap.md`

- [x] **Step 1: Clarify private versus public learning authority**

Document the Cook journal as private owner evidence. Keep public ratings and moderated Cooking notes as later, explicit publication systems.

- [x] **Step 2: Run focused verification**

Run all Recipe Cook domain, repository, Cook Complete, Recipe Home, and SQL contract tests that are locally available.

- [ ] **Step 3: Run the repository completion ritual**

Run: `npm run verify:changed -- --run`

Expected: diff check, type checks, relevant/full Jest, product lint, and architecture lint pass. Report local database limitations separately if Docker remains unavailable.

Ran on 2026-08-12. Recipe-focused verification passed (5 suites, 30 tests), as did app/test typechecks, product lint, architecture lint, and diff checking. The full Jest pass is currently blocked by two unrelated dirty Focus tests (`useActiveFocusOrientation.test.tsx` and `soundscapePlayback.test.ts`), so this step remains open rather than overstating repository-wide proof.

- [ ] **Step 4: Verify on the authenticated device**

Complete the same recipe at least twice with different substitutions and confirm the count, exact last substitution, rating, and note survive navigation/relaunch. Keep source/test, Simulator, signed-device, and production proof distinct.
