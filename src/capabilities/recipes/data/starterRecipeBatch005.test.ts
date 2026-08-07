import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_005 } from './starterRecipeBatch005';

describe('starter recipe batch 005', () => {
  it('contains recipes BR041 through BR050 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_005.map(recipe => recipe.rosterId)).toEqual([
      'BR041', 'BR042', 'BR043', 'BR044', 'BR045', 'BR046', 'BR047', 'BR048', 'BR049', 'BR050',
    ]);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_005)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_005.map(recipe => recipe.ingredients.join('|'))).size).toBe(10);
    expect(new Set(STARTER_RECIPE_BATCH_005.map(recipe => recipe.instructions.join('|'))).size).toBe(10);
    expect(STARTER_RECIPE_BATCH_005.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
