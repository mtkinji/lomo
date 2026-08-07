import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_011 } from './starterRecipeBatch011';

describe('starter recipe batch 011', () => {
  it('contains recipes BR086 through BR090 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_011.map(recipe => recipe.rosterId)).toEqual(['BR086', 'BR087', 'BR088', 'BR089', 'BR090']);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_011)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_011.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_011.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_011.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
