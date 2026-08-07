import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_027 } from './starterRecipeBatch027';

describe('starter recipe batch 027', () => {
  it('contains recipes LU076 through LU080 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_027.map(recipe => recipe.rosterId)).toEqual(['LU076', 'LU077', 'LU078', 'LU079', 'LU080']);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_027)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_027.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_027.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_027.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
