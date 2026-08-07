import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_042 } from './starterRecipeBatch042';

describe('starter recipe batch 042', () => {
  it('contains recipes DI066 through DI070 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_042.map(recipe => recipe.rosterId)).toEqual(['DI066', 'DI067', 'DI068', 'DI069', 'DI070']);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_042)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_042.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_042.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_042.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
