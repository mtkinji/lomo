import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_013 } from './starterRecipeBatch013';

describe('starter recipe batch 013', () => {
  it('contains recipes LU006 through LU010 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_013.map(recipe => recipe.rosterId)).toEqual(['LU006', 'LU007', 'LU008', 'LU009', 'LU010']);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_013)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_013.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_013.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_013.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
