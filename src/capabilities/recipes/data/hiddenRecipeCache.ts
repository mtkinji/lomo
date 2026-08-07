import AsyncStorage from '@react-native-async-storage/async-storage';

type Storage = Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>;

export function hiddenRecipeCacheKey(identity: string): string {
  return `kwilt.hidden-recipes.v1.${identity}`;
}

function parseRecipeIds(value: unknown): string[] {
  if (!Array.isArray(value)) throw new Error('Invalid hidden recipe cache');
  const recipeIds = value.map((item) => {
    if (typeof item !== 'string' || !item.trim()) throw new Error('Invalid hidden recipe cache');
    return item.trim();
  });
  return [...new Set(recipeIds)];
}

export function createHiddenRecipeCache(storage: Storage) {
  return {
    async read(identity: string): Promise<string[]> {
      const key = hiddenRecipeCacheKey(identity);
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
    async write(identity: string, recipeIds: string[]): Promise<void> {
      await storage.setItem(hiddenRecipeCacheKey(identity), JSON.stringify({ recipeIds: parseRecipeIds(recipeIds) }));
    },
    async clear(identity: string): Promise<void> {
      await storage.removeItem(hiddenRecipeCacheKey(identity));
    },
  };
}

export type HiddenRecipeCache = ReturnType<typeof createHiddenRecipeCache>;
export const hiddenRecipeCache = createHiddenRecipeCache(AsyncStorage);
