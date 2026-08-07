import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_040 } from './starterRecipeBatch040';

describe('starter recipe batch 040', () => {
  it('contains recipes DI056 through DI060 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_040.map(recipe => recipe.rosterId)).toEqual(['DI056', 'DI057', 'DI058', 'DI059', 'DI060']);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_040)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_040.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_040.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_040.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
