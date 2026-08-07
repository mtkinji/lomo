import { recipeVersionContractFixture } from './recipeContractFixtures';
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
});
