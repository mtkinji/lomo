import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_006 } from './starterRecipeBatch006';

describe('starter recipe batch 006', () => {
  it('contains recipes BR051 through BR060 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_006.map(recipe => recipe.rosterId)).toEqual([
      'BR051', 'BR052', 'BR053', 'BR054', 'BR055', 'BR056', 'BR057', 'BR058', 'BR059', 'BR060',
    ]);
  });
  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_006)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_006.map(recipe => recipe.ingredients.join('|'))).size).toBe(10);
    expect(new Set(STARTER_RECIPE_BATCH_006.map(recipe => recipe.instructions.join('|'))).size).toBe(10);
    expect(STARTER_RECIPE_BATCH_006.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
