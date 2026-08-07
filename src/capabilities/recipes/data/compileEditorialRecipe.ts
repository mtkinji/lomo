import type { EditorialRecipe } from "./editorialRecipeCatalog";
import type { RecipeProjection } from "./recipeCache";
import { getStarterRecipeDisplayTitle } from "./starterRecipePresentation";

const CATALOG_OWNER_ID = "kwilt-catalog";
const CATALOG_CREATED_AT = "2026-08-06T12:00:00.000Z";

export function compileEditorialRecipeProjection(
  editorial: EditorialRecipe,
): RecipeProjection {
  const rosterKey = editorial.rosterId.toLowerCase();
  const recipeId = `kwilt-recipe-${rosterKey}`;
  const versionId = `${recipeId}-v1`;
  const contentHash = `kwilt:${editorial.rosterId}:v1`;
  const displayTitle = getStarterRecipeDisplayTitle(editorial);

  return {
    recipe: {
      id: recipeId,
      ownerPersonId: CATALOG_OWNER_ID,
      currentVersionId: versionId,
      lifecycle: "active",
      provenance: {
        id: `${recipeId}-provenance`,
        method: "catalog",
        sourceUrl: null,
        sourceTitle: "Kwilt Starter Catalog",
        sourceAuthor: "Kwilt Kitchen",
        sourceContentHash: contentHash,
        rightsBasis: "kwilt_authored",
        importedAt: CATALOG_CREATED_AT,
      },
      credits: [
        {
          id: `${recipeId}-credit`,
          role: "author",
          personId: null,
          publicProfileId: null,
          displayLabel: "Kwilt Kitchen",
          position: 0,
          publicVisible: true,
        },
      ],
      lineage: [],
      accessGrants: [],
      mediaAssets: [
        {
          id: `${recipeId}-media`,
          ownerPersonId: CATALOG_OWNER_ID,
          storageRef: `bundle://household-recipe-atlas/${editorial.artworkIndex}`,
          mediaType: "image/png",
          rightsBasis: "kwilt_authored",
          attribution: "Created for Kwilt",
          altText: `${displayTitle}, served and ready to eat`,
          publicAllowed: true,
          lifecycle: "active",
        },
      ],
      createdAt: CATALOG_CREATED_AT,
      updatedAt: CATALOG_CREATED_AT,
    },
    currentVersion: {
      id: versionId,
      recipeId,
      version: 1,
      title: displayTitle,
      description: editorial.description,
      yieldQuantity: editorial.yieldQuantity,
      yieldUnit: editorial.yieldUnit,
      prepMinutes: editorial.prepMinutes,
      cookMinutes: editorial.cookMinutes,
      notes: editorial.notes,
      ingredients: editorial.ingredients.map((originalText, position) => ({
        id: `${versionId}-ingredient-${position + 1}`,
        recipeVersionId: versionId,
        position,
        groupLabel: null,
        originalText,
        quantityMin: null,
        quantityMax: null,
        unit: null,
        ingredientConcept: null,
        preparation: null,
        optional: false,
        parseConfidence: 1,
      })),
      instructions: editorial.instructions.map((text, position) => ({
        id: `${versionId}-step-${position + 1}`,
        recipeVersionId: versionId,
        position,
        sectionLabel: position === 0 ? "Cook" : null,
        text,
      })),
      createdByPersonId: CATALOG_OWNER_ID,
      createdAt: CATALOG_CREATED_AT,
      contentHash,
    },
  };
}
