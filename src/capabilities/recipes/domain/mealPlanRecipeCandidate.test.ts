import { recipeContractFixture, recipeVersionContractFixture } from './recipeContractFixtures';
import {
  buildMealPlanRecipeCandidate,
  mealPlanContainsRecipeVersion,
} from './mealPlanRecipeCandidate';

const projection = {
  recipe: recipeContractFixture(),
  currentVersion: recipeVersionContractFixture(),
};

describe('meal plan recipe candidates', () => {
  it('captures the exact recipe version and selected servings', () => {
    const candidate = buildMealPlanRecipeCandidate(projection, {
      candidateId: 'candidate-1',
      servings: 6,
    });

    expect(candidate).toMatchObject({
      id: 'candidate-1',
      kind: 'recipe',
      title: projection.currentVersion.title,
      recipeSnapshot: {
        recipeId: projection.recipe.id,
        recipeVersionId: projection.currentVersion.id,
        recipeVersion: projection.currentVersion.version,
        contentHash: projection.currentVersion.contentHash,
        ingredients: projection.currentVersion.ingredients.map((line) => ({
          id: line.id,
          originalText: line.originalText,
          optional: line.optional,
        })),
        selectedServings: 6,
      },
    });
  });

  it('matches the selected state by recipe version rather than title', () => {
    const candidate = buildMealPlanRecipeCandidate(projection, {
      candidateId: 'candidate-1',
      servings: 4,
    });

    expect(mealPlanContainsRecipeVersion([candidate], projection)).toBe(true);
    expect(mealPlanContainsRecipeVersion([
      { ...candidate, recipeSnapshot: { ...candidate.recipeSnapshot, recipeVersionId: 'another-version' } },
    ], projection)).toBe(false);
  });

  it('records diner assignment and unresolved alternatives without person labels', () => {
    const candidate = buildMealPlanRecipeCandidate(projection, {
      candidateId: 'candidate-1',
      servings: 2,
      dinerPersonIds: ['adult-a', 'adult-b'],
      excludedDinerPersonIds: ['child'],
      excludedDinerResolution: 'needs_alternative',
    });

    expect(candidate.recipeSnapshot).toMatchObject({
      dinerPersonIds: ['adult-a', 'adult-b'],
      excludedDinerPersonIds: ['child'],
      excludedDinerResolution: 'needs_alternative',
    });
    expect(JSON.stringify(candidate)).not.toContain('Avery');
  });
});
