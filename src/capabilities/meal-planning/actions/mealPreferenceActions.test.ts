import type { HouseholdMealPreferencesRepository } from '../../../features/household-food/data/householdMealPreferencesRepository';
import { MealPreferenceStaleError, createMealPreferenceActions } from './mealPreferenceActions';

const projection = {
  householdId: 'household-1', version: 3, updatedAt: '2026-08-27T21:00:00.000Z',
  usualDinerCount: 4, usualDinerPersonIds: ['adult', 'child'], setupState: 'completed' as const,
  foodNeeds: [{ id: 'need-1', personId: 'child', kind: 'must_avoid' as const, ingredientConcept: 'peanut', displayLabel: 'Peanuts' }],
  members: [
    { id: 'membership-adult', personId: 'adult', displayName: 'Adult', role: 'owner' as const, kind: 'adult' as const, updatedAt: 'v1' },
    { id: 'membership-child', personId: 'child', displayName: 'Child', role: 'child' as const, kind: 'dependent' as const, updatedAt: 'v1' },
  ],
};

function repository(): jest.Mocked<HouseholdMealPreferencesRepository> {
  return {
    load: jest.fn(async () => projection),
    setPreferences: jest.fn(async (_input: Parameters<HouseholdMealPreferencesRepository['setPreferences']>[0]) => undefined),
    setFoodNeed: jest.fn(async (_input: Parameters<HouseholdMealPreferencesRepository['setFoodNeed']>[0]) => undefined),
    updateReviewed: jest.fn(async (_input: Parameters<HouseholdMealPreferencesRepository['updateReviewed']>[0]) => (
      { householdId: 'household-1', version: 4, replayed: false }
    )),
  };
}

describe('meal preference actions', () => {
  it('reads a bounded household projection and applies one atomic reviewed patch', async () => {
    const store = repository();
    const actions = createMealPreferenceActions(store);
    await expect(actions.read()).resolves.toMatchObject({ result: { version: 3, usualDinerCount: 4 } });
    await expect(actions.update({
      requestId: 'meal-pref-1', confirmed: true, expectedVersion: 3,
      patch: {
        usualDinerCount: 5,
        usualDinerPersonIds: ['adult', 'child'],
        foodNeedChanges: [{ personId: 'child', ingredientConcept: 'shellfish', displayLabel: 'Shellfish', present: true }],
      },
    })).resolves.toMatchObject({ status: 'completed', effectiveVersion: 4 });
    expect(store.updateReviewed).toHaveBeenCalledWith(expect.objectContaining({
      householdId: 'household-1', expectedVersion: 3, idempotencyKey: 'meal-pref-1',
      usualDinerCount: 5, setupState: 'completed',
    }));
  });

  it('rejects a stale version and a diner outside the authorized household', async () => {
    const store = repository();
    const actions = createMealPreferenceActions(store);
    await expect(actions.update({ requestId: 'stale-meal', confirmed: true, expectedVersion: 2, patch: { usualDinerCount: 5 } }))
      .rejects.toBeInstanceOf(MealPreferenceStaleError);
    await expect(actions.update({ requestId: 'wrong-diner', confirmed: true, expectedVersion: 3, patch: { usualDinerPersonIds: ['stranger'] } }))
      .rejects.toThrow('meal_preferences.invalid_diner');
    expect(store.updateReviewed).not.toHaveBeenCalled();
  });
});
