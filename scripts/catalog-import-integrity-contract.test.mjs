import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sql = readFileSync(new URL('../supabase/migrations/20261016141556_reject_incomplete_catalog_ingredient_imports.sql', import.meta.url), 'utf8');
const previous = readFileSync(new URL('../supabase/migrations/20260825154258_publish_scaling_as_immutable_recipe_version.sql', import.meta.url), 'utf8');

test('missing or null ingredient arrays cannot bypass the importer guard', () => {
  const guard = sql.slice(sql.indexOf('begin'), sql.indexOf('if not exists'));
  for (const field of ['ingredients', 'structuredIngredients', 'instructions']) {
    assert.ok(guard.includes(`jsonb_typeof(p_source->'${field}') is distinct from 'array'`));
  }
  assert.match(guard, /raise exception 'invalid_recipe_catalog_source'/);
  assert.doesNotMatch(guard, /jsonb_array_length/);
});

test('fresh ingredient insert must preserve every source line before publication', () => {
  const freshBranch = sql.slice(sql.indexOf('  insert into public.kwilt_recipes('));
  assert.match(freshBranch, /where char_length\(btrim\(value->>'originalText'\)\) between 1 and 1000;\s+get diagnostics v_inserted_count = row_count;\s+if v_inserted_count <> jsonb_array_length\(p_source->'ingredients'\) then\s+raise exception 'catalog_ingredient_mismatch' using errcode = '22023';/);
  assert.ok(freshBranch.indexOf('catalog_ingredient_mismatch') < freshBranch.indexOf('insert into public.kwilt_recipe_publications('));
});

test('existing immutable-version publication and importer privileges stay unchanged', () => {
  const existingBranch = text => text.slice(text.indexOf('  if existing.id is not null then'), text.indexOf('  insert into public.kwilt_recipes('));
  assert.ok(existingBranch(sql).length > 1000);
  assert.equal(existingBranch(sql), existingBranch(previous));
  assert.match(sql, /grant execute on function public.import_kwilt_recipe_catalog_source\(uuid, jsonb\) to service_role/);
  assert.match(sql, /revoke all on function public.import_kwilt_recipe_catalog_source\(uuid, jsonb\) from public, anon, authenticated/);
});
