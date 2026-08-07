import AsyncStorage from '@react-native-async-storage/async-storage';

import type { HouseholdMealPreferencesProjection, MealSetupState } from './householdMealPreferencesRepository';

type Storage = Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>;

export function householdMealPreferencesCacheKey(userId: string): string {
  return `kwilt.meal-preferences.v1.${userId}`;
}

function parse(value: unknown): HouseholdMealPreferencesProjection {
  if (!value || typeof value !== 'object') throw new Error('Invalid meal preferences cache');
  const candidate = value as HouseholdMealPreferencesProjection;
  const states: MealSetupState[] = ['unseen', 'skipped', 'completed'];
  if (typeof candidate.householdId !== 'string' || !candidate.householdId || !states.includes(candidate.setupState)
    || !Array.isArray(candidate.usualDinerPersonIds) || !Array.isArray(candidate.foodNeeds) || !Array.isArray(candidate.members)) {
    throw new Error('Invalid meal preferences cache');
  }
  if (candidate.usualDinerPersonIds.some((id) => typeof id !== 'string' || !id)
    || candidate.foodNeeds.some((need) => !need || typeof need.id !== 'string' || typeof need.personId !== 'string'
      || need.kind !== 'must_avoid' || typeof need.ingredientConcept !== 'string' || typeof need.displayLabel !== 'string')
    || candidate.members.some((member) => !member || typeof member.id !== 'string' || typeof member.personId !== 'string'
      || typeof member.displayName !== 'string' || !['adult','dependent'].includes(member.kind)
      || !['owner','caregiver','child'].includes(member.role))) {
    throw new Error('Invalid meal preferences cache');
  }
  return {
    householdId: candidate.householdId,
    usualDinerPersonIds: [...new Set(candidate.usualDinerPersonIds)],
    setupState: candidate.setupState,
    foodNeeds: candidate.foodNeeds.map((need) => ({ ...need })),
    members: candidate.members.map((member) => ({ ...member })),
  };
}

export function createHouseholdMealPreferencesCache(storage: Storage) {
  return {
    async read(userId: string): Promise<HouseholdMealPreferencesProjection | null> {
      const key = householdMealPreferencesCacheKey(userId);
      try {
        const raw = await storage.getItem(key);
        return raw ? parse(JSON.parse(raw)) : null;
      } catch {
        await storage.removeItem(key).catch(() => undefined);
        return null;
      }
    },
    async write(userId: string, projection: HouseholdMealPreferencesProjection): Promise<void> {
      await storage.setItem(householdMealPreferencesCacheKey(userId), JSON.stringify(parse(projection)));
    },
    async clear(userId: string): Promise<void> {
      await storage.removeItem(householdMealPreferencesCacheKey(userId));
    },
  };
}

export type HouseholdMealPreferencesCache = ReturnType<typeof createHouseholdMealPreferencesCache>;
export const householdMealPreferencesCache = createHouseholdMealPreferencesCache(AsyncStorage);
