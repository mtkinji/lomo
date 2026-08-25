import type {
  RecipeIngredientLine,
  RecipeScalingState,
} from './recipeContracts';

export function assessRecipeScaleability(
  lines: readonly RecipeIngredientLine[],
  state: RecipeScalingState,
): { available: boolean; blockers: string[] } {
  if (state !== 'verified') {
    return { available: false, blockers: [`recipe_scaling_${state}`] };
  }
  const blockers = lines
    .filter((line) => line.scaleRule.kind === 'review_required')
    .map((line) => line.id);
  return { available: blockers.length === 0, blockers };
}
