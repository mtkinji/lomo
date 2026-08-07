import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_037 } from './starterRecipeBatch037';

describe('starter recipe batch 037', () => {
  it('contains recipes DI041 through DI045 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_037.map(recipe => recipe.rosterId)).toEqual(['DI041', 'DI042', 'DI043', 'DI044', 'DI045']);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_037)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_037.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_037.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_037.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
