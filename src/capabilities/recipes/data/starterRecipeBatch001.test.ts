import { validateEditorialBatch } from './editorialRecipeCatalog';
import { STARTER_RECIPE_BATCH_001 } from './starterRecipeBatch001';

describe('starter Recipe editorial batch 001', () => {
  it('contains ten independently authored, research-complete recipes', () => {
    expect(STARTER_RECIPE_BATCH_001).toHaveLength(10);
    expect(validateEditorialBatch(STARTER_RECIPE_BATCH_001)).toEqual([]);
    expect(new Set(STARTER_RECIPE_BATCH_001.map((recipe) => recipe.ingredients.join('|'))).size).toBe(10);
    expect(new Set(STARTER_RECIPE_BATCH_001.map((recipe) => recipe.instructions.join('|'))).size).toBe(10);
  });

  it('keeps every recipe at the honest desk-reviewed proof boundary', () => {
    expect(STARTER_RECIPE_BATCH_001.every((recipe) => recipe.kitchenTestState === 'desk-reviewed')).toBe(true);
  });
});
