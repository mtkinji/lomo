import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  new URL('../supabase/migrations/20260824145420_hosted_recipe_catalog_v2.sql', import.meta.url),
  'utf8',
).toLowerCase();
const scalingMigration = readFileSync(
  new URL('../supabase/migrations/20260825010851_recipe_ingredient_scaling_rules.sql', import.meta.url),
  'utf8',
).toLowerCase();

test('the hosted catalog v2 projection includes validated equipment and remains authenticated-only', () => {
  assert.match(migration, /create or replace function public\.list_kwilt_recipe_catalog_v2/);
  assert.match(migration, /kwilt_recipe_equipment_requirements/);
  assert.match(migration, /equipmentrequirements/);
  assert.match(migration, /revoke all on function public\.list_kwilt_recipe_catalog_v2\(text, integer\) from public, anon/);
  assert.match(migration, /grant execute on function public\.list_kwilt_recipe_catalog_v2\(text, integer\) to authenticated/);
});

test('the hosted catalog publishes exact reviewed scaling state and ingredient rules', () => {
  assert.match(scalingMigration, /add column scaling_state text not null default 'review_required'/);
  assert.match(scalingMigration, /add column scale_rule jsonb not null default/);
  assert.match(scalingMigration, /'scalingstate'/);
  assert.match(scalingMigration, /'scalerule'/);
  assert.match(scalingMigration, /p_source->'structuredingredients'/);
  assert.match(scalingMigration, /jsonb_object_length\(scale_rule\) = 2/);
});
