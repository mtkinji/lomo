import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_023 } from './starterRecipeBatch023';

describe('starter recipe batch 023', () => {
  it('contains recipes LU056 through LU060 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_023.map(recipe => recipe.rosterId)).toEqual(['LU056', 'LU057', 'LU058', 'LU059', 'LU060']);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_023)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_023.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_023.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_023.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
