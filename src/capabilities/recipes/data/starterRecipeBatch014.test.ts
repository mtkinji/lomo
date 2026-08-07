import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_014 } from './starterRecipeBatch014';

describe('starter recipe batch 014', () => {
  it('contains recipes LU011 through LU015 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_014.map(recipe => recipe.rosterId)).toEqual(['LU011', 'LU012', 'LU013', 'LU014', 'LU015']);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_014)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_014.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_014.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_014.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
