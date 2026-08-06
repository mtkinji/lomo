# Household Food Phase 1: Private Recipe Box Implementation Plan

## Implementation checkpoint — August 5, 2026

Source and automated tests are complete for private versioned Recipes, manual
capture, URL/paste/dictation/photo import drafts, evidence review, clean cooking,
scaling, export, offline cache, and Share intake. Supabase Local migration/RLS
execution and signed native import/camera/cooking QA remain required before this
phase can be called runtime-proven.

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Do not use subagents or create another worktree unless Andrew explicitly approves parallel execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-in user move from a photograph, URL, dictation, pasted text, or manual entry to a corrected, durable, ad-free private Recipe with evidence, provenance, credits, immutable version history, clean cooking, export, and complete deletion.

**Architecture:** Implement the private subset of the preflight Recipe aggregate: stable person-owned identity, immutable content versions, structured ingredient and instruction rows, provenance, credits, lineage, explicit grants, media rights, and temporary evidence-backed import drafts. Keep a user-keyed local read cache for offline cooking. URL and media extraction run through hardened server boundaries and can only create a draft; one reviewed, idempotent Recipes mutation creates or updates canonical content. Public publication remains a separate later aggregate and never emerges from a private visibility flag.

**Tech Stack:** React Native, Supabase Postgres/RLS/Storage/Edge Functions, AsyncStorage, Deno DOM parsing, schema.org Recipe JSON-LD, Jest/RNTL, and Expo keep-awake.

---

## Scope and file map

Create:

- `supabase/migrations/20260806010000_private_recipes.sql`
- `supabase/tests/private_recipes.sql`
- `src/capabilities/recipes/domain/recipeContracts.ts`
- `src/capabilities/recipes/domain/recipeImportContracts.ts`
- `src/capabilities/recipes/domain/recipePublicationContracts.ts`
- `src/capabilities/recipes/domain/recipeValidation.ts` and test
- `src/capabilities/recipes/domain/recipeScaling.ts` and test
- `src/capabilities/recipes/data/recipeRepository.ts` and test
- `src/capabilities/recipes/data/recipeCache.ts` and test
- `src/capabilities/recipes/runtime/useRecipeStore.ts` and test
- `src/capabilities/recipes/screens/RecipeLibraryScreen.tsx` and test
- `src/capabilities/recipes/screens/RecipeEditScreen.tsx` and test
- `src/capabilities/recipes/screens/RecipeImportReviewScreen.tsx` and test
- `src/capabilities/recipes/screens/RecipeCookingScreen.tsx` and test
- `src/capabilities/recipes/components/IngredientLineEditor.tsx`
- `src/capabilities/recipes/components/InstructionSectionEditor.tsx`
- `src/capabilities/recipes/recipeExport.ts` and test
- `supabase/functions/_shared/recipeImport.ts` and Deno test
- `supabase/functions/recipe-import/index.ts`
- `supabase/functions/recipe-import/config.toml`
- `src/capabilities/food-ai/recipeImportProposalExecutor.ts` and test

Modify:

- `src/navigation/RootNavigator.tsx`, `src/navigation/linkingConfig.ts`, and tests.
- `src/capabilities/registry.ts` — Food now opens Recipes.
- `src/store/useShareIntentStore.ts` — route shared recipe URLs into review.
- `src/services/analytics/events.ts` — privacy-safe Recipe lifecycle events.
- `src/capabilities/recipes/FEATURE.md` and `docs/feature-briefs/household-food-loop.md`.
- `packages/kwilt-agent-runtime/src/kwiltCapabilityManifest.ts` — advance only
  implemented Recipe operations from pending to proven coverage.

## Closed domain contract

The full contract is
[`object-models.md`](../../design-explorations/meals-recipes-groceries/object-models.md)
and is proven by the preflight plan. This phase implements:

- `Recipe` as stable private identity with one administrative person owner;
- immutable `RecipeVersion` content;
- ordered `RecipeIngredientLine` and `RecipeInstructionStep` rows, preserving
  literal source text;
- distinct `RecipeProvenance`, `RecipeCredit`, and `RecipeLineage` records;
- explicit `RecipeAccessGrant` roles without household-implied access;
- `RecipeMediaAsset` rights and retention state; and
- temporary `RecipeImportDraft` evidence, confidence, warning, expiry, and
  idempotent approval state.

`PublicCreatorProfile` and `RecipePublication` contracts are already locked but
their persistence and UI remain Phase 5 scope. No Phase 1 column named
`visibility` or `public` may substitute for them.

