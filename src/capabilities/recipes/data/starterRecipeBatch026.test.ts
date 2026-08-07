import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_026 } from './starterRecipeBatch026';

describe('starter recipe batch 026', () => {
  it('contains recipes LU071 through LU075 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_026.map(recipe => recipe.rosterId)).toEqual(['LU071', 'LU072', 'LU073', 'LU074', 'LU075']);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_026)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_026.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_026.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_026.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
