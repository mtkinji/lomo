import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_002 } from './starterRecipeBatch002';

describe('starter recipe batch 002', () => {
  it('contains the approved second ten dishes', () => {
    expect(STARTER_RECIPE_BATCH_002.map(recipe => recipe.rosterId)).toEqual([
      'BR011', 'BR012', 'BR013', 'BR014', 'BR015', 'BR016', 'BR017', 'BR018', 'BR019', 'BR020',
    ]);
  });

  it('passes the editorial contract', () => {
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_002)).toEqual([]);
  });

  it('has independently authored ingredient lists and methods', () => {
    expect(new Set(STARTER_RECIPE_BATCH_002.map(recipe => recipe.ingredients.join('|'))).size).toBe(10);
    expect(new Set(STARTER_RECIPE_BATCH_002.map(recipe => recipe.instructions.join('|'))).size).toBe(10);
    expect(STARTER_RECIPE_BATCH_002.every(recipe => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