### Task 1: Add owner-scoped Recipe identity and immutable versions

**Files:** migration, pgTAP file, `recipeTypes.ts`, `recipeValidation.test.ts`

- [ ] **Step 1: Write migration contract and pgTAP tests**

Require `kwilt_recipes(id, owner_person_id, current_version_id, lifecycle,
deleted_at)`, `kwilt_recipe_versions(id, recipe_id, version, content_hash,
created_by_person_id, created_at)`, ordered ingredient/instruction rows, and the
private provenance, credit, lineage, grant, media, and import-draft tables
listed above. Use unique `(recipe_id, version)` and immutable foreign keys.
Prove owner reads, explicit-grantee reads by role, household-member denial,
unrelated and anonymous denial, no direct client version insert, soft-delete
exclusion, immutable referenced versions, import-draft isolation, and RPC-only
save/delete/approve.

- [ ] **Step 2: Run the contract test and verify failure**

```bash
npx jest src/capabilities/recipes/domain/recipeValidation.test.ts --runInBand
supabase test db
```

- [ ] **Step 3: Implement the migration**

Add `save_kwilt_recipe(...)` as a security-definer transaction and a separate
`approve_kwilt_recipe_import(p_draft_id, p_idempotency_key, p_reviewed_data)`
transaction. Validate permanent auth, person ownership, expected version,
contract limits, draft state, evidence retention, and idempotency. Insert
version `1` on create or the next immutable version on update; return identity,
version, provenance, and mutation receipt. A model or Edge Function service
role cannot call either mutation on behalf of the user without the reviewed
capability operation.

Add `delete_kwilt_recipe(p_recipe_id uuid, p_expected_version integer)` that
sets `deleted_at` and increments no content version. Grant RPC execution to
authenticated users and revoke direct insert/update/delete on both tables.

- [ ] **Step 4: Run migration and RLS tests**

Expected: owner passes; wrong-owner, stale version, anonymous, and direct writes
fail with stable codes.

- [ ] **Step 5: Commit schema**

```bash
git add supabase/migrations/20260806010000_private_recipes.sql supabase/tests/private_recipes.sql src/capabilities/recipes/domain/recipeTypes.ts src/capabilities/recipes/domain/recipeValidation.ts src/capabilities/recipes/domain/recipeValidation.test.ts
git commit -m "feat: add private versioned recipes"
```

### Task 2: Build account-isolated repository, cache, and store

**Files:** `recipeRepository.ts`, `recipeRepository.test.ts`, `recipeCache.ts`, `recipeCache.test.ts`, `useRecipeStore.ts`, `useRecipeStore.test.ts`

- [ ] **Step 1: Write failing tests**

Cover cache keys containing user id, malformed-cache rejection, account switch
clearing in-memory data before loading, stale-while-refresh, optimistic save
rollback, stale-version recovery, and deletion.

```ts
expect(recipeCacheKey('user-a')).toBe('kwilt.recipes.v1.user-a');
useRecipeStore.getState().setIdentity('user-b');
expect(useRecipeStore.getState().recipes).toEqual([]);
```

- [ ] **Step 2: Run and verify failure**

```bash
npx jest src/capabilities/recipes/data src/capabilities/recipes/runtime --runInBand
```

- [ ] **Step 3: Implement repository and cache**

The repository selects Recipe identities joined to their current version,
parses through `validateRecipe`, and saves/deletes only through the RPCs. Cache
only validated Recipe projections; never cache import response bodies or auth
tokens. Store states are `idle | cached | refreshing | ready | error`.

- [ ] **Step 4: Run tests**

Expected: all account isolation and optimistic recovery tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/capabilities/recipes/data src/capabilities/recipes/runtime
git commit -m "feat: sync private recipes offline"
```

### Task 3: Implement deterministic serving scaling without corrupting text

**Files:** `recipeScaling.ts`, `recipeScaling.test.ts`

- [ ] **Step 1: Write table-driven tests**

Cover integers, decimals, vulgar/common fractions, ranges, `to taste`, count
packages, zero/negative rejection, original yield unknown, and round-trip back
to original servings.

```ts
expect(scaleRecipeQuantity({ quantity: 1.5, quantityMax: null, fromYield: 4, toYield: 6 }))
  .toEqual({ quantity: 2.25, quantityMax: null });
