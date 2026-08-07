import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_031 } from './starterRecipeBatch031';

describe('starter recipe batch 031', () => {
  it('contains recipes DI011 through DI015 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_031.map(recipe => recipe.rosterId)).toEqual(['DI011', 'DI012', 'DI013', 'DI014', 'DI015']);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_031)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_031.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_031.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_031.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
