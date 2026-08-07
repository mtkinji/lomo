import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_017 } from './starterRecipeBatch017';

describe('starter recipe batch 017', () => {
  it('contains recipes LU026 through LU030 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_017.map(recipe => recipe.rosterId)).toEqual(['LU026', 'LU027', 'LU028', 'LU029', 'LU030']);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_017)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_017.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_017.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_017.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
