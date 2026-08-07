import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_030 } from './starterRecipeBatch030';

describe('starter recipe batch 030', () => {
  it('contains recipes DI006 through DI010 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_030.map(recipe => recipe.rosterId)).toEqual(['DI006', 'DI007', 'DI008', 'DI009', 'DI010']);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_030)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_030.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_030.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_030.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
