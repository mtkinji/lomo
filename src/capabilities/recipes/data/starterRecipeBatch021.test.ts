import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_021 } from './starterRecipeBatch021';

describe('starter recipe batch 021', () => {
  it('contains recipes LU046 through LU050 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_021.map(recipe => recipe.rosterId)).toEqual(['LU046', 'LU047', 'LU048', 'LU049', 'LU050']);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_021)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_021.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_021.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_021.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
