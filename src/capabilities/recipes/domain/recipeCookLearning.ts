import type { RecipeVersion } from './recipeContracts';
import {
  RecipeCookContractError,
  parseRecipeCookSession,
  type RecipeCookRecord,
  type RecipeCookSession,
  type RecipeCookSubstitution,
} from './recipeCookContracts';

export type RecipeCookLearning = {
  record: RecipeCookRecord;
  recipeEditProposal: { id: string; recipeId: string; expectedRecipeVersionId: string; proposedNote: string; state: 'needs_review'; sourceCookSessionId: string } | null;
};

export type RecipeCookSubstitutionDraft = {
  ingredientLineId: string;
  usedInstead: string;
  resultRating: number | null;
  note: string;
};

export type RecipeCookLearningInput = {
  wouldMakeAgain: boolean | null;
  outcomeRating: number | null;
  note: string;
  destination: 'private_note' | 'recipe_edit_proposal';
  substitutions: RecipeCookSubstitutionDraft[];
};

function isRating(value: number | null): boolean {
  return value === null || (Number.isInteger(value) && value >= 1 && value <= 5);
}

function normalizeSubstitutions(
  version: RecipeVersion,
  drafts: readonly RecipeCookSubstitutionDraft[],
): RecipeCookSubstitution[] {
  const ingredients = new Map(version.ingredients.map((line) => [line.id, line]));
  const seen = new Set<string>();
  return drafts.map((draft) => {
    const ingredient = ingredients.get(draft.ingredientLineId);
    const usedInstead = draft.usedInstead.trim();
    const note = draft.note.trim();
    if (
      !ingredient ||
      seen.has(draft.ingredientLineId) ||
      !usedInstead ||
      usedInstead.length > 500 ||
      !isRating(draft.resultRating) ||
      note.length > 1000
    ) {
      throw new RecipeCookContractError(
        'recipe_cook.learning_invalid',
        'Each substitution needs one ingredient, what you used, and an optional 1–5 result rating.',
      );
    }
    seen.add(draft.ingredientLineId);
    return {
      ingredientLineId: ingredient.id,
      ingredientText: ingredient.originalText,
      usedInstead,
      resultRating: draft.resultRating,
      note: note || null,
    };
  });
}

export function buildRecipeCookLearning(
  sessionInput: RecipeCookSession,
  version: RecipeVersion,
  input: RecipeCookLearningInput,
): RecipeCookLearning {
  const session = parseRecipeCookSession(sessionInput);
  if (session.status !== 'completed' || !session.completedAt) throw new RecipeCookContractError('recipe_cook.not_completed', 'Finish cooking before saving a learning.');
  if (
    version.id !== session.recipeVersionId ||
    version.recipeId !== session.recipeId ||
    !isRating(input.outcomeRating)
  ) {
    throw new RecipeCookContractError(
      'recipe_cook.learning_invalid',
      'Cook learning must match the exact Recipe version and use a 1–5 outcome rating.',
    );
  }
  const note = input.note.trim();
  if (note.length > 4000) throw new RecipeCookContractError('recipe_cook.note_invalid', 'Cooking notes must be 4,000 characters or fewer.');
  const substitutions = normalizeSubstitutions(version, input.substitutions);
  return {
    record: {
      id: `cook-record:${session.id}`, sessionId: session.id, ownerPersonId: session.ownerPersonId, recipeId: session.recipeId,
      recipeVersionId: session.recipeVersionId, servingScale: session.recipeScaleMultiplier, completed: true, wouldMakeAgain: input.wouldMakeAgain,
      outcomeRating: input.outcomeRating, privateNote: input.destination === 'private_note' ? note || null : null,
      substitutions, completedAt: session.completedAt, provenance: 'cook_session',
    },
    recipeEditProposal: input.destination === 'recipe_edit_proposal' && note ? {
      id: `cook-edit:${session.id}`, recipeId: session.recipeId, expectedRecipeVersionId: session.recipeVersionId, proposedNote: note,
      state: 'needs_review', sourceCookSessionId: session.id,
    } : null,
  };
}
