import { createHouseholdMealPreferencesRepository } from './householdMealPreferencesRepository';

describe('household meal preferences repository', () => {
  it('uses exact authority-preserving RPC payloads', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: {}, error: null });
    const repository = createHouseholdMealPreferencesRepository({ rpc } as never);

    await repository.setFoodNeed({
      personId: 'person-child', ingredientConcept: ' Peanut ', displayLabel: ' Peanuts ', present: true,
    });
    await repository.setPreferences({
      householdId: 'household-1', usualDinerPersonIds: ['adult', 'child', 'child'], setupState: 'completed',
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
});