expect(scaleRecipeQuantity({ quantity: null, quantityMax: null, fromYield: 4, toYield: 6 }))
  .toEqual({ quantity: null, quantityMax: null });
```

- [ ] **Step 2: Run failing tests, implement pure scaling, rerun**

Never rewrite `displayText`. Cooking UI displays a formatted scaled quantity
beside the preserved line. Use rational arithmetic for parsed fractions and
format to a bounded kitchen fraction only for presentation.

- [ ] **Step 3: Commit**

```bash
git add src/capabilities/recipes/domain/recipeScaling.ts src/capabilities/recipes/domain/recipeScaling.test.ts
git commit -m "feat: scale recipe servings safely"
```

### Task 4: Build the shared review, manual capture, and edit foundation

**Files:** `RecipeLibraryScreen.tsx`, `RecipeEditScreen.tsx`, editor components, navigation files, component tests

- [ ] **Step 1: Write screen tests**

Cover empty state, create, edit, unsaved-change confirmation, save failure,
delete confirmation, provenance fields, immediate save with incomplete parsing,
keyboard scrolling, and offline cached opening.

- [ ] **Step 2: Run tests and verify failure**

```bash
npx jest src/capabilities/recipes/screens/RecipeLibraryScreen.test.tsx src/capabilities/recipes/screens/RecipeEditScreen.test.tsx --runInBand
```

- [ ] **Step 3: Implement reductive screens**

Library initially has search, recipe rows, and one Add action. The shared review
editor requires only title; servings, ingredients, instructions, provenance,
credits, story, and notes are progressive fields. Ingredient and instruction
rows use stable UUIDs and never use array index as identity. It supports source
evidence and field warnings before the import executors arrive. Food opens this
library.

- [ ] **Step 4: Run tests and signed Simulator keyboard/VoiceOver checks**

Expected: long ingredients/instructions remain reachable above the keyboard;
save is explicit; back warns only with actual edits.

- [ ] **Step 5: Commit**

```bash
git add src/capabilities/recipes/components src/capabilities/recipes/screens/RecipeLibraryScreen.tsx src/capabilities/recipes/screens/RecipeLibraryScreen.test.tsx src/capabilities/recipes/screens/RecipeEditScreen.tsx src/capabilities/recipes/screens/RecipeEditScreen.test.tsx src/navigation/RootNavigator.tsx src/capabilities/registry.ts
git commit -m "feat: create and edit family recipes"
```

### Task 5: Harden user-invoked URL import and require review

**Files:** `supabase/functions/_shared/recipeImport.ts`, its Deno test, `recipe-import/index.ts`, config, `RecipeImportReviewScreen.tsx`, test, `useShareIntentStore.ts`

- [ ] **Step 1: Write extraction and network-policy tests**

Fixtures cover Recipe JSON-LD object/array/`@graph`, string/array instructions,
malformed JSON, redirects, paywall/no Recipe, oversized HTML, non-HTML response,
loopback/private/link-local IPv4 and IPv6, credentialed URLs, and redirect to a
private host.

- [ ] **Step 2: Run Deno tests and verify failure**

```bash
deno test supabase/functions/_shared/__tests__/recipeImport_deno_test.ts
```

- [ ] **Step 3: Implement the import boundary**

Accept only `https:` URLs; resolve DNS before every fetch/redirect; reject
private, loopback, link-local, multicast, and metadata-service ranges; allow at
most three redirects; cap response at 2 MB and 8 seconds; require HTML; parse
schema.org Recipe JSON-LD before bounded model-assisted extraction; return a
`RecipeImportDraft` with source evidence, per-field confidence/warnings, and
source attribution. Treat embedded instructions as untrusted data. Do not
persist fetched HTML beyond processing or copy images without a valid rights
basis.

- [ ] **Step 4: Implement review UI and share-intent routing**

The review screen shows source evidence, parsed title, servings, ingredients,
instructions, credits, all warnings, and editable fields. It focuses attention
on uncertain or contradictory fields without hiding the rest. `Save recipe`
approves one idempotent proposal that creates a private Recipe with
`rightsBasis: 'private_user_import'`; cancel discards the draft. Incoming shared
URLs route here only after the user chooses Recipe import.

- [ ] **Step 5: Run server and mobile tests**

```bash
deno test supabase/functions/_shared/__tests__/recipeImport_deno_test.ts
npx jest src/capabilities/recipes/screens/RecipeImportReviewScreen.test.tsx src/store/useShareIntentStore.test.ts --runInBand
```

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/_shared/recipeImport.ts supabase/functions/_shared/__tests__/recipeImport_deno_test.ts supabase/functions/recipe-import src/capabilities/recipes/screens/RecipeImportReviewScreen.tsx src/capabilities/recipes/screens/RecipeImportReviewScreen.test.tsx src/store/useShareIntentStore.ts
git commit -m "feat: review structured recipe imports"
```

