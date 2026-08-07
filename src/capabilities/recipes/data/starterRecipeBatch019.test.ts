import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_019 } from './starterRecipeBatch019';

describe('starter recipe batch 019', () => {
  it('contains recipes LU036 through LU040 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_019.map(recipe => recipe.rosterId)).toEqual(['LU036', 'LU037', 'LU038', 'LU039', 'LU040']);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_019)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_019.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_019.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_019.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
