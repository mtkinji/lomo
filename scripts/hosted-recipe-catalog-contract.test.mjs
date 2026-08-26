import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  new URL('../supabase/migrations/20260824145420_hosted_recipe_catalog_v2.sql', import.meta.url),
  'utf8',
).toLowerCase();
const scalingMigration = readFileSync(
  new URL('../supabase/migrations/20260825022943_recipe_ingredient_scaling_rules.sql', import.meta.url),
  'utf8',
).toLowerCase();
const immutableScalingMigration = readFileSync(
  new URL('../supabase/migrations/20260825154258_publish_scaling_as_immutable_recipe_version.sql', import.meta.url),
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
  assert.doesNotMatch(scalingMigration, /jsonb_object_length\(/);
  assert.match(
    scalingMigration,
    /scale_rule = jsonb_build_object\('kind', 'fixed', 'reason', scale_rule->>'reason'\)/,
  );
});

test('scaling review republishes an immutable Recipe version instead of mutating published content', () => {
  assert.match(immutableScalingMigration, /insert into public\.kwilt_recipe_versions/);
  assert.match(immutableScalingMigration, /insert into public\.kwilt_recipe_ingredients/);
  assert.match(immutableScalingMigration, /extensions\.digest\(/);
  assert.match(immutableScalingMigration, /published_recipe_version_id = v_version_id/);
  assert.doesNotMatch(immutableScalingMigration, /update public\.kwilt_recipe_versions[\s\s]*set scaling_state/);
  assert.doesNotMatch(immutableScalingMigration, /update public\.kwilt_recipe_ingredients[\s\s]*set scale_rule/);
});