### Task 6: Add photo and voice capture as reviewable drafts

**Files:** `src/capabilities/recipes/capture/recipeMediaDraft.ts` and test,
`src/capabilities/recipes/screens/RecipeMediaCaptureScreen.tsx` and test,
`supabase/functions/_shared/recipeMediaExtraction.ts` and Deno test

- [ ] **Step 1: Write tests** for printed cookbook pages, a handwritten card,
  multi-image order, two columns, glare/shadow, marginal notes, low-confidence
  OCR, rotated image, voice transcript with ingredient and instruction
  sections, unsupported media, upload failure, cancellation, deletion, prompt
  injection, and model output that attempts to invent missing quantities,
  author, source, or rights.
- [ ] **Step 2: Implement private media processing.** Upload user-selected media
  to an owner-only temporary path, generate a structured draft, attach
  per-field confidence/warnings, and delete the temporary object after save,
  cancel, expiry, or account deletion. Model output never saves directly.
- [ ] **Step 3: Reuse `RecipeImportReviewScreen`** so photo and voice drafts have
  the same explicit correction and Save boundary as URL imports. Set provenance
  method to `photo` or `voice` and rights basis to `user_authored` only after the
  user confirms it is their supplied content.
- [ ] **Step 4: Run Deno/mobile tests, the safe repository evaluation corpus,
  and private real family-card/cookbook/voice dogfood outside Git.** Record
  transcription accuracy, hard hallucination failures, provenance retention,
  correction burden, time to clean save, latency, and cost.
- [ ] **Step 5: Commit.**

```bash
git add src/capabilities/recipes/capture src/capabilities/recipes/screens/RecipeMediaCaptureScreen.tsx src/capabilities/recipes/screens/RecipeMediaCaptureScreen.test.tsx supabase/functions/_shared/recipeMediaExtraction.ts supabase/functions/_shared/__tests__/recipeMediaExtraction_deno_test.ts
git commit -m "feat: capture family recipes from photo and voice"
```

### Task 7: Add clean cooking, export, and complete deletion

**Files:** `RecipeCookingScreen.tsx`, test, `recipeExport.ts`, test, repository/cache tests

- [ ] **Step 1: Write tests**

Cover serving adjustment, original reset, section navigation, keep-awake only
while visible, source attribution access, Markdown export, offline rendering,
and deletion removing cache plus server visibility.

- [ ] **Step 2: Implement**

Cooking view displays title, serving control, ingredients, and instructions
with large touch/read targets. It has no ads, discovery feed, nutrition score,
or forced timer UI. Export is deterministic Markdown with title, yield,
ingredients, instructions, notes, and provenance. Delete clears local cache
immediately and retries server deletion visibly if the request fails.

- [ ] **Step 3: Run tests and real-recipe visual QA**

Use at least one short recipe, one long family card, one recipe with grouped
ingredients, and one malformed import corrected by hand.

- [ ] **Step 4: Commit**

```bash
git add src/capabilities/recipes/screens/RecipeCookingScreen.tsx src/capabilities/recipes/screens/RecipeCookingScreen.test.tsx src/capabilities/recipes/recipeExport.ts src/capabilities/recipes/recipeExport.test.ts src/capabilities/recipes/data
git commit -m "feat: cook and export recipes ad free"
```

### Task 8: Phase completion gate

- [ ] Run the 50-URL corpus and record extraction success, warning, and manual
  correction rates without storing page bodies.
- [ ] Run the image/voice evaluation corpus and prove zero invented Recipe,
  source, author, and rights facts in the accepted set.
- [ ] Run `supabase test db`, Deno tests, and `npm run verify:changed -- --run`.
- [ ] Prove account-switch isolation, offline cooking, deletion, and keyboard
  behavior in the signed-in Simulator.
- [ ] Dogfood ten to twenty real recipes from photo, URL, voice, and manual
  capture before beginning discovery or sharing.
- [ ] Do not advance solely because import success is high; the household must
  actually return to saved Recipes for cooking.
- [ ] Do not call Release 1 complete if photo import is deferred. It is a base
  adoption criterion.
