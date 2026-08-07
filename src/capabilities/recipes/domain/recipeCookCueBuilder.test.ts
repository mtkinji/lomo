import { recipeContractFixture, recipeVersionContractFixture } from './recipeContractFixtures';
import { buildRecipeCookCues } from './recipeCookCueBuilder';
import { compileEditorialRecipeProjection } from '../data/compileEditorialRecipe';
import { STARTER_RECIPE_BATCH_001 } from '../data/starterRecipeBatch001';
import { STARTER_RECIPE_BATCH_017 } from '../data/starterRecipeBatch017';

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

  it('flattens shared phases into atomic Cook cues with phase context', () => {
    const recipe = compileEditorialRecipeProjection(
      STARTER_RECIPE_BATCH_001[0],
    ).currentVersion;

    const cues = buildRecipeCookCues(recipe, { servings: 6 });
    const dryMixingCue = cues[1];
    const wetMixingCue = cues[2];

    expect(dryMixingCue).toMatchObject({
      instructionId: recipe.instructions[1].id,
      phasePosition: 1,
      phaseCount: 5,
      cuePositionInPhase: 0,
      cueCountInPhase: 2,
      displayText: 'Whisk flour, sugar, baking powder, baking soda, and salt in a large bowl.',
    });
    expect(wetMixingCue).toMatchObject({
      instructionId: recipe.instructions[1].id,
      phasePosition: 1,
      phaseCount: 5,
      cuePositionInPhase: 1,
      cueCountInPhase: 2,
      displayText: 'Whisk buttermilk, eggs, and melted butter in a second bowl.',
    });
    expect(dryMixingCue.ingredientReferences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ concept: 'all-purpose flour', displayAmount: '3 cups' }),
        expect.objectContaining({ concept: 'granulated sugar', displayAmount: '3 tablespoons' }),
        expect.objectContaining({ concept: 'baking powder', displayAmount: '1 ½ teaspoons' }),
        expect.objectContaining({ concept: 'baking soda', displayAmount: '1 ½ teaspoons' }),
        expect.objectContaining({ concept: 'Diamond Crystal kosher salt', displayAmount: '1 ½ teaspoons' }),
      ]),
    );
    expect(wetMixingCue.ingredientReferences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ concept: 'well-shaken buttermilk', displayAmount: '3 cups' }),
        expect.objectContaining({ concept: 'large eggs', displayAmount: '3' }),
        expect.objectContaining({ concept: 'unsalted butter', displayAmount: '6 tablespoons' }),
      ]),
    );
    expect(dryMixingCue.accessibilityLabel).toContain(
      'Phase 2 of 5. Action 1 of 2.',
    );
    expect(dryMixingCue.accessibilityLabel).toContain('For this action. 3 cups all-purpose flour.');
  });

  it('does not confuse a specifically named ingredient with a later ingredient that shares its last word', () => {
    const paneerWrap = STARTER_RECIPE_BATCH_017.find(
      (recipe) => recipe.title === 'Paneer tikka wrap',
    )!;
    const firstPhaseCues = buildRecipeCookCues(
      compileEditorialRecipeProjection(paneerWrap).currentVersion,
      { servings: paneerWrap.yieldQuantity },
    ).filter((cue) => cue.phasePosition === 0);
    const concepts = firstPhaseCues.flatMap((cue) =>
      cue.ingredientReferences.map((item) => item.concept),
    );

    expect(concepts).toEqual(expect.arrayContaining([
      'chickpea flour',
      'Kashmiri chile powder',
      'medium yellow onion',
    ]));
    expect(concepts).not.toEqual(expect.arrayContaining([
      'atta or whole-wheat flour',
      'packed cup cilantro leaves and tender stems',
      'small green chile',
      'small red onion',
    ]));
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
