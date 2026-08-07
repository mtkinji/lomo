import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_036 } from './starterRecipeBatch036';

describe('starter recipe batch 036', () => {
  it('contains recipes DI036 through DI040 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_036.map(recipe => recipe.rosterId)).toEqual(['DI036', 'DI037', 'DI038', 'DI039', 'DI040']);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_036)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_036.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_036.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_036.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
