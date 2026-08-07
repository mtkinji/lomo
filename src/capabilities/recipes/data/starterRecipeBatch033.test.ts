import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_033 } from './starterRecipeBatch033';

describe('starter recipe batch 033', () => {
  it('contains recipes DI021 through DI025 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_033.map(recipe => recipe.rosterId)).toEqual(['DI021', 'DI022', 'DI023', 'DI024', 'DI025']);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_033)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_033.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_033.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_033.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
