import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_039 } from './starterRecipeBatch039';

describe('starter recipe batch 039', () => {
  it('contains recipes DI051 through DI055 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_039.map(recipe => recipe.rosterId)).toEqual(['DI051', 'DI052', 'DI053', 'DI054', 'DI055']);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_039)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_039.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_039.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_039.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
