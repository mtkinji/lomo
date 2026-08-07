import AsyncStorage from '@react-native-async-storage/async-storage';

import { parseRecipe, parseRecipeVersion, type Recipe, type RecipeVersion } from '../domain/recipeContracts';

export type RecipeProjection = { recipe: Recipe; currentVersion: RecipeVersion };
type StorageAdapter = Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>;

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
  return { recipe, currentVersion };
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
