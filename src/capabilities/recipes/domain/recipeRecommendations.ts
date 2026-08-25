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

export type RecipeRecommendationPlanningContext = {
  localHour: number;
};

type RecipeMealContext = "breakfast" | "lunch" | "dinner" | "other";

function minutesFor(projection: RecipeProjection): number {
  return getRecipeElapsedMinutes(projection);
}

export function buildRecipeRecommendations(
  recipes: readonly RecipeProjection[],
  limit = 6,
  favoriteRecipeIds: ReadonlySet<string> = new Set(),
  planningContext?: RecipeRecommendationPlanningContext,
): RecipeRecommendation[] {
  const safeLimit = Math.max(0, limit);
  if (planningContext) {
    return composeRecommendationsForPlanningContext(
      buildRecommendationCandidatePool(recipes, favoriteRecipeIds),
      safeLimit,
      planningContext,
    );
  }
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

function buildRecommendationCandidatePool(
  recipes: readonly RecipeProjection[],
  favoriteRecipeIds: ReadonlySet<string>,
): RecipeRecommendation[] {
  const selectedIds = new Set<string>();
  const candidates: RecipeRecommendation[] = [];
  const add = (
    projection: RecipeProjection,
    reason: RecipeRecommendationReason,
  ) => {
    if (selectedIds.has(projection.recipe.id)) return;
    selectedIds.add(projection.recipe.id);
    candidates.push({ projection, reason });
  };

  for (const projection of recipes) {
    if (favoriteRecipeIds.has(projection.recipe.id)) {
      add(projection, { id: "liked", label: "You liked this", icon: "heart" });
    }
  }
  for (const projection of recipes) {
    if (getStarterRecipeMetadata(projection.recipe.id)?.featured) {
      add(projection, {
        id: "familiar",
        label: "Familiar favorite",
        icon: "sparkles",
      });
    }
  }
  for (const projection of recipes) {
    const minutes = minutesFor(projection);
    if (minutes > 0 && minutes <= 30) {
      add(projection, { id: "quick", label: "Quick to make", icon: "clock" });
    }
  }
  return candidates;
}

function mealContextFor(projection: RecipeProjection): RecipeMealContext {
  switch (getStarterRecipeMetadata(projection.recipe.id)?.category) {
    case "Breakfast & brunch":
      return "breakfast";
    case "Lunch & handhelds":
    case "Salads & bowls":
      return "lunch";
    case "Dinner":
    case "Soups & stews":
      return "dinner";
    default:
      return "other";
  }
}

function composeRecommendationsForPlanningContext(
  candidates: readonly RecipeRecommendation[],
  limit: number,
  context: RecipeRecommendationPlanningContext,
): RecipeRecommendation[] {
  const breakfastIsRelevant = context.localHour >= 0 && context.localHour < 9;
  const eligible = candidates.filter(
    (candidate) => breakfastIsRelevant || mealContextFor(candidate.projection) !== "breakfast",
  );
  const slots: readonly RecipeMealContext[] = breakfastIsRelevant
    ? ["breakfast", "dinner", "lunch", "dinner", "dinner", "lunch"]
    : ["dinner", "dinner", "lunch"];
  const selected = new Set<string>();
  const recommendations: RecipeRecommendation[] = [];

  for (let index = 0; index < limit; index += 1) {
    const desired = slots[index % slots.length];
    const candidate = eligible.find(
      (item) =>
        !selected.has(item.projection.recipe.id) &&
        mealContextFor(item.projection) === desired,
    ) ?? eligible.find((item) => !selected.has(item.projection.recipe.id));
    if (!candidate) break;
    selected.add(candidate.projection.recipe.id);
    recommendations.push(candidate);
  }
  return recommendations;
}

export function buildRecipeRecommendationPlanningContext(
  moment: Date = new Date(),
): RecipeRecommendationPlanningContext {
  return { localHour: moment.getHours() };
}

export function buildMealPlanIdeaRecommendations({
  recipes,
  favoriteRecipeIds,
  existingRecipeVersionIds,
  limit = 3,
  planningContext,
}: {
  recipes: readonly RecipeProjection[];
  favoriteRecipeIds: ReadonlySet<string>;
  existingRecipeVersionIds: ReadonlySet<string>;
  limit?: number;
  planningContext?: RecipeRecommendationPlanningContext;
}): RecipeRecommendation[] {
  return buildRecipeRecommendations(
    recipes.filter(
      (projection) => !existingRecipeVersionIds.has(projection.currentVersion.id),
    ),
    limit,
    favoriteRecipeIds,
    planningContext,
  );
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
