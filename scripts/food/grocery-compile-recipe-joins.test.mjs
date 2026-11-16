import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Opt-in, read-only integration regression against a migrated PostgREST schema.
// Run with SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and KWILT_FOOD_JOIN_INTEGRATION=1.
// No private recipe data is requested: limit=0 still resolves embedded relations.
const source = readFileSync(new URL('../../supabase/functions/grocery-compile/index.ts', import.meta.url), 'utf8');
const selects = [...source.matchAll(/\.from\('kwilt_recipe_versions'\)\.select\('([^']+)'\)/g)].map((match) => match[1]);
const paths = ['single recipe', 'shared meal plan', 'finalized meal plan'];
for (const [index, path] of paths.entries()) {
  test(`${path} grocery lookup resolves the recipe parent when current-version FK also exists`, {
    skip: process.env.KWILT_FOOD_JOIN_INTEGRATION !== '1',
  }, async () => {
    assert.ok(selects[index], `Missing query for ${path}`);
    const url = new URL('/rest/v1/kwilt_recipe_versions', process.env.SUPABASE_URL);
    url.searchParams.set('select', selects[index]);
    url.searchParams.set('limit', '0');
    const response = await fetch(url, { headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY } });
    const body = await response.json();
    assert.equal(response.status, 200, JSON.stringify(body));
    assert.deepEqual(body, []);
  });
}
