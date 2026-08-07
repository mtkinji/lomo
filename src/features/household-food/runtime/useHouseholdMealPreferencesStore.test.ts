import { createHouseholdMealPreferencesStore } from './useHouseholdMealPreferencesStore';
import type { HouseholdMealPreferencesProjection } from '../data/householdMealPreferencesRepository';

const projection: HouseholdMealPreferencesProjection = {
  householdId: 'household-1', usualDinerPersonIds: ['adult'], setupState: 'unseen', foodNeeds: [], members: [],
};

describe('household meal preferences store', () => {
  it('shows cached state while refreshing server authority', async () => {
    let resolveLoad: ((value: typeof projection) => void) | undefined;
    const repository = {
      load: jest.fn(() => new Promise<typeof projection>((resolve) => { resolveLoad = resolve; })),
      setPreferences: jest.fn(), setFoodNeed: jest.fn(),
    };
    const cache = { read: jest.fn().mockResolvedValue(projection), write: jest.fn(), clear: jest.fn() };
    const store = createHouseholdMealPreferencesStore(repository as never, cache as never);

    const loading = store.getState().setIdentity('user-a');
    await Promise.resolve();
    expect(store.getState()).toMatchObject({ projection, status: 'refreshing' });
    resolveLoad?.({ ...projection, setupState: 'completed' });
    await loading;
    expect(store.getState().projection?.setupState).toBe('completed');
  });

  it('rolls back a failed setup mutation and never queues it', async () => {
    const repository = {
      load: jest.fn(), setPreferences: jest.fn().mockRejectedValue(new Error('offline')), setFoodNeed: jest.fn(),
    };
    const cache = { read: jest.fn(), write: jest.fn(), clear: jest.fn() };
    const store = createHouseholdMealPreferencesStore(repository as never, cache as never);
    store.setState({ userId: 'user-a', projection, status: 'ready' });

    const update = store.getState().setSetupState('skipped');
    expect(store.getState().projection?.setupState).toBe('skipped');
    await expect(update).rejects.toThrow('offline');
    expect(store.getState().projection?.setupState).toBe('unseen');
  });

  it('adds and removes a person food need through server authority', async () => {
    const repository = {
      load: jest.fn(), setPreferences: jest.fn(), setFoodNeed: jest.fn().mockResolvedValue(undefined),
    };
    const cache = { read: jest.fn(), write: jest.fn(), clear: jest.fn() };
    const store = createHouseholdMealPreferencesStore(repository as never, cache as never);
    store.setState({ userId: 'user-a', projection, status: 'ready' });

    await store.getState().setFoodNeed({ personId: 'child', ingredientConcept: 'peanut', displayLabel: 'Peanuts', present: true });
    expect(store.getState().projection?.foodNeeds).toEqual([
      expect.objectContaining({ personId: 'child', ingredientConcept: 'peanut', displayLabel: 'Peanuts' }),
    ]);
    await store.getState().setFoodNeed({ personId: 'child', ingredientConcept: 'peanut', displayLabel: 'Peanuts', present: false });
    expect(store.getState().projection?.foodNeeds).toEqual([]);
  });
});
