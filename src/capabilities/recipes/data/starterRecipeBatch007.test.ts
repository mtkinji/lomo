import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_007 } from './starterRecipeBatch007';

describe('starter recipe batch 007', () => {
  it('contains recipes BR061 through BR070 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_007.map(recipe => recipe.rosterId)).toEqual(['BR061', 'BR062', 'BR063', 'BR064', 'BR065', 'BR066', 'BR067', 'BR068', 'BR069', 'BR070']);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_007)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_007.map(recipe => recipe.ingredients.join('|'))).size).toBe(10);
    expect(new Set(STARTER_RECIPE_BATCH_007.map(recipe => recipe.instructions.join('|'))).size).toBe(10);
    expect(STARTER_RECIPE_BATCH_007.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
