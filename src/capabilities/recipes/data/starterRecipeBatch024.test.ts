import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_024 } from './starterRecipeBatch024';

describe('starter recipe batch 024', () => {
  it('contains recipes LU061 through LU065 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_024.map(recipe => recipe.rosterId)).toEqual(['LU061', 'LU062', 'LU063', 'LU064', 'LU065']);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_024)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_024.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_024.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_024.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
