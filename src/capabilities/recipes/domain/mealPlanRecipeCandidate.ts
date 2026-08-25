import type { MealPlanCandidateDraft } from '../../meal-planning/data/mealPlanningRepository';
import type { RecipeProjection } from '../data/recipeCache';
import { deriveSpecializedRecipeEquipment } from './recipeEquipment';
import type { RecipeScaleMultiplier } from './recipeScaling';

export function buildMealPlanRecipeCandidate(
  projection: RecipeProjection,
  options: {
    candidateId: string;
    recipeScaleMultiplier: RecipeScaleMultiplier;
    plannedPortions: number;
    dinerPersonIds?: string[];
    excludedDinerPersonIds?: string[];
    excludedDinerResolution?: 'needs_alternative' | 'not_eating' | null;
  },
): MealPlanCandidateDraft & {
  kind: 'recipe';
  recipeSnapshot: Record<string, unknown> & { recipeId: string; recipeVersionId: string };
} {
  const media = projection.recipe.mediaAssets.find((asset) => asset.lifecycle === 'active');
  return {
    id: options.candidateId,
    kind: 'recipe',
    title: projection.currentVersion.title,
    recipeSnapshot: {
      recipeId: projection.recipe.id,
      recipeVersionId: projection.currentVersion.id,
      recipeVersion: projection.currentVersion.version,
      contentHash: projection.currentVersion.contentHash,
      ingredients: projection.currentVersion.ingredients.map((line) => ({
        id: line.id,
        originalText: line.originalText,
        optional: line.optional,
      })),
      equipmentSuggestions: projection.currentVersion.equipmentRequirements.length
        ? projection.currentVersion.equipmentRequirements
        : deriveSpecializedRecipeEquipment(projection.currentVersion.instructions.map((step) => step.text)),
      title: projection.currentVersion.title,
      yieldQuantity: projection.currentVersion.yieldQuantity,
      yieldUnit: projection.currentVersion.yieldUnit,
      recipeScaleMultiplier: options.recipeScaleMultiplier,
      plannedPortions: options.plannedPortions,
      selectedServings: options.plannedPortions,
      dinerPersonIds: [...new Set(options.dinerPersonIds ?? [])],
      excludedDinerPersonIds: [...new Set(options.excludedDinerPersonIds ?? [])],
      excludedDinerResolution: options.excludedDinerResolution ?? null,
      ownerPersonId: projection.recipe.ownerPersonId,
      sourceType: projection.recipe.provenance.method,
      sourceAttribution: projection.recipe.credits.find((credit) => credit.displayLabel)?.displayLabel ?? null,
      media: media ? {
        assetId: media.id,
        storageRef: media.storageRef,
        mediaType: media.mediaType,
        rightsBasis: media.rightsBasis,
        attribution: media.attribution,
        altText: media.altText,
      } : null,
    },
  };
}

export function mealPlanContainsRecipeVersion(
  candidates: MealPlanCandidateDraft[],
  projection: RecipeProjection,
): boolean {
  return candidates.some(
    (candidate) => candidate.kind === 'recipe'
      && candidate.recipeSnapshot?.recipeVersionId === projection.currentVersion.id,
  );
}
