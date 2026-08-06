import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseRecipeCookSession, type RecipeCookSession } from '../domain/recipeCookContracts';

type StorageAdapter = Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>;
export function recipeCookCacheKey(userId: string): string { return `kwilt.recipe-cook.v1.${userId}`; }
export function createRecipeCookCache(storage: StorageAdapter) {
  return {
    async read(userId: string): Promise<RecipeCookSession | null> {
      const key = recipeCookCacheKey(userId);
      try { const raw = await storage.getItem(key); return raw ? parseRecipeCookSession(JSON.parse(raw)) : null; }
      catch { await storage.removeItem(key).catch(() => undefined); return null; }
    },
    async write(userId: string, session: RecipeCookSession): Promise<void> { await storage.setItem(recipeCookCacheKey(userId), JSON.stringify(parseRecipeCookSession(session))); },
    async clear(userId: string): Promise<void> { await storage.removeItem(recipeCookCacheKey(userId)); },
  };
}
export const recipeCookCache = createRecipeCookCache(AsyncStorage);
