import {
  isRecipeScaleMultiplier,
  type RecipeScaleMultiplier,
} from './recipeScaling';

export function resolveRecipeSnapshotMultiplier(snapshot: Record<string, unknown>): {
  multiplier: RecipeScaleMultiplier;
  reviewRequired: boolean;
} {
  if (isRecipeScaleMultiplier(Number(snapshot.recipeScaleMultiplier))) {
    return {
      multiplier: Number(snapshot.recipeScaleMultiplier) as RecipeScaleMultiplier,
      reviewRequired: false,
    };
  }

  const yieldQuantity = Number(snapshot.yieldQuantity);
  const selectedPortions = Number(snapshot.selectedServings);
  const ratio = selectedPortions / yieldQuantity;
  if (snapshot.yieldUnit === 'servings' && isRecipeScaleMultiplier(ratio)) {
    return { multiplier: ratio, reviewRequired: false };
  }

  return {
    multiplier: 1,
    reviewRequired: snapshot.selectedServings !== undefined,
  };
}
