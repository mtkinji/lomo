import {
  buildContextualRecipeRecommendations,
  buildRecipeRecommendations,
} from './recipeRecommendations';
import { buildRecipeLibraryInventory } from '../data/starterRecipeCatalog';
import { recipeContractFixture, recipeVersionContractFixture } from './recipeContractFixtures';

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

  it('builds bounded alternatives that exclude the open, hidden, and unavailable Recipes', () => {
    const recipes = buildRecipeLibraryInventory([]);
    const current = recipes.find((projection) =>
      recipes.some(
        (candidate) =>
          candidate.recipe.id !== projection.recipe.id &&
          candidate.currentVersion.prepMinutes !== null &&
          projection.currentVersion.prepMinutes !== null,
      ),
    )!;
    const hiddenId = recipes.find(({ recipe }) => recipe.id !== current.recipe.id)!.recipe.id;
    const unavailable = recipes.find(
      ({ recipe }) => recipe.id !== current.recipe.id && recipe.id !== hiddenId,
    )!;

    const result = buildContextualRecipeRecommendations({
      current,
      recipes: recipes.map((projection) =>
        projection.recipe.id === unavailable.recipe.id
          ? { ...projection, recipe: { ...projection.recipe, lifecycle: 'archived' as const } }
          : projection,
      ),
      hiddenRecipeIds: [hiddenId],
      limit: 4,
    });

    expect(result.length).toBeLessThanOrEqual(4);
    expect(result.length).toBeGreaterThan(0);
    expect(result.map(({ projection }) => projection.recipe.id)).not.toContain(current.recipe.id);
    expect(result.map(({ projection }) => projection.recipe.id)).not.toContain(hiddenId);
    expect(result.map(({ projection }) => projection.recipe.id)).not.toContain(unavailable.recipe.id);
    expect(result.every(({ reason }) =>
      ['quicker', 'same_category', 'same_cuisine', 'similar_ingredients', 'editorial'].includes(reason.id),
    )).toBe(true);
  });

  it('excludes a personal edition of the open canonical Recipe', () => {
    const recipe = recipeContractFixture();
    const version = recipeVersionContractFixture();
    const current = {
      recipe: {
        ...recipe,
        id: 'canonical',
        lineage: [{
          id: 'canonical-lineage',
          relationship: 'fork' as const,
          sourceRecipeId: null,
          sourceRecipeVersionId: 'source-version',
          sourcePublicationId: 'publication-1',
        }],
      },
      currentVersion: { ...version, recipeId: 'canonical' },
    };
    const personalEdition = {
      recipe: {
        ...recipe,
        id: 'personal-edition',
        lineage: [{
          id: 'personal-lineage',
          relationship: 'adaptation' as const,
          sourceRecipeId: 'canonical',
          sourceRecipeVersionId: 'source-version',
          sourcePublicationId: 'publication-1',
        }],
      },
      currentVersion: { ...version, recipeId: 'personal-edition', prepMinutes: 5, cookMinutes: 5 },
    };

    expect(buildContextualRecipeRecommendations({
      current,
      recipes: [current, personalEdition],
      hiddenRecipeIds: [],
    })).toEqual([]);
  });
});
