# Canonical Recipe Inventory Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Do not use subagents or create another worktree unless Andrew explicitly approves parallel execution.

**Goal:** Make the 500 published Kwilt catalog records usable without allowing them to enter person-owned Recipe inventory or duplicate the bundled fallback.

**Architecture:** Add an explicit `ownership_kind` discriminator to `kwilt_recipes`. Direct RLS projections remain limited to `personal` Recipes, while bounded catalog RPCs continue to read `catalog` Recipes. The current application merger also rejects canonical catalog projections arriving through the personal path, providing a regression guard while the hosted-catalog transition completes.

**Tech Stack:** Supabase Postgres/RLS/RPC, TypeScript, React Native, Jest, SQL rollback tests.

---

### Task 1: Add the application regression guard

**Files:**

- Modify: `src/capabilities/recipes/data/starterRecipeCatalog.test.ts`
- Modify: `src/capabilities/recipes/data/starterRecipeCatalog.ts`

- [ ] **Step 1: Write the failing inventory test**

Add a projection with a random database UUID, `provenance.method = "catalog"`, and `rightsBasis = "kwilt_authored"`. Assert that `buildRecipeLibraryInventory([personal, importedCatalog])` returns the personal Recipe followed by exactly 500 bundled Recipes and excludes the imported catalog UUID.

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```bash
npm test -- --runInBand src/capabilities/recipes/data/starterRecipeCatalog.test.ts
```

Expected: FAIL because the inventory length is 502 and the database catalog UUID remains present.

- [ ] **Step 3: Implement the minimal guard**

Add and use this predicate before personal inventory is concatenated:

```ts
export function isCanonicalCatalogProjection(projection: RecipeProjection): boolean {
  return projection.recipe.provenance.method === "catalog"
    && projection.recipe.provenance.rightsBasis === "kwilt_authored";
}
```

Keep ordinary personal copies/adaptations because their authority is expressed through private ownership and lineage rather than canonical catalog provenance.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run the same Jest command. Expected: PASS.

### Task 2: Separate catalog ownership from personal Recipe RLS

**Files:**

- Create: next CLI-generated file under `supabase/migrations/` named `separate_catalog_recipe_ownership`
- Modify: `supabase/tests/global_recipe_catalog_foundation.sql`
- Modify: `supabase/tests/private_recipes.sql` only if its fixtures require an explicit ownership assertion

- [ ] **Step 1: Write the failing SQL assertions**

In `global_recipe_catalog_foundation.sql`, authenticate as the catalog owner and assert:

```sql
if (select count(*) from public.kwilt_recipes) <> 1 then
  raise exception 'published catalog recipe entered personal inventory';
end if;
if not exists(select 1 from public.list_kwilt_recipe_catalog(null, 500)) then
  raise exception 'catalog publication was not usable through the bounded projection';
end if;
```

The one directly readable row is the fixture's unpublished personal Recipe.

- [ ] **Step 2: Run the database test and confirm RED**

Run:

```bash
npx supabase db reset
npx supabase test db supabase/tests/global_recipe_catalog_foundation.sql
```

Expected: FAIL because the catalog owner's direct Recipe query returns both its published catalog Recipe and personal Recipe. If local Docker is unavailable, record the SQL test as unexecuted rather than treating source inspection as runtime proof.

- [ ] **Step 3: Generate the migration**

Run:

```bash
npx supabase migration new separate_catalog_recipe_ownership
```

Use the generated timestamp; do not reuse or reorder the existing `20260813020931` migration.

- [ ] **Step 4: Add explicit ownership and backfill**

The migration must:

```sql
alter table public.kwilt_recipes
  add column ownership_kind text not null default 'personal'
  check (ownership_kind in ('personal', 'catalog'));

update public.kwilt_recipes recipe
set ownership_kind = 'catalog'
where exists (
  select 1 from public.kwilt_recipe_publications publication
  where publication.recipe_id = recipe.id
);
```

Update catalog import so newly created rows specify `ownership_kind = 'catalog'`. Keep personal creation RPCs explicit or defaulted to `personal`.

- [ ] **Step 5: Tighten every direct Recipe RLS policy**

Replace Recipe, version, ingredient, instruction, provenance, credit, lineage, and media read policies so a direct authenticated projection requires the owning Recipe's `ownership_kind = 'personal'` in addition to existing owner/grant checks. Do not broaden direct RLS to catalog content; `list_kwilt_recipe_catalog` remains the catalog read boundary.

- [ ] **Step 6: Preserve catalog use in capability-owned RPCs**

Add a helper that returns true when the caller can use either a readable personal Recipe or an active `kwilt_mobile` publication. Use it in Cook-session and recipe-scoped Grocery validation. Direct table RLS must not call this broader helper.

- [ ] **Step 7: Run SQL tests and confirm GREEN**

Run:

```bash
npx supabase db reset
npx supabase test db
```

Expected: PASS for owner/private isolation, unrelated-user denial, bounded catalog projection, catalog Cook use, and catalog Grocery use.

### Task 3: Prove the intended inventory arithmetic

**Files:**

- Modify: `src/capabilities/recipes/data/starterRecipeCatalog.test.ts`
- Modify: `docs/feature-briefs/global-recipe-catalog.md`

- [ ] **Step 1: Add explicit inventory cases**

Prove:

```ts
expect(buildRecipeLibraryInventory([])).toHaveLength(500);
expect(buildRecipeLibraryInventory([personal])).toHaveLength(501);
expect(buildRecipeLibraryInventory([personal, importedCatalog])).toHaveLength(501);
```

- [ ] **Step 2: Update the proof boundary in the accepted brief**

Replace the stale production-count statement with the observed pre-repair state: 500 published catalog records, one real personal Recipe, and 500 catalog records incorrectly visible through personal ownership. State that Stage 1 repairs visibility without deleting publication/image-pipeline records.

- [ ] **Step 3: Run focused verification**

Run:

```bash
npm test -- --runInBand src/capabilities/recipes/data/starterRecipeCatalog.test.ts src/capabilities/recipes/data/starterEditorialRecipeCatalog.test.ts
npm run jtbd:lint
npm run verify:changed -- --run
```

Expected: all automated gates selected for the Recipe, migration, test, and feature-brief diff pass. Simulator or signed-device proof remains a separate gate.

### Task 4: Apply and verify production only after local proof

**Files:** none beyond the verified migration and evidence receipt.

- [ ] Query pre-apply counts grouped by `ownership_kind`, publication state, and direct personal visibility.
- [ ] Apply the migration to the Kwilt Supabase project.
- [ ] Query post-apply counts: 500 catalog-owned published Recipes, one personal Recipe, zero catalog Recipes reachable through the personal projection.
- [ ] Refresh the installed app and verify a fresh account sees 500 while the current account sees 501.
- [ ] Record source, local-SQL, live-database, Simulator, and signed-device proof separately.
