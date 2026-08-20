import type { SpecializedRecipeEquipment } from './recipeEquipment';
import { deriveSpecializedRecipeEquipment } from './recipeEquipment';
import {
  parseRecipeCommerceCatalog,
  RECIPE_COMMERCE_CATALOG,
  resolvePublishedEquipmentReview,
} from './recipeCommerceCatalog';

export type RecipeEditorialPickThumbnail = 'food-processor';

export type RecipeEditorialPick = {
  id: string;
  equipmentId: string;
  productId: string;
  retailerListingId: string;
  retailerExternalProductId: string;
  title: string;
  rationale: string;
  tradeoff: string;
  substituteSummary: string;
  recipeCount: number;
  thumbnailAsset: RecipeEditorialPickThumbnail;
  thumbnailUrl?: string | null;
};

const COMMERCE_CATALOG = parseRecipeCommerceCatalog(RECIPE_COMMERCE_CATALOG);
const PRODUCT_PRESENTATION_BY_ID: Readonly<Record<string, {
  thumbnailAsset: RecipeEditorialPickThumbnail;
  thumbnailUrl: string | null;
}>> = {
  'kitchenaid-7-cup-food-processor': {
    thumbnailAsset: 'food-processor',
    thumbnailUrl: null,
  },
};

function requiredCupCapacity(requirement: SpecializedRecipeEquipment): number | null {
  const match = /\b(\d+(?:\.\d+)?)\s*[- ]?cups?\b/i.exec(
    `${requirement.label} ${requirement.searchQuery}`,
  );
  if (!match) return null;
  const capacity = Number(match[1]);
  return Number.isFinite(capacity) && capacity > 0 ? capacity : null;
}

export function resolveRecipeEditorialPicks(input: {
  equipmentRequirements: readonly SpecializedRecipeEquipment[];
  instructions: readonly string[];
  equipmentUsageCounts?: Readonly<Record<string, number>>;
  asOf?: string;
}): RecipeEditorialPick[] {
  const requirements = input.equipmentRequirements.length
    ? input.equipmentRequirements
    : deriveSpecializedRecipeEquipment(input.instructions);
  const seen = new Set<string>();

  return requirements.flatMap((requirement) => {
    if (
      requirement.necessity !== 'required'
      || requirement.substitute
      || requirement.confidence < 0.8
    ) return [];

    const review = resolvePublishedEquipmentReview(
      COMMERCE_CATALOG,
      requirement.id,
      input.asOf ?? new Date().toISOString().slice(0, 10),
    );
    const reviewedPick = review?.picks.find(({ role }) => role === 'lead');
    const presentation = reviewedPick
      ? PRODUCT_PRESENTATION_BY_ID[reviewedPick.product.id]
      : null;
    if (!review || !reviewedPick || !presentation || seen.has(reviewedPick.product.id)) return [];

    const recipeCapacity = requiredCupCapacity(requirement);
    if (
      recipeCapacity !== null
      && reviewedPick.product.capacityCups !== null
      && reviewedPick.product.capacityCups < recipeCapacity
    ) return [];

    seen.add(reviewedPick.product.id);
    return [{
      id: reviewedPick.product.id,
      equipmentId: requirement.id,
      productId: reviewedPick.product.id,
      retailerListingId: reviewedPick.retailerListing.id,
      retailerExternalProductId: reviewedPick.retailerListing.externalProductId,
      title: reviewedPick.product.title,
      rationale: reviewedPick.rationale,
      tradeoff: reviewedPick.tradeoff,
      substituteSummary: review.substituteSummary,
      recipeCount: Math.max(1, input.equipmentUsageCounts?.[requirement.id] ?? 1),
      thumbnailAsset: presentation.thumbnailAsset,
      thumbnailUrl: presentation.thumbnailUrl,
    }];
  });
}

export function countRecipeEquipmentUsage(input: {
  recipes: ReadonlyArray<{
    equipmentRequirements: readonly SpecializedRecipeEquipment[];
    instructions: readonly string[];
  }>;
}): Record<string, number> {
  const counts: Record<string, number> = {};
  input.recipes.forEach((recipe) => {
    const requirements = recipe.equipmentRequirements.length
      ? recipe.equipmentRequirements
      : deriveSpecializedRecipeEquipment(recipe.instructions);
    new Set(requirements.map(({ id }) => id)).forEach((id) => {
      counts[id] = (counts[id] ?? 0) + 1;
    });
  });
  return counts;
}
