import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { parseReviewedRecipeData } from './recipeValidation';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260806010000_private_recipes.sql',
);
const digestRepairMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260807043600_fix_private_recipe_digest_schema.sql',
);

describe('private Recipe persistence contract', () => {
  it('rejects unknown reviewed fields instead of silently persisting model output', () => {
    expect(() => parseReviewedRecipeData({ title: 'Soup', inventedAuthor: 'Ada' })).toThrow(
      'reviewedRecipe.inventedAuthor is not supported',
    );
  });

  it('accepts a small manually reviewed recipe while preserving literal lines', () => {
    expect(parseReviewedRecipeData({
      title: 'Tomato toast',
      description: null,
      yieldQuantity: 2,
      yieldUnit: 'servings',
      prepMinutes: 5,
      cookMinutes: null,
      notes: null,
      ingredients: [{
        id: 'ingredient-1',
        groupLabel: null,
        originalText: '2 ripe tomatoes',
        quantityMin: 2,
        quantityMax: null,
        unit: null,
        ingredientConcept: 'tomato',
        preparation: 'ripe',
        optional: false,
        parseConfidence: 1,
      }],
      instructions: [{ id: 'step-1', sectionLabel: null, text: 'Toast the bread.' }],
      provenance: {
        method: 'manual',
        sourceUrl: null,
        sourceTitle: null,
        sourceAuthor: null,
        sourceContentHash: null,
        rightsBasis: 'user_authored',
      },
      credits: [],
      lineage: [],
    })).toMatchObject({ title: 'Tomato toast', ingredients: [{ originalText: '2 ripe tomatoes' }] });
  });

  it('defines private aggregates, immutable versions, explicit grants, and reviewed RPCs', () => {
    const sql = readFileSync(migrationPath, 'utf8').toLowerCase();
    for (const table of [
      'kwilt_recipes',
      'kwilt_recipe_versions',
      'kwilt_recipe_ingredients',
      'kwilt_recipe_instructions',
      'kwilt_recipe_provenance',
      'kwilt_recipe_credits',
      'kwilt_recipe_lineage',
      'kwilt_recipe_access_grants',
      'kwilt_recipe_media_assets',
      'kwilt_recipe_import_drafts',
    ]) {
      expect(sql).toContain(`create table public.${table}`);
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
    expect(sql).toContain('unique (recipe_id, version)');
    expect(sql).toContain('create or replace function public.save_kwilt_recipe');
    expect(sql).toContain('create or replace function public.approve_kwilt_recipe_import');
    expect(sql).toContain('create or replace function public.delete_kwilt_recipe');
    expect(sql).toContain('stale_recipe_version');
    expect(sql).toContain('insert into public.kwilt_recipe_credits');
    expect(sql).toContain('insert into public.kwilt_recipe_lineage');
    expect(sql).toContain('household membership never grants recipe access');
    expect(sql).toContain('revoke insert, update, delete');
    expect(sql).not.toMatch(/\bvisibility\b/);
  });

  it('schema-qualifies the pgcrypto digest used by the security-definer save RPC', () => {
    const sql = readFileSync(migrationPath, 'utf8').toLowerCase();
    const repairSql = readFileSync(digestRepairMigrationPath, 'utf8').toLowerCase();

    expect(sql).toContain("extensions.digest(p_reviewed_data::text, 'sha256')");
    expect(sql).not.toContain("encode(digest(p_reviewed_data::text, 'sha256'), 'hex')");
    expect(repairSql).toContain('alter function public.save_kwilt_recipe(uuid, integer, text, jsonb)');
    expect(repairSql).toContain('set search_path = pg_catalog, extensions');
  });
});
