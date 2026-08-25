import {
  buildContextualRecipeRecommendations,
  buildMealPlanIdeaRecommendations,
  buildRecipeRecommendations,
} from './recipeRecommendations';
import { buildRecipeLibraryInventory } from '../data/starterRecipeCatalog';
import { getStarterRecipeMetadata } from '../data/starterRecipeCatalog';
import { recipeContractFixture, recipeVersionContractFixture } from './recipeContractFixtures';

describe('recipe recommendations', () => {
  const mealContext = (recipeId: string) => {
    const category = getStarterRecipeMetadata(recipeId)?.category;
    if (category === 'Breakfast & brunch') return 'breakfast';
    if (category === 'Dinner' || category === 'Soups & stews') return 'dinner';
    if (category === 'Lunch & handhelds' || category === 'Salads & bowls') return 'lunch';
    return 'other';
  };

  it('uses only reasons that name the factor that materially affected ranking', () => {
    const recommendations = buildRecipeRecommendations(buildRecipeLibraryInventory([]), 6);

    expect(recommendations).toHaveLength(6);
    expect(recommendations.every(({ reason }) =>
      reason.id === 'quick' || reason.id === 'familiar',
    )).toBe(true);
    expect(recommendations.some(({ reason }) => reason.id === 'quick')).toBe(true);
    expect(recommendations.some(({ reason }) => reason.id === 'familiar')).toBe(true);
    expect(recommendations.some(({ reason }) => reason.label === 'Kwilt pick')).toBe(false);
  });

  it('keeps familiar household anchors first, caps the result, and does not duplicate recipes', () => {
    const recipes = buildRecipeLibraryInventory([]);
    const recommendations = buildRecipeRecommendations(recipes, 4);

    expect(recommendations).toHaveLength(4);
    expect(new Set(recommendations.map(({ projection }) => projection.recipe.id)).size).toBe(4);
    expect(recommendations[0]?.reason.id).toBe('familiar');
  });

  it('uses an actual liked state as the reason when it changes recommendation rank', () => {
    const recipes = buildRecipeLibraryInventory([]);
    const liked = recipes[20];
    const recommendations = buildRecipeRecommendations(
      recipes,
      4,
      new Set([liked.recipe.id]),
    );

    expect(recommendations[0]).toMatchObject({
      projection: { recipe: { id: liked.recipe.id } },
      reason: { id: 'liked', label: 'You liked this' },
    });
  });

  it('treats breakfast as passed at 9:00 and composes two dinner ideas for each lunch idea', () => {
    const recommendations = buildRecipeRecommendations(
      buildRecipeLibraryInventory([]),
      6,
      new Set(),
      { localHour: 9 },
    );

    expect(recommendations.map(({ projection }) => mealContext(projection.recipe.id)))
      .toEqual(['dinner', 'dinner', 'lunch', 'dinner', 'dinner', 'lunch']);
    expect(recommendations.some(({ projection }) =>
      mealContext(projection.recipe.id) === 'breakfast',
    )).toBe(false);
  });

  it('keeps breakfast eligible before the 9:00 cutoff', () => {
    const recommendations = buildRecipeRecommendations(
      buildRecipeLibraryInventory([]),
      3,
      new Set(),
      { localHour: 8 },
    );

    expect(mealContext(recommendations[0]!.projection.recipe.id)).toBe('breakfast');
  });

  it('reuses the Recommended pool for Plan ideas while excluding recipes already in Plan', () => {
    const recipes = buildRecipeLibraryInventory([]);
    const alreadyPlanned = recipes.slice(0, 2);
    const existingRecipeVersionIds = new Set(
      alreadyPlanned.map((projection) => projection.currentVersion.id),
    );
    const favoriteRecipeIds = new Set([recipes[0].recipe.id, recipes[20].recipe.id]);

    const recommendations = buildMealPlanIdeaRecommendations({
      recipes,
      favoriteRecipeIds,
      existingRecipeVersionIds,
      limit: 3,
      planningContext: { localHour: 9 },
    });

    expect(recommendations).toHaveLength(3);
    expect(recommendations.map(({ projection }) => projection.currentVersion.id))
      .not.toEqual(expect.arrayContaining([...existingRecipeVersionIds]));
    expect(recommendations).toEqual(buildRecipeRecommendations(
      recipes.filter((projection) => !existingRecipeVersionIds.has(projection.currentVersion.id)),
      3,
      favoriteRecipeIds,
      { localHour: 9 },
    ));
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
      ['quicker', 'same_category', 'same_cuisine', 'similar_ingredients', 'familiar'].includes(reason.id),
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
