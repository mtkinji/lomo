import { RecipeCookContractError, parseRecipeCookSession, type RecipeCookRecord, type RecipeCookSession } from './recipeCookContracts';

export type RecipeCookLearning = {
  record: RecipeCookRecord;
  recipeEditProposal: { id: string; recipeId: string; expectedRecipeVersionId: string; proposedNote: string; state: 'needs_review'; sourceCookSessionId: string } | null;
};

export function buildRecipeCookLearning(sessionInput: RecipeCookSession, input: { wouldMakeAgain: boolean | null; note: string; destination: 'private_note' | 'recipe_edit_proposal' }): RecipeCookLearning {
  const session = parseRecipeCookSession(sessionInput);
  if (session.status !== 'completed' || !session.completedAt) throw new RecipeCookContractError('recipe_cook.not_completed', 'Finish cooking before saving a learning.');
  const note = input.note.trim();
  if (note.length > 4000) throw new RecipeCookContractError('recipe_cook.note_invalid', 'Cooking notes must be 4,000 characters or fewer.');
  return {
    record: {
      id: `cook-record:${session.id}`, sessionId: session.id, ownerPersonId: session.ownerPersonId, recipeId: session.recipeId,
      recipeVersionId: session.recipeVersionId, servingScale: session.servingScale, completed: true, wouldMakeAgain: input.wouldMakeAgain,
      privateNote: input.destination === 'private_note' ? note || null : null, completedAt: session.completedAt, provenance: 'cook_session',
    },
    recipeEditProposal: input.destination === 'recipe_edit_proposal' && note ? {
      id: `cook-edit:${session.id}`, recipeId: session.recipeId, expectedRecipeVersionId: session.recipeVersionId, proposedNote: note,
      state: 'needs_review', sourceCookSessionId: session.id,
    } : null,
  };
}
