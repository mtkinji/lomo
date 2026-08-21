import type { MealPlanCandidateDraft } from '../../meal-planning/data/mealPlanningRepository';
import type { SharedMealCartProjection } from '../../meal-planning/domain/sharedMealCart';
import type { RecipeProjection } from '../data/recipeCache';
import { buildMealPlanRecipeCandidate } from './mealPlanRecipeCandidate';

type SharedCartSelectionRepository = {
  addMealCandidate(householdId: string | null, candidate: MealPlanCandidateDraft): Promise<unknown> | unknown;
  withdrawMealCandidate(householdId: string | null, candidateId: string): Promise<unknown> | unknown;
};

export function sharedMealCartContainsRecipeVersion(
  cart: SharedMealCartProjection,
  projection: RecipeProjection,
): boolean {
  return cart.candidates.some((candidate) => candidate.kind === 'recipe'
    && candidate.recipeSnapshot?.recipeVersionId === projection.currentVersion.id);
}

export async function toggleRecipeInSharedMealCart({
  cart,
  householdId,
  projection,
  servings,
  candidateId,
  repository,
  reloadCart,
}: {
  cart: SharedMealCartProjection | null;
  householdId: string | null;
  projection: RecipeProjection;
  servings: number;
  candidateId: string;
  repository: SharedCartSelectionRepository;
  reloadCart(): Promise<SharedMealCartProjection>;
}): Promise<{ cart: SharedMealCartProjection; selected: boolean }> {
  const existing = cart?.candidates.find((candidate) => candidate.kind === 'recipe'
    && candidate.recipeSnapshot?.recipeVersionId === projection.currentVersion.id);
  if (existing) {
    if (existing.lifecycle !== 'idea') throw new Error('Open Plan to remove a recipe that has been sent to Groceries.');
    if (!existing.canRemove) throw new Error('An adult can remove this recipe from Plan.');
    await repository.withdrawMealCandidate(householdId, existing.id);
    return { cart: await reloadCart(), selected: false };
  }
  await repository.addMealCandidate(
    householdId,
    buildMealPlanRecipeCandidate(projection, { candidateId, servings }),
  );
  return { cart: await reloadCart(), selected: true };
}

export async function removeCandidateFromSharedMealCart({
  candidateId,
  householdId,
  repository,
  reloadCart,
}: {
  candidateId: string;
  householdId: string | null;
  repository: Pick<SharedCartSelectionRepository, 'withdrawMealCandidate'>;
  reloadCart(): Promise<SharedMealCartProjection>;
}): Promise<SharedMealCartProjection> {
  await repository.withdrawMealCandidate(householdId, candidateId);
  return reloadCart();
}
