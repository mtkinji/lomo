import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_038 } from './starterRecipeBatch038';

describe('starter recipe batch 038', () => {
  it('contains recipes DI046 through DI050 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_038.map(recipe => recipe.rosterId)).toEqual(['DI046', 'DI047', 'DI048', 'DI049', 'DI050']);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_038)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_038.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_038.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_038.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
