import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_020 } from './starterRecipeBatch020';

describe('starter recipe batch 020', () => {
  it('contains recipes LU041 through LU045 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_020.map(recipe => recipe.rosterId)).toEqual(['LU041', 'LU042', 'LU043', 'LU044', 'LU045']);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_020)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_020.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_020.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_020.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
