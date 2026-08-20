import { compileGroceryAuthority, compileHouseholdPlanGroceryAuthority, compileRecipeGroceryAuthority } from '../groceryCompiler.ts';

const input = {
  plan: { id: 'plan-1', version: 3, state: 'finalized', organizer_person_id: 'person-1' }, expectedVersion: 3, actorPersonId: 'person-1',
  entries: [{ id: 'entry-1', plan_version: 3, servings: 8, recipe_snapshot: { recipeVersionId: 'version-1', yieldQuantity: 4 } }],
  ingredientsByVersionId: { 'version-1': [{ id: 'ingredient-1', original_text: '2 onions', optional: false }] },
};

Deno.test('compiles finalized exact-version authority and preserves provenance', () => {
  const result = compileGroceryAuthority(input);
  if (result.items[0]?.quantityMin !== 4) throw new Error('serving scale failed');
  if (result.items[0]?.sources[0]?.ingredientLineId !== 'ingredient-1') throw new Error('provenance lost');
  if (result.items[0]?.sources[0]?.quantityMin !== 4 || result.items[0]?.sources[0]?.unit !== 'count') throw new Error('contribution quantity lost');
  if (result.items[0]?.sources[0]?.optional !== false) throw new Error('contribution optionality lost');
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

Deno.test('compiles one readable Recipe version without inventing Meal Plan membership', () => {
  const result = compileRecipeGroceryAuthority({
    source: {
      recipeId: 'recipe-1',
      recipeVersionId: 'version-1',
      recipeVersion: 2,
      contentHash: 'sha256:recipe-1-v2',
      sourceType: 'manual',
      title: 'Onion soup',
      yieldQuantity: 4,
      ingredients: [],
    },
    servings: 8,
    authoritativeIngredients: [{ id: 'ingredient-1', original_text: '2 onions', optional: false }],
  });

  if (result.items[0]?.quantityMin !== 4) throw new Error('single Recipe serving scale failed');
  if (result.items[0]?.sources[0]?.scope !== 'recipe_version') throw new Error('single Recipe scope was not explicit');
  if (result.items[0]?.sources[0]?.recipeVersionId !== 'version-1') throw new Error('single Recipe provenance was lost');
});

Deno.test('compiles one immutable bundled-catalog Recipe snapshot', () => {
  const result = compileRecipeGroceryAuthority({
    source: {
      recipeId: 'kwilt-recipe-br001',
      recipeVersionId: 'kwilt-recipe-br001-v1',
      recipeVersion: 1,
      contentHash: 'kwilt:BR001:v1',
      sourceType: 'catalog',
      title: 'Pancakes',
      yieldQuantity: 4,
      ingredients: [{ id: 'kwilt-recipe-br001-v1-ingredient-1', originalText: '2 cups flour', optional: false }],
    },
    servings: 8,
    authoritativeIngredients: null,
  });

  if (result.items[0]?.quantityMin !== 4) throw new Error('catalog Recipe serving scale failed');
  if (result.items[0]?.sources[0]?.kind !== 'catalog_recipe_ingredient') throw new Error('catalog Recipe authority was not distinguished');
});

Deno.test('compiles a persistent household Plan with candidate-level quantities', () => {
  const result = compileHouseholdPlanGroceryAuthority({
    plan: { id: 'plan-1', household_id: 'household-1', organizer_person_id: 'person-1', version: 7, state: 'draft' },
    expectedVersion: 7,
    actorPersonId: 'person-1',
    actorRole: 'caregiver',
    candidates: [
      { id: 'candidate-a', lifecycleState: 'sent', removedGroceryBehavior: null, recipeSnapshot: { recipeVersionId: 'version-a', yieldQuantity: 4, selectedServings: 8 } },
      { id: 'candidate-b', lifecycleState: 'sent', removedGroceryBehavior: null, recipeSnapshot: { recipeVersionId: 'version-b', yieldQuantity: 4, selectedServings: 4 } },
    ],
    ingredientsByVersionId: {
      'version-a': [{ id: 'cheese-a', original_text: '1 cup cheese', optional: false }],
      'version-b': [{ id: 'cheese-b', original_text: '2 cups cheese', optional: false }],
    },
  });
  if (result.items[0]?.quantityMin !== 4) throw new Error('household aggregate or serving scale incorrect');
  const quantities = result.items[0]?.sources.map((source) => [source.planCandidateId, source.quantityMin]);
  if (JSON.stringify(quantities) !== JSON.stringify([['candidate-a', 2], ['candidate-b', 2]])) throw new Error('candidate contributions lost');
});

Deno.test('rejects household Plan compilation without adult authority or current draft version', () => {
  const base = {
    plan: { id: 'plan-1', household_id: 'household-1', organizer_person_id: 'person-1', version: 7, state: 'draft' }, expectedVersion: 7, actorPersonId: 'person-1', actorRole: 'owner',
    candidates: [], ingredientsByVersionId: {},
  };
  for (const changed of [
    { ...base, actorRole: 'child' },
    { ...base, expectedVersion: 6 },
    { ...base, plan: { ...base.plan, state: 'finalized' } },
  ]) {
    let failed = false; try { compileHouseholdPlanGroceryAuthority(changed); } catch { failed = true; }
    if (!failed) throw new Error('invalid household Plan authority compiled');
  }
});

Deno.test('lets only the organizer compile a personal draft Plan', () => {
  const personal = {
    plan: { id: 'plan-personal', household_id: null, organizer_person_id: 'person-1', version: 1, state: 'draft' },
    expectedVersion: 1,
    actorPersonId: 'person-1',
    actorRole: null,
    candidates: [{
      id: 'candidate-a', lifecycleState: 'sent' as const, removedGroceryBehavior: null,
      recipeSnapshot: { recipeVersionId: 'version-a', yieldQuantity: 2, selectedServings: 4 },
    }],
    ingredientsByVersionId: {
      'version-a': [{ id: 'rice', original_text: '1 cup rice', optional: false }],
    },
  };

  const result = compileHouseholdPlanGroceryAuthority(personal);
  if (result.items[0]?.quantityMin !== 2) throw new Error('personal Plan quantity was not preserved');

  let failed = false;
  try {
    compileHouseholdPlanGroceryAuthority({ ...personal, actorPersonId: 'person-2' });
  } catch {
    failed = true;
  }
  if (!failed) throw new Error('a different person compiled a personal Plan');
});
