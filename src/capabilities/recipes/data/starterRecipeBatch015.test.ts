import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_015 } from './starterRecipeBatch015';

describe('starter recipe batch 015', () => {
  it('contains recipes LU016 through LU020 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_015.map(recipe => recipe.rosterId)).toEqual(['LU016', 'LU017', 'LU018', 'LU019', 'LU020']);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_015)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_015.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_015.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_015.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
