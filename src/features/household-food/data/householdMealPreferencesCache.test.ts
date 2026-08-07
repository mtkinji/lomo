import { createHouseholdMealPreferencesCache, householdMealPreferencesCacheKey } from './householdMealPreferencesCache';

describe('household meal preferences cache', () => {
  it('uses an opaque account-scoped key and round-trips validated state', async () => {
    const values = new Map<string, string>();
    const cache = createHouseholdMealPreferencesCache({
      getItem: async (key) => values.get(key) ?? null,
      setItem: async (key, value) => { values.set(key, value); },
      removeItem: async (key) => { values.delete(key); },
    });
    const projection = {
      householdId: 'household-1',
      usualDinerPersonIds: ['adult', 'child'],
      setupState: 'completed' as const,
      foodNeeds: [{ id: 'need', personId: 'child', kind: 'must_avoid' as const, ingredientConcept: 'peanut', displayLabel: 'Peanuts' }],
      members: [{ id: 'member-adult', personId: 'adult', displayName: 'Blair', kind: 'adult' as const, role: 'owner' as const }],
    };

    expect(householdMealPreferencesCacheKey('user-a')).toBe('kwilt.meal-preferences.v1.user-a');
    expect(householdMealPreferencesCacheKey('user-a')).not.toContain('Peanuts');
    await cache.write('user-a', projection);
    await expect(cache.read('user-a')).resolves.toEqual(projection);
  });
});
