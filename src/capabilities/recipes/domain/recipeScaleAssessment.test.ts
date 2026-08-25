import type { RecipeIngredientLine, RecipeIngredientScaleRule } from './recipeContracts';
import { assessRecipeScaleability } from './recipeScaleAssessment';

function line(scaleRule: RecipeIngredientScaleRule, id = 'ingredient-1'): RecipeIngredientLine {
  return {
    id,
    recipeVersionId: 'recipe-version-1',
    position: Number(id.split('-').at(-1)) - 1,
    groupLabel: null,
    originalText: '1 cup flour',
    quantityMin: 1,
    quantityMax: null,
    unit: 'cup',
    ingredientConcept: 'flour',
    preparation: null,
    optional: false,
    parseConfidence: 1,
    scaleRule,
  };
}

describe('recipe scale assessment', () => {
  it('allows multipliers only when every ingredient rule is reviewed', () => {
    expect(assessRecipeScaleability([
      line({ kind: 'multiply' }),
      line({ kind: 'fixed', reason: 'as_needed' }, 'ingredient-2'),
    ], 'verified')).toEqual({ available: true, blockers: [] });
  });

  it('fails the entire recipe closed instead of partially scaling', () => {
    expect(assessRecipeScaleability([
      line({ kind: 'multiply' }),
      line({ kind: 'review_required' }, 'ingredient-2'),
    ], 'verified')).toEqual({
      available: false,
      blockers: ['ingredient-2'],
    });
  });

  it('keeps an explicitly unavailable recipe at one batch', () => {
    expect(assessRecipeScaleability([line({ kind: 'multiply' })], 'unavailable'))
      .toEqual({ available: false, blockers: ['recipe_scaling_unavailable'] });
  });
});
