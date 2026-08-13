import { buildRecipeCookLearning } from './recipeCookLearning';
import { session } from './recipeCookContracts.test';
import { recipeVersionContractFixture } from './recipeContractFixtures';

function exactVersion() {
  const version = recipeVersionContractFixture();
  return {
    ...version,
    id: 'version-3',
    recipeId: 'recipe-1',
    version: 3,
    ingredients: version.ingredients.map((line) => ({
      ...line,
      recipeVersionId: 'version-3',
    })),
  };
}

describe('Recipe Cook learning', () => {
  it('stores private completion evidence without mutating a Recipe', () => {
    const learning = buildRecipeCookLearning(
      { ...session(), status: 'completed', completedAt: '2026-08-05T13:00:00.000Z' },
      exactVersion(),
      {
        wouldMakeAgain: true,
        outcomeRating: 4,
        note: 'More sauce',
        destination: 'private_note',
        substitutions: [{
          ingredientLineId: 'ingredient-1',
          usedInstead: 'oat flour',
          resultRating: 3,
          note: 'Needed more liquid',
        }],
      },
    );
    expect(learning.record).toMatchObject({
      recipeVersionId: 'version-3',
      wouldMakeAgain: true,
      outcomeRating: 4,
      privateNote: 'More sauce',
      provenance: 'cook_session',
      substitutions: [{
        ingredientLineId: 'ingredient-1',
        ingredientText: '1 1/2 cups flour, sifted',
        usedInstead: 'oat flour',
        resultRating: 3,
        note: 'Needed more liquid',
      }],
    });
    expect(learning.recipeEditProposal).toBeNull();
  });

  it('creates a review-only Recipe edit proposal when explicitly selected', () => {
    const learning = buildRecipeCookLearning(
      { ...session(), status: 'completed', completedAt: '2026-08-05T13:00:00.000Z' },
      exactVersion(),
      { wouldMakeAgain: null, outcomeRating: null, note: 'Double the sauce', destination: 'recipe_edit_proposal', substitutions: [] },
    );
    expect(learning.record.privateNote).toBeNull();
    expect(learning.recipeEditProposal).toMatchObject({ recipeId: 'recipe-1', expectedRecipeVersionId: 'version-3', state: 'needs_review', proposedNote: 'Double the sauce' });
  });

  it.each([
    { label: 'overall rating', input: { outcomeRating: 6 } },
    { label: 'replacement text', input: { substitutions: [{ ingredientLineId: 'ingredient-1', usedInstead: '   ', resultRating: null, note: '' }] } },
    { label: 'ingredient identity', input: { substitutions: [{ ingredientLineId: 'ingredient-missing', usedInstead: 'oat flour', resultRating: null, note: '' }] } },
    { label: 'substitution rating', input: { substitutions: [{ ingredientLineId: 'ingredient-1', usedInstead: 'oat flour', resultRating: 0, note: '' }] } },
    { label: 'substitution note', input: { substitutions: [{ ingredientLineId: 'ingredient-1', usedInstead: 'oat flour', resultRating: null, note: 'x'.repeat(1001) }] } },
    { label: 'duplicate ingredient', input: { substitutions: [
      { ingredientLineId: 'ingredient-1', usedInstead: 'oat flour', resultRating: null, note: '' },
      { ingredientLineId: 'ingredient-1', usedInstead: 'rice flour', resultRating: null, note: '' },
    ] } },
  ])('rejects invalid $label evidence', ({ input }) => {
    expect(() => buildRecipeCookLearning(
      { ...session(), status: 'completed', completedAt: '2026-08-05T13:00:00.000Z' },
      exactVersion(),
      {
        wouldMakeAgain: null,
        outcomeRating: null,
        note: '',
        destination: 'private_note',
        substitutions: [],
        ...input,
      },
    )).toThrow(expect.objectContaining({ code: 'recipe_cook.learning_invalid' }));
  });
});
