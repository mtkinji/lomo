import { recipeContractFixture, recipeVersionContractFixture } from './recipeContractFixtures';
import { buildRecipeCookCues } from './recipeCookCueBuilder';

describe('Recipe Cook cue builder', () => {
  it('derives ordered cues and omits low-confidence ingredient quantities', () => {
    const recipe = recipeVersionContractFixture();
    recipe.instructions = [
      { ...recipe.instructions[0], text: 'Fold in the flour, then bake for 20 minutes.' },
      { ...recipe.instructions[1], text: 'Dust with powdered sugar.' },
    ];
    recipe.ingredients[2].parseConfidence = 0.4;
    const cues = buildRecipeCookCues(recipe, { servings: 4 });
    expect(cues[0]).toMatchObject({ instructionId: 'step-1', timerSuggestions: [{ durationSeconds: 1200, label: 'Bake' }] });
    expect(cues[0].ingredientReferences[0]).toMatchObject({ ingredientLineId: 'ingredient-1', displayAmount: '¾ cup' });
    expect(cues[1].ingredientReferences[0]).toMatchObject({ ingredientLineId: 'ingredient-3', displayAmount: null });
  });

  it('separates an observable readiness cue from the action', () => {
    const recipe = recipeVersionContractFixture();
    recipe.instructions = [{
      ...recipe.instructions[0],
      text: 'Heat a griddle or wide skillet over medium heat; it is ready when a drop of water skitters before evaporating.',
    }];

    expect(buildRecipeCookCues(recipe, { servings: 4 })[0]).toMatchObject({
      actionText: 'Heat a griddle or wide skillet over medium heat.',
      supportingCue: {
        kind: 'ready_when',
        text: 'A drop of water skitters before evaporating.',
      },
    });
  });

  it('keeps ambiguous semicolon clauses together', () => {
    const recipe = recipeVersionContractFixture();
    recipe.instructions = [{
      ...recipe.instructions[0],
      text: 'Whisk the eggs; add the flour in three batches.',
    }];

    expect(buildRecipeCookCues(recipe, { servings: 4 })[0]).toMatchObject({
      actionText: 'Whisk the eggs; add the flour in three batches.',
      supportingCue: null,
    });
  });

  it('includes only media explicitly linked to the current step', () => {
    const recipe = recipeVersionContractFixture();
    const media = {
      ...recipeContractFixture().mediaAssets[0],
      storageRef: 'https://example.com/griddle-ready.jpg',
    };
    recipe.instructions = [
      { ...recipe.instructions[0], mediaAssetIds: [media.id] },
      { ...recipe.instructions[1], mediaAssetIds: [] },
    ];

    const cues = buildRecipeCookCues(recipe, { servings: 4, mediaAssets: [media] });

    expect(cues[0].media).toEqual({
      assetId: media.id,
      storageRef: media.storageRef,
      mediaType: media.mediaType,
      altText: media.altText,
    });
    expect(cues[1].media).toBeNull();
  });

  it('omits missing, deleted, and unsupported step media without a placeholder', () => {
    const recipe = recipeVersionContractFixture();
    const media = recipeContractFixture().mediaAssets[0];
    recipe.instructions = [{ ...recipe.instructions[0], mediaAssetIds: [media.id] }];

    expect(buildRecipeCookCues(recipe, { servings: 4 }).at(0)?.media).toBeNull();
    expect(buildRecipeCookCues(recipe, {
      servings: 4,
      mediaAssets: [{ ...media, lifecycle: 'deleted' }],
    }).at(0)?.media).toBeNull();
    expect(buildRecipeCookCues(recipe, {
      servings: 4,
      mediaAssets: [{ ...media, mediaType: 'application/pdf' }],
    }).at(0)?.media).toBeNull();
    expect(buildRecipeCookCues(recipe, {
      servings: 4,
      mediaAssets: [{ ...media, storageRef: 'recipe-media/person/step.jpg' }],
    }).at(0)?.media).toBeNull();
  });
});
