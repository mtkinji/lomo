import { compileGroceryAuthority } from '../groceryCompiler.ts';

const input = {
  plan: { id: 'plan-1', version: 3, state: 'finalized', organizer_person_id: 'person-1' }, expectedVersion: 3, actorPersonId: 'person-1',
  entries: [{ id: 'entry-1', plan_version: 3, servings: 8, recipe_snapshot: { recipeVersionId: 'version-1', yieldQuantity: 4 } }],
  ingredientsByVersionId: { 'version-1': [{ id: 'ingredient-1', original_text: '2 onions', optional: false }] },
};

Deno.test('compiles finalized exact-version authority and preserves provenance', () => {
  const result = compileGroceryAuthority(input);
  if (result.items[0]?.quantityMin !== 4) throw new Error('serving scale failed');
  if (result.items[0]?.sources[0]?.ingredientLineId !== 'ingredient-1') throw new Error('provenance lost');
});

Deno.test('rejects stale, unfinalized, wrong-owner, and missing Recipe authority', () => {
  for (const changed of [
    { ...input, expectedVersion: 2 },
    { ...input, plan: { ...input.plan, state: 'draft' } },
    { ...input, actorPersonId: 'person-2' },
    { ...input, ingredientsByVersionId: {} },
  ]) {
    let failed = false; try { compileGroceryAuthority(changed); } catch { failed = true; }
    if (!failed) throw new Error('invalid authority compiled');
  }
});
