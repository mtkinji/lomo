import { recipeVersionContractFixture } from '../domain/recipeContractFixtures';
import { RECIPE_EDITORIAL_ENRICHMENT_BY_ROSTER_ID } from '../data/recipeEditorialEnrichment.seed';
import { deriveRecipeReadiness, shouldShowFoodCookGuide } from './RecipeReadinessScreen';

describe('Recipe readiness', () => {
  it('locks servings and labels inferred equipment', () => {
    const version = recipeVersionContractFixture();
    version.instructions = [{ ...version.instructions[0], text: 'Preheat the oven to 350°F. Bake for 20 minutes.' }];
    const items = deriveRecipeReadiness(version, 6);
    expect(items).toContainEqual({ id: 'servings', label: 'Cooking for 6', inferred: false });
    expect(items).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'equipment', inferred: true, label: expect.stringContaining('oven') })]));
  });

  it('offers the touch-first resume guide once for a planned Recipe', () => {
    expect(shouldShowFoodCookGuide('meal_plan', false)).toBe(true);
    expect(shouldShowFoodCookGuide('meal_plan', true)).toBe(false);
    expect(shouldShowFoodCookGuide(undefined, false)).toBe(false);
  });

  it('uses reviewed factual equipment as individual preflight items instead of inferred noun matching', () => {
    const version = recipeVersionContractFixture();
    version.instructions = [{ ...version.instructions[0], text: 'Use the oven and skillet.' }];
    const enrichment = RECIPE_EDITORIAL_ENRICHMENT_BY_ROSTER_ID.get('BR031')!;
    const items = deriveRecipeReadiness(version, 4, enrichment);

    expect(items).toEqual(expect.arrayContaining([
      { id: 'equipment-tamagoyaki-pan', label: 'Rectangular tamagoyaki pan', inferred: false },
      { id: 'equipment-mixing-bowl', label: 'Medium mixing bowl', inferred: false },
    ]));
    expect(items).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: 'equipment', inferred: true })]));
  });
});
