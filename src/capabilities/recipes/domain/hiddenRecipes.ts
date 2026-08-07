import type { RecipeProjection } from '../data/recipeCache';

export function canHideRecipe(projection: RecipeProjection): boolean {
  return projection.recipe.provenance.method === 'catalog';
}

export function excludeHiddenRecipes(
  recipes: readonly RecipeProjection[],
  hiddenRecipeIds: readonly string[],
): RecipeProjection[] {
  if (!hiddenRecipeIds.length) return [...recipes];
  const hidden = new Set(hiddenRecipeIds);
  return recipes.filter((projection) => !hidden.has(projection.recipe.id));
}
