import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_016 } from './starterRecipeBatch016';

describe('starter recipe batch 016', () => {
  it('contains recipes LU021 through LU025 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_016.map(recipe => recipe.rosterId)).toEqual(['LU021', 'LU022', 'LU023', 'LU024', 'LU025']);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_016)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_016.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_016.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_016.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
