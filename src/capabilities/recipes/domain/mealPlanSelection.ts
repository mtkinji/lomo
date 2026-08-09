import type { MealPlanCandidateDraft } from '../../meal-planning/data/mealPlanningRepository';
import type { SharedMealCartProjection } from '../../meal-planning/domain/sharedMealCart';
import type { RecipeProjection } from '../data/recipeCache';
import { buildMealPlanRecipeCandidate } from './mealPlanRecipeCandidate';

type SharedCartSelectionRepository = {
  addSharedCandidate(householdId: string, candidate: MealPlanCandidateDraft): Promise<unknown> | unknown;
  withdrawSharedCandidate(candidateId: string): Promise<unknown> | unknown;
};

export function sharedMealCartContainsRecipeVersion(
  cart: SharedMealCartProjection,
  projection: RecipeProjection,
): boolean {
  return cart.candidates.some((candidate) => candidate.selected
    && candidate.kind === 'recipe'
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
  householdId: string;
  projection: RecipeProjection;
  servings: number;
  candidateId: string;
  repository: SharedCartSelectionRepository;
  reloadCart(): Promise<SharedMealCartProjection>;
}): Promise<{ cart: SharedMealCartProjection; selected: boolean }> {
  const existing = cart?.candidates.find((candidate) => candidate.selected
    && candidate.kind === 'recipe'
    && candidate.recipeSnapshot?.recipeVersionId === projection.currentVersion.id);
  if (existing) {
    if (!existing.canWithdraw) throw new Error('Only the contributor or Plan organizer can remove this meal.');
    await repository.withdrawSharedCandidate(existing.id);
    return { cart: await reloadCart(), selected: false };
  }
  await repository.addSharedCandidate(
    householdId,
    buildMealPlanRecipeCandidate(projection, { candidateId, servings }),
  );
  return { cart: await reloadCart(), selected: true };
}

export async function removeCandidateFromSharedMealCart({
  candidateId,
  repository,
  reloadCart,
}: {
  candidateId: string;
  repository: Pick<SharedCartSelectionRepository, 'withdrawSharedCandidate'>;
  reloadCart(): Promise<SharedMealCartProjection>;
}): Promise<SharedMealCartProjection> {
  await repository.withdrawSharedCandidate(candidateId);
  return reloadCart();
}
