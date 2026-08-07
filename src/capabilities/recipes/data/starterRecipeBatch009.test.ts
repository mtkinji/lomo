import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_009 } from './starterRecipeBatch009';

describe('starter recipe batch 009', () => {
  it('contains recipes BR076 through BR080 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_009.map(recipe => recipe.rosterId)).toEqual(['BR076', 'BR077', 'BR078', 'BR079', 'BR080']);
  });

  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_009)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_009.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_009.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_009.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
