import type { RecipeProjection } from './recipeCache';

export function resolveAvailableRecipe(
  personalRecipes: readonly RecipeProjection[],
  recipeId: string,
  starterRecipes: readonly RecipeProjection[],
): RecipeProjection | undefined {
  return personalRecipes.find((item) => item.recipe.id === recipeId)
    ?? starterRecipes.find((item) => item.recipe.id === recipeId);
}
