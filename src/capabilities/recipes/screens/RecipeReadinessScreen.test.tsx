import { recipeVersionContractFixture } from '../domain/recipeContractFixtures';
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
});
