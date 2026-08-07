import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_022 } from './starterRecipeBatch022';

describe('starter recipe batch 022', () => {
  it('contains recipes LU051 through LU055 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_022.map(recipe => recipe.rosterId)).toEqual(['LU051', 'LU052', 'LU053', 'LU054', 'LU055']);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_022)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_022.map(recipe => recipe.ingredients.join('|'))).size).toBe(5);
    expect(new Set(STARTER_RECIPE_BATCH_022.map(recipe => recipe.instructions.join('|'))).size).toBe(5);
    expect(STARTER_RECIPE_BATCH_022.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
