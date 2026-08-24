import AsyncStorage from '@react-native-async-storage/async-storage';

import { parseRecipeProjection, type RecipeProjection } from './recipeCache';

type Storage = Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>;

export function catalogMediaCacheKey(userId: string): string {
  return `kwilt.recipe-catalog.v2.${userId}`;
}

function parseEnvelope(raw: string): RecipeProjection[] {
  const value = JSON.parse(raw) as { recipes?: unknown };
  if (!Array.isArray(value.recipes)) throw new Error('Invalid hosted Recipe catalog cache');
  return value.recipes.map((item) => {
    const projection = parseRecipeProjection(item);
    if (!projection.catalog) throw new Error('Invalid hosted Recipe catalog cache');
    return projection;
  });
}

export function createCatalogMediaCache(storage: Storage) {
  return {
    async read(userId: string): Promise<RecipeProjection[]> {
      try {
        const raw = await storage.getItem(catalogMediaCacheKey(userId));
        return raw ? parseEnvelope(raw) : [];
      } catch {
        await storage.removeItem(catalogMediaCacheKey(userId)).catch(() => undefined);
        return [];
      }
    },
    async write(userId: string, recipes: readonly RecipeProjection[]): Promise<void> {
      if (!recipes.length) return;
      const validated = parseEnvelope(JSON.stringify({ recipes }));
      await storage.setItem(catalogMediaCacheKey(userId), JSON.stringify({ recipes: validated }));
    },
  };
}

export type CatalogMediaCache = ReturnType<typeof createCatalogMediaCache>;
export const catalogMediaCache = createCatalogMediaCache(AsyncStorage);
