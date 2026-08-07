import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_003 } from './starterRecipeBatch003';

describe('starter recipe batch 003', () => {
  it('contains recipes BR021 through BR030 in roster order', () => {
    expect(STARTER_RECIPE_BATCH_003.map(recipe => recipe.rosterId)).toEqual([
      'BR021', 'BR022', 'BR023', 'BR024', 'BR025', 'BR026', 'BR027', 'BR028', 'BR029', 'BR030',
    ]);
  });

  it('passes the editorial contract without cloned bodies', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_003)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_003.map(recipe => recipe.ingredients.join('|'))).size).toBe(10);
    expect(new Set(STARTER_RECIPE_BATCH_003.map(recipe => recipe.instructions.join('|'))).size).toBe(10);
    expect(STARTER_RECIPE_BATCH_003.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
