import AsyncStorage from '@react-native-async-storage/async-storage';

import { parseRecipe, parseRecipeVersion, type Recipe, type RecipeVersion } from '../domain/recipeContracts';

export type RecipeCatalogPublication = {
  publicationId: string;
  rosterId: string;
  publicSlug: string;
  editorialMetadata: {
    category: string;
    cuisine: string;
    tier: string;
    inactiveMinutes?: number;
  };
  publishedAt: string;
  contentHash: string;
};

export type RecipeProjection = {
  recipe: Recipe;
  currentVersion: RecipeVersion;
  catalog?: RecipeCatalogPublication;
};
type StorageAdapter = Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>;

const CATALOG_CATEGORIES = new Set([
  'Breakfast & brunch',
  'Lunch & handhelds',
  'Dinner',
  'Soups & stews',
  'Salads & bowls',
  'Appetizers & snacks',
  'Sides',
  'Breads & baking',
  'Desserts',
]);
const CATALOG_TIERS = new Set(['household-anchor', 'cuisine-anchor', 'discovery']);

function parseCatalogPublication(value: unknown): RecipeCatalogPublication | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid Recipe catalog publication');
  }
  const object = value as Record<string, unknown>;
  const metadata = object.editorialMetadata;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new Error('Invalid Recipe catalog editorial metadata');
  }
  const editorial = metadata as Record<string, unknown>;
  const required = [object.publicationId, object.publicSlug, object.contentHash];
  if (
    required.some((item) => typeof item !== 'string' || item.length === 0) ||
    typeof object.rosterId !== 'string' || !/^[A-Z]{2}[0-9]{3}$/.test(object.rosterId) ||
    typeof object.publishedAt !== 'string' || !Number.isFinite(Date.parse(object.publishedAt)) ||
    typeof editorial.category !== 'string' || !CATALOG_CATEGORIES.has(editorial.category) ||
    typeof editorial.cuisine !== 'string' || editorial.cuisine.length === 0 ||
    typeof editorial.tier !== 'string' || !CATALOG_TIERS.has(editorial.tier) ||
    (editorial.inactiveMinutes !== undefined &&
      (!Number.isInteger(editorial.inactiveMinutes) || Number(editorial.inactiveMinutes) < 0))
  ) {
    throw new Error('Invalid Recipe catalog publication');
  }
  return {
    publicationId: object.publicationId as string,
    rosterId: object.rosterId,
    publicSlug: object.publicSlug as string,
    editorialMetadata: {
      category: editorial.category,
      cuisine: editorial.cuisine,
      tier: editorial.tier,
      ...(editorial.inactiveMinutes === undefined
        ? {}
        : { inactiveMinutes: Number(editorial.inactiveMinutes) }),
    },
    publishedAt: object.publishedAt,
    contentHash: object.contentHash as string,
  };
}

export function recipeCacheKey(userId: string): string {
  return `kwilt.recipes.v1.${userId}`;
}

function parseProjection(value: unknown): RecipeProjection {
  if (!value || typeof value !== 'object') throw new Error('Invalid Recipe projection');
  const object = value as Record<string, unknown>;
  const recipe = parseRecipe(object.recipe);
  const currentVersion = parseRecipeVersion(object.currentVersion);
  if (recipe.id !== currentVersion.recipeId || recipe.currentVersionId !== currentVersion.id) {
    throw new Error('Invalid Recipe projection relationship');
  }
  const catalog = parseCatalogPublication(object.catalog);
  return { recipe, currentVersion, ...(catalog ? { catalog } : {}) };
}

export function createRecipeCache(storage: StorageAdapter) {
  return {
    async read(userId: string): Promise<RecipeProjection[]> {
      const key = recipeCacheKey(userId);
      try {
        const raw = await storage.getItem(key);
        if (!raw) return [];
        const envelope = JSON.parse(raw) as { recipes?: unknown };
        if (!Array.isArray(envelope.recipes)) throw new Error('Invalid Recipe cache');
        return envelope.recipes.map(parseProjection);
      } catch {
        await storage.removeItem(key).catch(() => undefined);
        return [];
      }
    },
    async write(userId: string, recipes: RecipeProjection[]): Promise<void> {
      const validated = recipes.map(parseProjection);
      await storage.setItem(recipeCacheKey(userId), JSON.stringify({ recipes: validated }));
    },
    async clear(userId: string): Promise<void> {
      await storage.removeItem(recipeCacheKey(userId));
    },
  };
}

export type RecipeCache = ReturnType<typeof createRecipeCache>;
export const recipeCache = createRecipeCache(AsyncStorage);
export { parseProjection as parseRecipeProjection };
