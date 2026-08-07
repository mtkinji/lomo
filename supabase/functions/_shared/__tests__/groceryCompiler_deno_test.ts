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

Deno.test('compiles every dish once while keeping dish entry provenance private', () => {
  const result = compileGroceryAuthority({
    ...input,
    entries: [
      { id: 'adult-dish', plan_version: 3, servings: 4, recipe_snapshot: { recipeVersionId: 'version-1', yieldQuantity: 4 } },
      { id: 'alternate-dish', plan_version: 3, servings: 2, recipe_snapshot: { recipeVersionId: 'version-2', yieldQuantity: 2 } },
    ],
    ingredientsByVersionId: {
      'version-1': [{ id: 'onions', original_text: '2 onions', optional: false }],
      'version-2': [{ id: 'bread', original_text: '4 slices bread', optional: false }],
    },
  });
  const sources = result.items.flatMap((item) => item.sources);
  if (sources.filter((source) => source.planEntryId === 'adult-dish').length !== 1) throw new Error('first dish duplicated');
  if (sources.filter((source) => source.planEntryId === 'alternate-dish').length !== 1) throw new Error('alternate dish duplicated');
  if (JSON.stringify(result).match(/diner|allerg|food.need/i)) throw new Error('private meal-fit context leaked');
});

Deno.test('compiles an immutable bundled-catalog ingredient snapshot without private Recipe rows', () => {
  const result = compileGroceryAuthority({
    ...input,
    entries: [{
      id: 'catalog-entry',
      plan_version: 3,
      servings: 8,
      recipe_snapshot: {
        recipeVersionId: 'kwilt-recipe-br001-v1',
        yieldQuantity: 4,
        sourceType: 'catalog',
        contentHash: 'kwilt:BR001:v1',
        ingredients: [{
          id: 'kwilt-recipe-br001-v1-ingredient-1',
          originalText: '2 cups flour',
          optional: false,
        }],
      },
    }],
    ingredientsByVersionId: {},
  });

  if (result.items[0]?.quantityMin !== 4) throw new Error('catalog serving scale failed');
  if (result.items[0]?.sources[0]?.ingredientLineId !== 'kwilt-recipe-br001-v1-ingredient-1') throw new Error('catalog provenance lost');
  if (result.items[0]?.sources[0]?.kind !== 'catalog_recipe_ingredient') throw new Error('catalog authority was not distinguished');
});
