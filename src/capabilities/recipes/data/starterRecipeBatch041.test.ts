import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_041 } from './starterRecipeBatch041';

describe('starter recipe batch 041', () => {
  it('contains recipes DI061 through DI065 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_041.map(recipe => recipe.rosterId)).toEqual(['DI061', 'DI062', 'DI063', 'DI064', 'DI065']);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_041)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_041.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_041.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_041.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
