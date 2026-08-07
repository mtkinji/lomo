import { recipeVersionContractFixture } from '../domain/recipeContractFixtures';
import { deriveRecipeReadiness } from './RecipeReadinessScreen';

describe('Recipe readiness', () => {
  it('locks servings and labels inferred equipment', () => {
    const version = recipeVersionContractFixture();
    version.instructions = [{ ...version.instructions[0], text: 'Preheat the oven to 350°F. Bake for 20 minutes.' }];
    const items = deriveRecipeReadiness(version, 6);
    expect(items).toContainEqual({ id: 'servings', label: 'Cooking for 6', inferred: false });
    expect(items).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'equipment', inferred: true, label: expect.stringContaining('oven') })]));
  });
});
