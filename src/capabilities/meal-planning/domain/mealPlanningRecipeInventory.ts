import type { RecipeProjection } from '../../recipes/data/recipeCache';
import { buildRecipeLibraryInventory } from '../../recipes/data/starterRecipeCatalog';

export function buildMealPlanningRecipeInventory(personalRecipes: RecipeProjection[]): RecipeProjection[] {
  return buildRecipeLibraryInventory(personalRecipes);
}

export function orderMealPlanningRecipeInventory(
  recipes: RecipeProjection[],
  rankedRecipeIds: string[],
): RecipeProjection[] {
  const rank = new Map(rankedRecipeIds.map((recipeId, index) => [recipeId, index]));
  return recipes
    .map((recipe, originalIndex) => ({ recipe, originalIndex }))
    .sort((left, right) => {
      const leftRank = rank.get(left.recipe.recipe.id);
      const rightRank = rank.get(right.recipe.recipe.id);
      if (leftRank !== undefined || rightRank !== undefined) {
        if (leftRank === undefined) return 1;
        if (rightRank === undefined) return -1;
        return leftRank - rightRank;
      }
      return left.originalIndex - right.originalIndex;
    })
    .map(({ recipe }) => recipe);
}
