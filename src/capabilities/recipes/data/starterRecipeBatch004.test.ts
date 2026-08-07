import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_004 } from './starterRecipeBatch004';

describe('starter recipe batch 004', () => {
  it('contains recipes BR031 through BR040 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_004.map(recipe => recipe.rosterId)).toEqual([
      'BR031', 'BR032', 'BR033', 'BR034', 'BR035', 'BR036', 'BR037', 'BR038', 'BR039', 'BR040',
    ]);
  });

  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_004)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_004.map(recipe => recipe.ingredients.join('|'))).size).toBe(10);
    expect(new Set(STARTER_RECIPE_BATCH_004.map(recipe => recipe.instructions.join('|'))).size).toBe(10);
    expect(STARTER_RECIPE_BATCH_004.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
