import type { RecipeProjection } from './recipeCache';
import { applyHostedCatalogMedia } from './catalogMediaOverlay';

export function resolveAvailableRecipe(
  personalRecipes: readonly RecipeProjection[],
  recipeId: string,
  starterRecipes: readonly RecipeProjection[],
): RecipeProjection | undefined {
  const projection = personalRecipes.find((item) => item.recipe.id === recipeId)
    ?? starterRecipes.find((item) => item.recipe.id === recipeId);
  return projection ? applyHostedCatalogMedia(projection) : undefined;
}
