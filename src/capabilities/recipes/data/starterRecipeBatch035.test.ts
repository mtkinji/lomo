import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_035 } from './starterRecipeBatch035';

describe('starter recipe batch 035', () => {
  it('contains recipes DI031 through DI035 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_035.map(recipe => recipe.rosterId)).toEqual(['DI031', 'DI032', 'DI033', 'DI034', 'DI035']);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_035)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_035.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_035.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_035.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
