import { compileEditorialRecipeProjection } from "./compileEditorialRecipe";
import type {
  EditorialRecipeCategory,
  EditorialRecipeTier,
} from "./editorialRecipeCatalog";
import type { RecipeProjection } from "./recipeCache";
import { STARTER_EDITORIAL_RECIPE_CATALOG } from "./starterEditorialRecipeCatalog";
import { getCuisineFamilyForFilterValue } from "../domain/cuisineFamilies";
import { applyHostedCatalogMedia } from "./catalogMediaOverlay";

export type StarterRecipeMetadata = {
  category: EditorialRecipeCategory;
  cuisine: string;
  artworkIndex: number;
  tier: EditorialRecipeTier;
  inactiveMinutes: number;
  totalMinutes: number;
  featured: boolean;
};

export type RecipeInventoryFilters = {
  source: "all" | "yours";
  maxMinutes: number | null;
  category: StarterRecipeMetadata["category"] | null;
  cuisine: string | null;
};

export type RecipeInventorySortMode = "featured" | "quickest" | "title";

export const DEFAULT_RECIPE_INVENTORY_FILTERS: RecipeInventoryFilters = {
  source: "all",
  maxMinutes: null,
  category: null,
  cuisine: null,
};

const metadataById = new Map<string, StarterRecipeMetadata>();

export const STARTER_RECIPE_PROJECTIONS: RecipeProjection[] =
  STARTER_EDITORIAL_RECIPE_CATALOG.map((editorial) => {
    const projection = compileEditorialRecipeProjection(editorial);
    metadataById.set(projection.recipe.id, {
      category: editorial.category,
      cuisine: editorial.cuisine,
      artworkIndex: editorial.artworkIndex,
      tier: editorial.tier,
      inactiveMinutes: editorial.inactiveMinutes,
      totalMinutes:
        editorial.prepMinutes +
        editorial.cookMinutes +
        editorial.inactiveMinutes,
      featured: editorial.tier === "household-anchor",
    });
    return projection;
  });

export const STARTER_RECIPE_CATEGORIES: readonly StarterRecipeMetadata["category"][] =
  [
    "Breakfast & brunch",
    "Lunch & handhelds",
    "Dinner",
    "Soups & stews",
    "Salads & bowls",
    "Appetizers & snacks",
    "Sides",
    "Breads & baking",
    "Desserts",
  ];

export const STARTER_RECIPE_CUISINES: readonly string[] = Array.from(
  new Set(STARTER_EDITORIAL_RECIPE_CATALOG.map((recipe) => recipe.cuisine)),
).sort((left, right) => left.localeCompare(right));

export function getStarterRecipeMetadata(
  recipeId: string,
): StarterRecipeMetadata | null {
  return metadataById.get(recipeId) ?? null;
}

export function isStarterRecipe(recipeId: string): boolean {
  return metadataById.has(recipeId);
}

export function isCanonicalCatalogProjection(
  projection: RecipeProjection,
): boolean {
  return (
    projection.recipe.provenance.method === "catalog" &&
    projection.recipe.provenance.rightsBasis === "kwilt_authored" &&
    projection.recipe.lineage.length === 0
  );
}

export function buildRecipeLibraryInventory(
  personalRecipes: readonly RecipeProjection[],
): RecipeProjection[] {
  const privateRecipes = personalRecipes.filter(
    (projection) => !isCanonicalCatalogProjection(projection),
  );
  const personalIds = new Set(privateRecipes.map(({ recipe }) => recipe.id));
  return [
    ...privateRecipes,
    ...STARTER_RECIPE_PROJECTIONS.filter(
      ({ recipe }) => !personalIds.has(recipe.id),
    ).map(applyHostedCatalogMedia),
  ];
}

export function getBundledRecipeArtworkIndex(
  storageRef: string | null | undefined,
): number | null {
  const match = /^bundle:\/\/household-recipe-atlas\/(\d+)$/.exec(
    storageRef ?? "",
  );
  if (!match) return null;
  const index = Number(match[1]);
  return Number.isInteger(index) && index >= 0 && index < 24 ? index : null;
}

export function countActiveRecipeInventoryFilters(
  filters: RecipeInventoryFilters,
): number {
  return (
    Number(filters.source !== "all") +
    Number(filters.maxMinutes !== null) +
    Number(filters.category !== null) +
    Number(filters.cuisine !== null)
  );
}

export function getRecipeElapsedMinutes(projection: RecipeProjection): number {
  return (
    getStarterRecipeMetadata(projection.recipe.id)?.totalMinutes ??
    (projection.currentVersion.prepMinutes ?? 0) +
      (projection.currentVersion.cookMinutes ?? 0)
  );
}

export function filterRecipeInventory(
  recipes: readonly RecipeProjection[],
  options: {
    query: string;
    filters: RecipeInventoryFilters;
    sort: RecipeInventorySortMode;
  },
): RecipeProjection[] {
  const terms = options.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const cuisineFamily = options.filters.cuisine
    ? getCuisineFamilyForFilterValue(options.filters.cuisine)
    : null;
  const filtered = recipes.filter((projection) => {
    const metadata = getStarterRecipeMetadata(projection.recipe.id);
    const totalMinutes = getRecipeElapsedMinutes(projection);
    if (options.filters.source === "yours" && metadata) return false;
    if (
      options.filters.maxMinutes !== null &&
      (totalMinutes <= 0 || totalMinutes > options.filters.maxMinutes)
    ) {
      return false;
    }
    if (
      options.filters.category !== null &&
      metadata?.category !== options.filters.category
    ) {
      return false;
    }
    if (
      options.filters.cuisine !== null &&
      (cuisineFamily
        ? !metadata || !cuisineFamily.cuisines.includes(metadata.cuisine)
        : metadata?.cuisine !== options.filters.cuisine)
    ) {
      return false;
    }
    if (!terms.length) return true;
    const searchable = [
      projection.currentVersion.title,
      projection.currentVersion.description,
      metadata?.category,
      metadata?.cuisine,
      ...projection.currentVersion.ingredients.map(
        ({ originalText }) => originalText,
      ),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return terms.every((term) => searchable.includes(term));
  });

  if (options.sort === "featured") return filtered;
  return [...filtered].sort((left, right) => {
    if (options.sort === "title") {
      return left.currentVersion.title.localeCompare(
        right.currentVersion.title,
      );
    }
    const timeDifference =
      getRecipeElapsedMinutes(left) - getRecipeElapsedMinutes(right);
    return (
      timeDifference ||
      left.currentVersion.title.localeCompare(right.currentVersion.title)
    );
  });
}
