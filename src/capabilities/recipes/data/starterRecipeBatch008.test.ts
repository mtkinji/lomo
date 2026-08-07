import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_008 } from './starterRecipeBatch008';

describe('starter recipe batch 008', () => {
  it('contains recipes BR071 through BR075 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_008.map(recipe => recipe.rosterId)).toEqual(['BR071', 'BR072', 'BR073', 'BR074', 'BR075']);
  });

  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_008)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_008.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_008.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_008.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
