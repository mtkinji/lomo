import type { RecipeProjection } from "../data/recipeCache";
import {
  getRecipeElapsedMinutes,
  getStarterRecipeMetadata,
} from "../data/starterRecipeCatalog";

export type RecipeRecommendationReason =
  | { id: "editorial"; label: "Kwilt pick"; icon: "sparkles" }
  | { id: "quick"; label: "Quick to make"; icon: "clock" };

export type RecipeRecommendation = {
  projection: RecipeProjection;
  reason: RecipeRecommendationReason;
};

function minutesFor(projection: RecipeProjection): number {
  return getRecipeElapsedMinutes(projection);
}

export function buildRecipeRecommendations(
  recipes: readonly RecipeProjection[],
  limit = 6,
): RecipeRecommendation[] {
  const safeLimit = Math.max(0, limit);
  const editorialLimit = Math.ceil(safeLimit / 2);
  const selectedIds = new Set<string>();
  const recommendations: RecipeRecommendation[] = [];

  for (const projection of recipes) {
    if (recommendations.length >= editorialLimit) break;
    if (!getStarterRecipeMetadata(projection.recipe.id)?.featured) continue;
    selectedIds.add(projection.recipe.id);
    recommendations.push({
      projection,
      reason: { id: "editorial", label: "Kwilt pick", icon: "sparkles" },
    });
  }

  for (const projection of recipes) {
    if (recommendations.length >= safeLimit) break;
    const minutes = minutesFor(projection);
    if (selectedIds.has(projection.recipe.id) || minutes <= 0 || minutes > 30)
      continue;
    selectedIds.add(projection.recipe.id);
    recommendations.push({
      projection,
      reason: { id: "quick", label: "Quick to make", icon: "clock" },
    });
  }

  return recommendations;
}
