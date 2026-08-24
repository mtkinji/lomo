import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  new URL('../supabase/migrations/20260824145420_hosted_recipe_catalog_v2.sql', import.meta.url),
  'utf8',
).toLowerCase();

test('the hosted catalog v2 projection includes validated equipment and remains authenticated-only', () => {
  assert.match(migration, /create or replace function public\.list_kwilt_recipe_catalog_v2/);
  assert.match(migration, /kwilt_recipe_equipment_requirements/);
  assert.match(migration, /equipmentrequirements/);
  assert.match(migration, /revoke all on function public\.list_kwilt_recipe_catalog_v2\(text, integer\) from public, anon/);
  assert.match(migration, /grant execute on function public\.list_kwilt_recipe_catalog_v2\(text, integer\) to authenticated/);
});
