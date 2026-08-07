import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_012 } from './starterRecipeBatch012';

describe('starter recipe batch 012', () => {
  it('contains recipes LU001 through LU005 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_012.map(recipe => recipe.rosterId)).toEqual(['LU001', 'LU002', 'LU003', 'LU004', 'LU005']);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_012)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_012.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_012.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_012.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
