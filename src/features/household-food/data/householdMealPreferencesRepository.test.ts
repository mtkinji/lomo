import { createHouseholdMealPreferencesRepository } from './householdMealPreferencesRepository';

describe('household meal preferences repository', () => {
  it('uses exact authority-preserving RPC payloads', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: {}, error: null });
    const repository = createHouseholdMealPreferencesRepository({ rpc } as never);

    await repository.setFoodNeed({
      personId: 'person-child', ingredientConcept: ' Peanut ', displayLabel: ' Peanuts ', present: true,
    });
    await repository.setPreferences({
      householdId: 'household-1', usualDinerCount: 7, usualDinerPersonIds: ['adult', 'child', 'child'], setupState: 'completed',
    });

    expect(rpc).toHaveBeenNthCalledWith(1, 'set_kwilt_person_food_need', {
      p_person_id: 'person-child',
      p_ingredient_concept: 'peanut',
      p_display_label: 'Peanuts',
      p_present: true,
    });
    expect(rpc).toHaveBeenNthCalledWith(2, 'set_kwilt_meal_planner_preferences', {
      p_household_id: 'household-1',
      p_usual_diner_person_ids: ['adult', 'child'],
      p_usual_diner_count: 7,
      p_setup_state: 'completed',
    });
  });

  it('rejects malformed food-need input before authority RPC', async () => {
    const rpc = jest.fn();
    const repository = createHouseholdMealPreferencesRepository({ rpc } as never);

    await expect(repository.setFoodNeed({
      personId: '', ingredientConcept: ' ', displayLabel: 'Peanuts', present: true,
    })).rejects.toThrow('Invalid person food need');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('uses the versioned atomic conversational RPC for reviewed household changes', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: { householdId: 'household-1', version: 4, replayed: false }, error: null });
    const repository = createHouseholdMealPreferencesRepository({ rpc } as never);
    await expect(repository.updateReviewed({
      householdId: 'household-1', expectedVersion: 3, idempotencyKey: 'meal-pref-request',
      usualDinerCount: 5, usualDinerPersonIds: ['adult', 'child'], setupState: 'completed',
      foodNeedChanges: [{ personId: 'child', ingredientConcept: ' Shellfish ', displayLabel: ' Shellfish ', present: true }],
    })).resolves.toEqual({ householdId: 'household-1', version: 4, replayed: false });
    expect(rpc).toHaveBeenCalledWith('update_kwilt_meal_preferences_conversational', {
      p_household_id: 'household-1', p_expected_version: 3, p_idempotency_key: 'meal-pref-request',
      p_usual_diner_person_ids: ['adult', 'child'], p_usual_diner_count: 5, p_setup_state: 'completed',
      p_food_need_changes: [{ personId: 'child', ingredientConcept: 'shellfish', displayLabel: 'Shellfish', present: true }],
    });
  });
});
