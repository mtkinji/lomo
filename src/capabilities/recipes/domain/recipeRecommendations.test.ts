import { buildRecipeRecommendations } from './recipeRecommendations';
import { buildRecipeLibraryInventory } from '../data/starterRecipeCatalog';

describe('recipe recommendations', () => {
  it('uses only defensible editorial and cook-time reasons', () => {
    const recommendations = buildRecipeRecommendations(buildRecipeLibraryInventory([]), 6);

    expect(recommendations).toHaveLength(6);
    expect(recommendations.every(({ reason }) =>
      reason.id === 'quick' || reason.id === 'editorial',
    )).toBe(true);
    expect(recommendations.some(({ reason }) => reason.id === 'quick')).toBe(true);
    expect(recommendations.some(({ reason }) => reason.id === 'editorial')).toBe(true);
  });

  it('keeps editorial picks first, caps the result, and does not duplicate recipes', () => {
    const recipes = buildRecipeLibraryInventory([]);
    const recommendations = buildRecipeRecommendations(recipes, 4);

    expect(recommendations).toHaveLength(4);
    expect(new Set(recommendations.map(({ projection }) => projection.recipe.id)).size).toBe(4);
    expect(recommendations[0]?.reason.id).toBe('editorial');
  });
});
