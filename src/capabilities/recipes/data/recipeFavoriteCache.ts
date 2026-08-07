import AsyncStorage from '@react-native-async-storage/async-storage';

type Storage = Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>;

export function recipeFavoriteCacheKey(userId: string): string {
  return `kwilt.recipe-favorites.v1.${userId}`;
}

function parseRecipeIds(value: unknown): string[] {
  if (!Array.isArray(value)) throw new Error('Invalid recipe favorite cache');
  const recipeIds = value.map((item) => {
    if (typeof item !== 'string' || !item.trim()) throw new Error('Invalid recipe favorite cache');
    return item;
  });
  return [...new Set(recipeIds)];
}

export function createRecipeFavoriteCache(storage: Storage) {
  return {
    async read(userId: string): Promise<string[]> {
      const key = recipeFavoriteCacheKey(userId);
      try {
        const raw = await storage.getItem(key);
        if (!raw) return [];
        const envelope = JSON.parse(raw) as { recipeIds?: unknown };
        return parseRecipeIds(envelope.recipeIds);
      } catch {
        await storage.removeItem(key).catch(() => undefined);
        return [];
      }
    },
    async write(userId: string, recipeIds: string[]): Promise<void> {
      await storage.setItem(recipeFavoriteCacheKey(userId), JSON.stringify({ recipeIds: parseRecipeIds(recipeIds) }));
    },
    async clear(userId: string): Promise<void> {
      await storage.removeItem(recipeFavoriteCacheKey(userId));
    },
  };
}

export type RecipeFavoriteCache = ReturnType<typeof createRecipeFavoriteCache>;
export const recipeFavoriteCache = createRecipeFavoriteCache(AsyncStorage);
