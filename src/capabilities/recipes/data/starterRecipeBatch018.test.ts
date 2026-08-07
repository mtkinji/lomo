import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_018 } from './starterRecipeBatch018';

describe('starter recipe batch 018', () => {
  it('contains recipes LU031 through LU035 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_018.map(recipe => recipe.rosterId)).toEqual(['LU031', 'LU032', 'LU033', 'LU034', 'LU035']);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_018)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_018.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_018.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_018.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
