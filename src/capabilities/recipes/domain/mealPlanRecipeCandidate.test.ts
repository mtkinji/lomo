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
  it('captures the exact recipe version, recipe size, and planned portions independently', () => {
    const candidate = buildMealPlanRecipeCandidate(projection, {
      candidateId: 'candidate-1',
      recipeScaleMultiplier: 2,
      plannedPortions: 6,
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
        recipeScaleMultiplier: 2,
        plannedPortions: 6,
        selectedServings: 6,
      },
    });
  });

  it('matches the selected state by recipe version rather than title', () => {
    const candidate = buildMealPlanRecipeCandidate(projection, {
      candidateId: 'candidate-1',
      recipeScaleMultiplier: 1,
      plannedPortions: 4,
    });

    expect(mealPlanContainsRecipeVersion([candidate], projection)).toBe(true);
    expect(mealPlanContainsRecipeVersion([
      { ...candidate, recipeSnapshot: { ...candidate.recipeSnapshot, recipeVersionId: 'another-version' } },
    ], projection)).toBe(false);
  });

  it('records diner assignment and unresolved alternatives without person labels', () => {
    const candidate = buildMealPlanRecipeCandidate(projection, {
      candidateId: 'candidate-1',
      recipeScaleMultiplier: 3,
      plannedPortions: 2,
      dinerPersonIds: ['adult-a', 'adult-b'],
      excludedDinerPersonIds: ['child'],
      excludedDinerResolution: 'needs_alternative',
    });

    expect(candidate.recipeSnapshot).toMatchObject({
      recipeScaleMultiplier: 3,
      plannedPortions: 2,
      dinerPersonIds: ['adult-a', 'adult-b'],
      excludedDinerPersonIds: ['child'],
      excludedDinerResolution: 'needs_alternative',
    });
    expect(JSON.stringify(candidate)).not.toContain('Avery');
  });

  it('carries specialized equipment evidence into the immutable plan snapshot', () => {
    const candidate = buildMealPlanRecipeCandidate({
      ...projection,
      currentVersion: {
        ...projection.currentVersion,
        instructions: [{
          ...projection.currentVersion.instructions[0],
          text: 'Blend until smooth with an immersion blender.',
        }],
      },
    }, {
      candidateId: 'candidate-equipment',
      recipeScaleMultiplier: 1,
      plannedPortions: 4,
    });

    expect(candidate.recipeSnapshot.equipmentSuggestions).toEqual([
      expect.objectContaining({
        id: 'immersion-blender',
        label: 'Immersion blender',
        searchQuery: 'immersion blender',
        necessity: 'required',
        confidence: 1,
        evidenceText: 'Blend until smooth with an immersion blender.',
        substitute: null,
      }),
    ]);
  });

  it('prefers reviewed equipment evidence persisted with the recipe version', () => {
    const candidate = buildMealPlanRecipeCandidate({
      ...projection,
      currentVersion: {
        ...projection.currentVersion,
        equipmentRequirements: [{
          id: 'spiralizer',
          label: 'Spiralizer',
          searchQuery: 'vegetable spiralizer',
          necessity: 'required',
          confidence: 0.94,
          evidenceText: 'Cut the zucchini with a spiralizer.',
          substitute: null,
        }],
        instructions: [{
          ...projection.currentVersion.instructions[0],
          text: 'Cut the zucchini with a spiralizer, then blend the sauce with an immersion blender.',
        }],
      },
    }, { candidateId: 'candidate-model-equipment', recipeScaleMultiplier: 1, plannedPortions: 4 });

    expect(candidate.recipeSnapshot.equipmentSuggestions).toEqual([
      expect.objectContaining({ id: 'spiralizer', confidence: 0.94 }),
    ]);
  });
});
