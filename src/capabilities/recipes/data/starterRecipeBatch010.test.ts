import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_010 } from './starterRecipeBatch010';

describe('starter recipe batch 010', () => {
  it('contains recipes BR081 through BR085 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_010.map(recipe => recipe.rosterId)).toEqual(['BR081', 'BR082', 'BR083', 'BR084', 'BR085']);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_010)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_010.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_010.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_010.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
