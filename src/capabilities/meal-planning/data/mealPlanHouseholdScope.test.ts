import {
  loadCurrentHouseholdMealCart,
  resolveCurrentMealPlanHouseholdId,
} from './mealPlanHouseholdScope';

describe('Meal Plan household scope', () => {
  it('uses current Household membership even when Meal Preferences are unavailable', async () => {
    const loadHouseholdSnapshot = jest.fn().mockResolvedValue({
      household: { id: 'household-1', name: 'Watanabe household' },
    });

    await expect(resolveCurrentMealPlanHouseholdId(loadHouseholdSnapshot))
      .resolves.toBe('household-1');
  });

  it('keeps a personal Plan when the person has no Household', async () => {
    await expect(resolveCurrentMealPlanHouseholdId(async () => ({ household: null })))
      .resolves.toBeNull();
  });

  it('reads the cart with current Household scope instead of Meal Preferences state', async () => {
    const readMealCart = jest.fn().mockResolvedValue({ planId: 'plan-1' });

    await expect(loadCurrentHouseholdMealCart(
      async () => ({ household: { id: 'household-1' } }),
      readMealCart,
    )).resolves.toEqual({ householdId: 'household-1', cart: { planId: 'plan-1' } });
    expect(readMealCart).toHaveBeenCalledWith('household-1');
  });
});
