import { runMealPlanMutationWithFreshVersion } from './mealPlanMutationRetry';

describe('runMealPlanMutationWithFreshVersion', () => {
  it('refreshes and retries once when the visible Meal Plan version is stale', async () => {
    const stale = Object.assign(new Error('stale'), { code: 'stale_household_plan' });
    const mutate = jest.fn()
      .mockRejectedValueOnce(stale)
      .mockResolvedValueOnce({ version: 13 });
    const reload = jest.fn().mockResolvedValue({ planId: 'plan-1', version: 12 });

    await expect(runMealPlanMutationWithFreshVersion({
      planId: 'plan-1',
      version: 11,
      mutate,
      reload,
    })).resolves.toEqual({ version: 13 });

    expect(mutate).toHaveBeenNthCalledWith(1, 'plan-1', 11);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenNthCalledWith(2, 'plan-1', 12);
  });

  it('does not retry non-version failures', async () => {
    const failure = Object.assign(new Error('compiler failed'), { code: 'grocery_compile_failed' });
    const mutate = jest.fn().mockRejectedValue(failure);
    const reload = jest.fn();

    await expect(runMealPlanMutationWithFreshVersion({
      planId: 'plan-1',
      version: 11,
      mutate,
      reload,
    })).rejects.toBe(failure);

    expect(reload).not.toHaveBeenCalled();
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('does not loop when the refreshed version is stale too', async () => {
    const stale = Object.assign(new Error('stale'), { code: 'stale_household_plan' });
    const mutate = jest.fn().mockRejectedValue(stale);
    const reload = jest.fn().mockResolvedValue({ planId: 'plan-1', version: 12 });

    await expect(runMealPlanMutationWithFreshVersion({
      planId: 'plan-1',
      version: 11,
      mutate,
      reload,
    })).rejects.toBe(stale);

    expect(reload).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledTimes(2);
  });
});
