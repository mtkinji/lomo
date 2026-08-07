import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_028 } from './starterRecipeBatch028';

describe('starter recipe batch 028', () => {
  it('contains recipes LU081 through LU085 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_028.map(recipe => recipe.rosterId)).toEqual(['LU081', 'LU082', 'LU083', 'LU084', 'LU085']);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_028)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_028.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_028.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_028.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
