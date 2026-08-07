import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_034 } from './starterRecipeBatch034';

describe('starter recipe batch 034', () => {
  it('contains recipes DI026 through DI030 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_034.map(recipe => recipe.rosterId)).toEqual(['DI026', 'DI027', 'DI028', 'DI029', 'DI030']);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_034)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_034.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_034.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_034.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
