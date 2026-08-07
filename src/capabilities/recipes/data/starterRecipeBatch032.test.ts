import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_032 } from './starterRecipeBatch032';

describe('starter recipe batch 032', () => {
  it('contains recipes DI016 through DI020 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_032.map(recipe => recipe.rosterId)).toEqual(['DI016', 'DI017', 'DI018', 'DI019', 'DI020']);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_032)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_032.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_032.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_032.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
