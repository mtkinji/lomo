import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MealPlanProjection } from './mealPlanningRepository';

type Storage = Pick<typeof AsyncStorage, 'getItem'|'setItem'|'removeItem'>;
export const mealPlanningCacheKey = (userId: string) => `kwilt.meal-planning.v1.${userId}`;

export function createMealPlanningCache(storage: Storage) {
  return {
    async read(userId: string): Promise<MealPlanProjection[]> {
      try {
        const raw = await storage.getItem(mealPlanningCacheKey(userId));
        if (!raw) return [];
        const value = JSON.parse(raw);
        if (!Array.isArray(value?.plans)) throw new Error('invalid');
        return value.plans as MealPlanProjection[];
      } catch { await storage.removeItem(mealPlanningCacheKey(userId)).catch(() => undefined); return []; }
    },
    write(userId: string, plans: MealPlanProjection[]) { return storage.setItem(mealPlanningCacheKey(userId), JSON.stringify({ plans })); },
    clear(userId: string) { return storage.removeItem(mealPlanningCacheKey(userId)); },
  };
}

export const mealPlanningCache = createMealPlanningCache(AsyncStorage);
