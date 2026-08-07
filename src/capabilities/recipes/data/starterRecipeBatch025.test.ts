import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_025 } from './starterRecipeBatch025';

describe('starter recipe batch 025', () => {
  it('contains recipes LU066 through LU070 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_025.map(recipe => recipe.rosterId)).toEqual(['LU066', 'LU067', 'LU068', 'LU069', 'LU070']);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_025)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_025.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_025.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_025.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
