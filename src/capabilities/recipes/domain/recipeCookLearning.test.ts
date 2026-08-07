import { buildRecipeCookLearning } from './recipeCookLearning';
import { session } from './recipeCookContracts.test';

describe('Recipe Cook learning', () => {
  it('stores private completion evidence without mutating a Recipe', () => {
    const learning = buildRecipeCookLearning({ ...session(), status: 'completed', completedAt: '2026-08-05T13:00:00.000Z' }, { wouldMakeAgain: true, note: 'More sauce', destination: 'private_note' });
    expect(learning.record).toMatchObject({ recipeVersionId: 'version-3', wouldMakeAgain: true, privateNote: 'More sauce', provenance: 'cook_session' });
    expect(learning.recipeEditProposal).toBeNull();
  });

  it('creates a review-only Recipe edit proposal when explicitly selected', () => {
    const learning = buildRecipeCookLearning({ ...session(), status: 'completed', completedAt: '2026-08-05T13:00:00.000Z' }, { wouldMakeAgain: null, note: 'Double the sauce', destination: 'recipe_edit_proposal' });
    expect(learning.record.privateNote).toBeNull();
    expect(learning.recipeEditProposal).toMatchObject({ recipeId: 'recipe-1', expectedRecipeVersionId: 'version-3', state: 'needs_review', proposedNote: 'Double the sauce' });
  });
});
