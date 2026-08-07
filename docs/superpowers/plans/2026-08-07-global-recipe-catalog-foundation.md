# Global Recipe Catalog Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Do not use subagents or create another worktree unless Andrew explicitly approves parallel execution.

**Goal:** Move all 500 Kwilt-authored starter meals from the application bundle into a system-owned, immutable Supabase catalog that every permanent Kwilt user can read.

**Architecture:** Private Recipes remain person-owned and RLS-isolated. Catalog Recipes use the same immutable Recipe/RecipeVersion content model but become readable only through an authenticated `kwilt_recipe_catalog_projection` view backed by explicit `RecipePublication` rows. Stable `roster_id` values preserve existing `kwilt-recipe-*` links while UUIDs become canonical database identity. The app caches the remote projection for offline use; the bundled catalog is retained only during a migration window and is not the steady-state source.

**Tech Stack:** Supabase Postgres/RLS/RPC/Storage, TypeScript, React Native, Zustand, AsyncStorage, Jest, pgTAP.

---

## Task 1: Add the catalog publication schema

- [ ] Create a migration with `npx supabase migration new global_recipe_catalog_foundation`.
- [ ] Add `kwilt_recipe_publications` with unique `roster_id` and `public_slug`, exact `published_recipe_version_id`, publication state, distribution scopes, rights/attribution snapshots, sort metadata, and timestamps.
- [ ] Add `kwilt_recipe_publication_media` so a publication pins an approved media asset and crop role without changing the RecipeVersion.
- [ ] Extend `kwilt_can_read_recipe` so authenticated permanent users may read only active Recipes whose exact version is actively published to `kwilt_mobile`; do not expose drafts or system-owner private rows.
- [ ] Add a stable catalog projection RPC/view returning Recipe, pinned version, ingredients, instructions, approved media, and editorial facets in one bounded payload.
- [ ] Add indexes for `(state, published_at, roster_id)`, publication version lookup, media lookup, and search/sort facets.
- [ ] Revoke direct mutation from `anon` and `authenticated`; reserve catalog import/publish mutations for the service role.

## Task 2: Prove the authorization boundary

- [ ] Add `supabase/tests/global_recipe_catalog_foundation.sql` covering permanent-user access, anonymous denial, draft/withdrawn denial, unrelated private Recipe denial, exact version pinning, and replacement publication behavior.
- [ ] Prove an authenticated user cannot insert, update, or delete catalog Recipes, versions, publications, or media.
- [ ] Prove publication access does not grant access to the system owner's other private Recipes.
- [ ] Run `supabase db reset` and the repository's Supabase test command; preserve failures as the next implementation gate.

## Task 3: Build an idempotent 500-recipe importer

- [ ] Create `scripts/recipes/exportStarterCatalog.ts` and a test that converts `STARTER_EDITORIAL_RECIPE_CATALOG` into canonical UUID-backed Recipe, RecipeVersion, ingredient, instruction, provenance, credit, publication, and facet records.
- [ ] Derive deterministic UUIDs from `roster_id` or resolve them from an import manifest; never allocate a different identity on rerun.
- [ ] Reject anything other than exactly 500 unique roster IDs, titles, recipe IDs, version IDs, and content hashes.
- [ ] Require `rights_basis = 'kwilt_authored'`, `method = 'catalog'`, complete ingredients/instructions, and no `bundle://` reference in published media.
- [ ] Create `scripts/recipes/importCatalog.ts` using service-role credentials, bounded batches, transactions/RPCs, dry-run by default, and an explicit `--apply` flag.
- [ ] Emit a machine-readable receipt with inserted, unchanged, updated-publication, rejected, and failed counts; never log credentials.

## Task 4: Read the catalog from Supabase

- [ ] Add a `CatalogRecipeProjection` parser in `src/capabilities/recipes/data/catalogRecipeContracts.ts` with tests for exact version/media/facet relationships.
- [ ] Add `src/capabilities/recipes/data/recipeCatalogRepository.ts` and tests for projection mapping, paging, stable ordering, and network errors.
- [ ] Add a catalog-specific AsyncStorage cache keyed by schema version, not user identity, so all signed-in users can reuse the same public data safely.
- [ ] Extend `useRecipeStore` or add `useRecipeCatalogStore` so personal and catalog refresh independently; a personal-recipe failure must not erase cached catalog meals and vice versa.
- [ ] Replace `buildRecipeLibraryInventory(personalRecipes)` call sites with a merger accepting remote catalog projections and preserving personal Recipes first.

## Task 5: Preserve legacy links during migration

- [ ] Add a pure resolver test proving old `kwilt-recipe-<roster>` refs resolve to canonical UUID publications after catalog refresh.
- [ ] Update `resolveAvailableRecipe`, Meal Plan candidate snapshots, favorites, hides, Cooking sessions, and Grocery source resolution to accept the publication's `roster_id` alias and store the UUID/publication ID going forward.
- [ ] Keep bundled recipes behind a development-only or migration fallback until the production DB has exactly 500 active publications and the app has shipped the remote reader.
- [ ] Remove the fallback in a later release only after telemetry shows no unresolved legacy refs.

## Task 6: Load and verify the hidden production slice

- [ ] Apply the schema migration to the linked Supabase project only after local reset and authorization tests pass.
- [ ] Dry-run the import against production, review the 500-row receipt, then apply it in a production-hidden state.
- [ ] Query exact counts for active Recipes, pinned versions, ingredients, instructions, provenance, publications, and missing media.
- [ ] Enable `kwilt_mobile` for an internal cohort and prove catalog list/open/search/plan/cook/grocery flows from one installed app binary.
- [ ] Run `npm run verify:changed -- --run`; record Simulator proof separately from signed-device/TestFlight proof.
