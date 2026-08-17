import type { Recipe, RecipeVersion } from './recipeContracts';
import type { RecipeImportDraft } from './recipeImportContracts';

const baseRecipe: Recipe = {
  id: 'recipe-family-cake',
  ownerPersonId: 'person-owner',
  currentVersionId: 'rv-family-cake-1',
  lifecycle: 'active',
  provenance: {
    id: 'provenance-family-cake',
    method: 'photo',
    sourceUrl: null,
    sourceTitle: "Grandma Ruth's card",
    sourceAuthor: 'Ruth',
    sourceContentHash: 'sha256:family-card',
    rightsBasis: 'private_user_import',
    importedAt: '2026-08-05T10:00:00.000Z',
  },
  credits: [{
    id: 'credit-ruth',
    role: 'family_source',
    personId: null,
    publicProfileId: null,
    displayLabel: 'Grandma Ruth',
    position: 0,
    publicVisible: false,
  }],
  lineage: [],
  accessGrants: [],
  mediaAssets: [{
    id: 'media-card-front',
    ownerPersonId: 'person-owner',
    storageRef: 'recipe-imports/person-owner/card-front.jpg',
    mediaType: 'image/jpeg',
    rightsBasis: 'private_user_import',
    attribution: null,
    altText: "Grandma Ruth's handwritten cake recipe card",
    publicAllowed: false,
    lifecycle: 'active',
  }],
  createdAt: '2026-08-05T10:05:00.000Z',
  updatedAt: '2026-08-05T10:05:00.000Z',
};

const baseVersion: RecipeVersion = {
  id: 'rv-family-cake-1',
  recipeId: 'recipe-family-cake',
  version: 1,
  title: "Grandma Ruth's Cake",
  description: null,
  yieldQuantity: 8,
  yieldUnit: 'servings',
  prepMinutes: 20,
  cookMinutes: 35,
  notes: 'Best served the next day.',
  ingredients: [
    {
      id: 'ingredient-1', recipeVersionId: 'rv-family-cake-1', position: 0, groupLabel: 'Cake',
      originalText: '1 1/2 cups flour, sifted', quantityMin: 1.5, quantityMax: null,
      unit: 'cup', ingredientConcept: 'flour', preparation: 'sifted', optional: false,
      parseConfidence: 0.98,
    },
    {
      id: 'ingredient-2', recipeVersionId: 'rv-family-cake-1', position: 1, groupLabel: 'Cake',
      originalText: '2 eggs', quantityMin: 2, quantityMax: null, unit: null,
      ingredientConcept: 'egg', preparation: null, optional: false, parseConfidence: 0.99,
    },
    {
      id: 'ingredient-3', recipeVersionId: 'rv-family-cake-1', position: 2, groupLabel: 'Glaze',
      originalText: 'Powdered sugar to taste', quantityMin: null, quantityMax: null, unit: null,
      ingredientConcept: 'powdered sugar', preparation: null, optional: true, parseConfidence: 0.85,
    },
  ],
  instructions: [
    { id: 'step-1', recipeVersionId: 'rv-family-cake-1', position: 0, sectionLabel: 'Bake', text: 'Bake until the center springs back.' },
    { id: 'step-2', recipeVersionId: 'rv-family-cake-1', position: 1, sectionLabel: 'Finish', text: 'Cool completely before glazing.' },
  ],
  equipmentRequirements: [],
  createdByPersonId: 'person-owner',
  createdAt: '2026-08-05T10:05:00.000Z',
  contentHash: 'sha256:family-cake-v1',
};

export const familyRecipeFixture = { recipe: baseRecipe, version: baseVersion } as const;

export const independentCopyFixture = {
  recipe: {
    ...baseRecipe,
    id: 'recipe-recipient-copy',
    ownerPersonId: 'person-recipient',
    currentVersionId: 'rv-recipient-copy-1',
    provenance: { ...baseRecipe.provenance, id: 'provenance-copy', method: 'copy' as const },
    lineage: [{
      id: 'lineage-copy',
      relationship: 'adaptation' as const,
      sourceRecipeId: 'recipe-source',
      sourceRecipeVersionId: 'rv-source-4',
      sourcePublicationId: null,
    }],
    mediaAssets: [],
  },
} as const;

