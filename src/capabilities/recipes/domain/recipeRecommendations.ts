import type { RecipeProjection } from "../data/recipeCache";
import {
  getRecipeElapsedMinutes,
  getStarterRecipeMetadata,
} from "../data/starterRecipeCatalog";

export type RecipeRecommendationReason =
  | { id: "liked"; label: "You liked this"; icon: "heart" }
  | { id: "familiar"; label: "Familiar favorite"; icon: "sparkles" }
  | { id: "quick"; label: "Quick to make"; icon: "clock" }
  | { id: "quicker"; label: "Quicker tonight"; icon: "clock" }
  | { id: "same_category"; label: string; icon: "meal" }
  | { id: "same_cuisine"; label: string; icon: "meal" }
  | { id: "similar_ingredients"; label: "Uses similar ingredients"; icon: "layers" };

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
  favoriteRecipeIds: ReadonlySet<string> = new Set(),
): RecipeRecommendation[] {
  const safeLimit = Math.max(0, limit);
  const editorialLimit = Math.ceil(safeLimit / 2);
  const selectedIds = new Set<string>();
  const recommendations: RecipeRecommendation[] = [];

  for (const projection of recipes) {
    if (recommendations.length >= editorialLimit) break;
    if (!favoriteRecipeIds.has(projection.recipe.id)) continue;
    selectedIds.add(projection.recipe.id);
    recommendations.push({
      projection,
      reason: { id: "liked", label: "You liked this", icon: "heart" },
    });
  }

  for (const projection of recipes) {
    if (recommendations.length >= editorialLimit) break;
    if (selectedIds.has(projection.recipe.id)) continue;
    if (!getStarterRecipeMetadata(projection.recipe.id)?.featured) continue;
    selectedIds.add(projection.recipe.id);
    recommendations.push({
      projection,
      reason: { id: "familiar", label: "Familiar favorite", icon: "sparkles" },
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

function sourceIdentity(projection: RecipeProjection): {
  recipeIds: Set<string>;
  publicationIds: Set<string>;
} {
  const recipeIds = new Set<string>([projection.recipe.id]);
  const publicationIds = new Set<string>();
  for (const lineage of projection.recipe.lineage) {
    if (lineage.sourceRecipeId) recipeIds.add(lineage.sourceRecipeId);
    if (lineage.sourcePublicationId) publicationIds.add(lineage.sourcePublicationId);
  }
  return { recipeIds, publicationIds };
}

function isSameRecipeFamily(
  current: RecipeProjection,
  candidate: RecipeProjection,
): boolean {
  const currentSource = sourceIdentity(current);
  const candidateSource = sourceIdentity(candidate);
  if (
    [...currentSource.recipeIds].some((id) => candidateSource.recipeIds.has(id))
  ) {
    return true;
  }
  return [...currentSource.publicationIds].some((id) =>
    candidateSource.publicationIds.has(id),
  );
}

function ingredientConcepts(projection: RecipeProjection): Set<string> {
  return new Set(
    projection.currentVersion.ingredients
      .map((line) => line.ingredientConcept?.trim().toLowerCase() ?? "")
      .filter(Boolean),
  );
}

function contextualReason(
  current: RecipeProjection,
  candidate: RecipeProjection,
): RecipeRecommendationReason | null {
  const currentMinutes = minutesFor(current);
  const candidateMinutes = minutesFor(candidate);
  if (
    currentMinutes > 0 &&
    candidateMinutes > 0 &&
    candidateMinutes < currentMinutes
  ) {
    return { id: "quicker", label: "Quicker tonight", icon: "clock" };
  }

  const currentMetadata = getStarterRecipeMetadata(current.recipe.id);
  const candidateMetadata = getStarterRecipeMetadata(candidate.recipe.id);
  if (
    currentMetadata?.cuisine &&
    candidateMetadata?.cuisine === currentMetadata.cuisine
  ) {
    return {
      id: "same_cuisine",
      label: `Another ${currentMetadata.cuisine} Meal`,
      icon: "meal",
    };
  }
  if (
    currentMetadata?.category &&
    candidateMetadata?.category === currentMetadata.category
  ) {
    return {
      id: "same_category",
      label: `Another ${currentMetadata.category}`,
      icon: "meal",
    };
  }

  const currentIngredients = ingredientConcepts(current);
  const candidateIngredients = ingredientConcepts(candidate);
  let overlap = 0;
  for (const concept of currentIngredients) {
    if (candidateIngredients.has(concept)) overlap += 1;
  }
  if (overlap >= 2) {
    return {
      id: "similar_ingredients",
      label: "Uses similar ingredients",
      icon: "layers",
    };
  }

  if (candidateMetadata?.featured) {
    return { id: "familiar", label: "Familiar favorite", icon: "sparkles" };
  }
  return null;
}

export function buildContextualRecipeRecommendations({
  current,
  recipes,
  hiddenRecipeIds,
  limit = 6,
}: {
  current: RecipeProjection;
  recipes: readonly RecipeProjection[];
  hiddenRecipeIds: readonly string[];
  limit?: number;
}): RecipeRecommendation[] {
  const safeLimit = Math.max(0, limit);
  const hidden = new Set(hiddenRecipeIds);
  const selected = new Set<string>();
  const recommendations: RecipeRecommendation[] = [];

  for (const projection of recipes) {
    if (recommendations.length >= safeLimit) break;
    if (
      projection.recipe.lifecycle !== "active" ||
      hidden.has(projection.recipe.id) ||
      selected.has(projection.recipe.id) ||
      isSameRecipeFamily(current, projection)
    ) {
      continue;
    }
    const reason = contextualReason(current, projection);
    if (!reason) continue;
    selected.add(projection.recipe.id);
    recommendations.push({ projection, reason });
  }

  return recommendations;
}
