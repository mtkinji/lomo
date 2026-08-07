import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_029 } from './starterRecipeBatch029';

describe('starter recipe batch 029', () => {
  it('contains recipes DI001 through DI005 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_029.map(recipe => recipe.rosterId)).toEqual(['DI001', 'DI002', 'DI003', 'DI004', 'DI005']);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_029)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_029.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_029.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_029.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