export const collaboratedRecipeFixture = {
  recipe: {
    ...baseRecipe,
    accessGrants: [{
      id: 'grant-helper',
      granteePersonId: 'person-helper',
      role: 'contributor' as const,
      status: 'active' as const,
      grantedByPersonId: 'person-owner',
      expiresAt: null,
      createdAt: '2026-08-05T10:10:00.000Z',
      revokedAt: null,
    }],
  },
} as const;

export const archivedPlannedRecipeFixture = {
  recipe: { ...baseRecipe, lifecycle: 'archived' as const },
  plannedSnapshot: {
    recipeId: baseRecipe.id,
    recipeVersionId: baseVersion.id,
    recipeVersion: baseVersion.version,
    title: baseVersion.title,
    yieldQuantity: baseVersion.yieldQuantity,
    yieldUnit: baseVersion.yieldUnit,
    ownerPersonId: baseRecipe.ownerPersonId,
    sourceType: baseRecipe.provenance.method,
    sourceAttribution: baseRecipe.credits[0].displayLabel,
    media: {
      assetId: baseRecipe.mediaAssets[0].id,
      storageRef: baseRecipe.mediaAssets[0].storageRef,
      mediaType: baseRecipe.mediaAssets[0].mediaType,
      rightsBasis: baseRecipe.mediaAssets[0].rightsBasis,
      attribution: baseRecipe.mediaAssets[0].attribution,
      altText: baseRecipe.mediaAssets[0].altText,
    },
  },
} as const;

export const multiPagePhotoDraftFixture: RecipeImportDraft = {
  id: 'draft-photo',
  ownerPersonId: 'person-owner',
  version: 1,
  method: 'photo',
  sourceArtifacts: [
    { id: 'artifact-page-1', storageRef: 'temporary/person-owner/page-1.jpg', page: 1, mediaType: 'image/jpeg', contentHash: 'sha256:p1' },
    { id: 'artifact-page-2', storageRef: 'temporary/person-owner/page-2.jpg', page: 2, mediaType: 'image/jpeg', contentHash: 'sha256:p2' },
  ],
  sourceMetadata: { sourceUrl: null, sourceTitle: "Grandma Ruth's card", sourceAuthor: 'Ruth' },
  extractedRecipe: { title: "Grandma Ruth's Cake", ingredients: ['1 1/2 cups flour, sifted'] },
  fieldEvidence: [{
    fieldPath: 'ingredients[0].originalText', sourceArtifactId: 'artifact-page-1', sourceRegion: { x: 0.1, y: 0.2, width: 0.7, height: 0.08 },
    sourceText: '1 1/2 c flour sifted', confidence: 0.63, warning: 'Abbreviated unit requires review',
  }],
  modelVersion: 'fixture-model-v1',
  promptVersion: 'recipe-import-v1',
  state: 'needs_review',
  createdAt: '2026-08-05T10:00:00.000Z',
  expiresAt: '2026-08-12T10:00:00.000Z',
};

export const urlDraftFixture: RecipeImportDraft = {
  ...multiPagePhotoDraftFixture,
  id: 'draft-url',
  method: 'url',
  sourceArtifacts: [{ id: 'artifact-url', storageRef: null, page: 1, mediaType: 'text/html', contentHash: 'sha256:url' }],
  sourceMetadata: { sourceUrl: 'https://example.test/recipe', sourceTitle: 'Example cake', sourceAuthor: 'Example Author' },
  fieldEvidence: multiPagePhotoDraftFixture.fieldEvidence.map((evidence) => ({
    ...evidence,
    sourceArtifactId: 'artifact-url',
    sourceRegion: null,
  })),
};

export function recipeContractFixture(): Recipe {
  return JSON.parse(JSON.stringify(baseRecipe)) as Recipe;
}

export function recipeVersionContractFixture(): RecipeVersion {
  return JSON.parse(JSON.stringify(baseVersion)) as RecipeVersion;
}
