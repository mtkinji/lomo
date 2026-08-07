import type { RecipeProjection } from '../../recipes/data/recipeCache';
import { buildMealPlanRecipeCandidate } from '../../recipes/domain/mealPlanRecipeCandidate';
import type { MealPlanCandidateDraft } from '../data/mealPlanningRepository';
import type { MealPlanHorizon } from './mealPlanContracts';

export type EditorialMealPlanSeed = {
  kind: 'collection_selection' | 'meal_plan_template';
  sourceId: string;
  sourceVersion: number;
  sourceTitle: string;
  recipeIds: string[];
  horizon?: MealPlanHorizon;
};

export function buildEditorialMealPlanCandidates(input: {
  seed: EditorialMealPlanSeed;
  recipes: readonly RecipeProjection[];
  servings: number;
  createId(): string;
}): MealPlanCandidateDraft[] {
  const recipeById = new Map(input.recipes.map((projection) => [projection.recipe.id, projection]));
  const seenVersionIds = new Set<string>();
  return input.seed.recipeIds.flatMap((recipeId) => {
    const projection = recipeById.get(recipeId);
    if (!projection || seenVersionIds.has(projection.currentVersion.id)) return [];
    seenVersionIds.add(projection.currentVersion.id);
    const candidate = buildMealPlanRecipeCandidate(projection, {
      candidateId: input.createId(),
      servings: input.servings,
    });
    return [{
      ...candidate,
      recipeSnapshot: {
        ...candidate.recipeSnapshot,
        editorialOrigin: {
          kind: input.seed.kind,
          sourceId: input.seed.sourceId,
          sourceVersion: input.seed.sourceVersion,
        },
      },
    }];
  });
}

export function mergeEditorialMealPlanCandidates(
  current: readonly MealPlanCandidateDraft[],
  incoming: readonly MealPlanCandidateDraft[],
): MealPlanCandidateDraft[] {
  const versionIds = new Set(current.flatMap((candidate) => {
    const versionId = candidate.recipeSnapshot?.recipeVersionId;
    return typeof versionId === 'string' ? [versionId] : [];
  }));
  const merged = [...current];
  for (const candidate of incoming) {
    const versionId = candidate.recipeSnapshot?.recipeVersionId;
    if (typeof versionId === 'string' && versionIds.has(versionId)) continue;
    merged.push(candidate);
    if (typeof versionId === 'string') versionIds.add(versionId);
  }
  return merged;
}
