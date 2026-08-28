import { create } from 'zustand';
import { createStore, type StateCreator } from 'zustand/vanilla';

import { householdMealPreferencesCache, type HouseholdMealPreferencesCache } from '../data/householdMealPreferencesCache';
import {
  createHouseholdMealPreferencesRepository,
  type HouseholdMealPreferencesProjection,
  type HouseholdMealPreferencesRepository,
  type MealSetupState,
} from '../data/householdMealPreferencesRepository';
import { clampDefaultMealServings } from '../../../capabilities/recipes/domain/mealPreferences';
import { createMealPreferenceActions } from '../../../capabilities/meal-planning/actions/mealPreferenceActions';

type Status = 'idle' | 'cached' | 'refreshing' | 'ready' | 'error';

export type HouseholdMealPreferencesStoreState = {
  userId: string | null;
  projection: HouseholdMealPreferencesProjection | null;
  status: Status;
  error: string | null;
  setIdentity(userId: string | null): Promise<void>;
  refresh(): Promise<void>;
  setSetupState(state: MealSetupState): Promise<void>;
  setUsualDiners(input: { usualDinerCount: number; personIds: string[] }): Promise<void>;
  setFoodNeed(input: { personId: string; ingredientConcept: string; displayLabel: string; present: boolean }): Promise<void>;
};

function initializer(
  repository: HouseholdMealPreferencesRepository,
  cache: HouseholdMealPreferencesCache,
): StateCreator<HouseholdMealPreferencesStoreState> {
  return (set, get) => {
    const persist = async (projection: HouseholdMealPreferencesProjection) => {
      const userId = get().userId;
      if (userId) await cache.write(userId, projection);
    };
    const mutateProjection = async (
      optimistic: HouseholdMealPreferencesProjection,
      mutation: () => Promise<void>,
    ) => {
      const before = get().projection;
      const identity = get().userId;
      set({ projection: optimistic, error: null });
      try {
        await mutation();
        if (get().userId !== identity) return;
        await persist(optimistic);
      } catch (caught) {
        if (get().userId === identity) set({ projection: before, status: 'error', error: caught instanceof Error ? caught.message : String(caught) });
        throw caught;
      }
    };
    return {
      userId: null,
      projection: null,
      status: 'idle',
      error: null,
      async setIdentity(userId) {
        set({ userId, projection: null, status: 'idle', error: null });
        if (!userId) return;
        const cached = await cache.read(userId);
        if (get().userId !== userId) return;
        set({ projection: cached, status: cached ? 'cached' : 'idle' });
        await get().refresh();
      },
      async refresh() {
        const userId = get().userId;
        if (!userId) return;
        set({ status: get().projection ? 'refreshing' : 'idle', error: null });
        try {
          const projection = await repository.load();
          if (get().userId !== userId) return;
          set({ projection, status: 'ready', error: null });
          if (projection) await cache.write(userId, projection); else await cache.clear(userId);
        } catch (caught) {
          if (get().userId === userId) set({ status: 'error', error: caught instanceof Error ? caught.message : String(caught) });
        }
      },
      async setSetupState(setupState) {
        const current = get().projection;
        if (!current) throw new Error('Household meal preferences are not available.');
        const optimistic = { ...current, setupState };
        await mutateProjection(optimistic, () => repository.setPreferences({
          householdId: current.householdId,
          usualDinerCount: current.usualDinerCount,
          usualDinerPersonIds: current.usualDinerPersonIds,
          setupState,
        }));
      },
      async setUsualDiners(input) {
        const current = get().projection;
        if (!current) throw new Error('Household meal preferences are not available.');
        const usualDinerPersonIds = [...new Set(input.personIds)];
        const usualDinerCount = clampDefaultMealServings(input.usualDinerCount);
        if (usualDinerCount < usualDinerPersonIds.length) {
          throw new Error('Count cannot be lower than selected people.');
        }
        const optimistic = { ...current, usualDinerCount, usualDinerPersonIds };
        await mutateProjection(optimistic, () => repository.setPreferences({
          householdId: current.householdId,
          usualDinerCount,
          usualDinerPersonIds,
          setupState: current.setupState,
        }));
      },
      async setFoodNeed(input) {
        const current = get().projection;
        if (!current) throw new Error('Household meal preferences are not available.');
        const concept = input.ingredientConcept.trim().toLocaleLowerCase();
        const without = current.foodNeeds.filter((need) => !(need.personId === input.personId && need.ingredientConcept === concept));
        const foodNeeds = input.present ? [...without, {
          id: `pending:${input.personId}:${concept}`,
          personId: input.personId,
          kind: 'must_avoid' as const,
          ingredientConcept: concept,
          displayLabel: input.displayLabel.trim(),
        }] : without;
        await mutateProjection({ ...current, foodNeeds }, () => repository.setFoodNeed(input));
      },
    };
  };
}

export function createHouseholdMealPreferencesStore(repository: HouseholdMealPreferencesRepository, cache: HouseholdMealPreferencesCache) {
  return createStore<HouseholdMealPreferencesStoreState>(initializer(repository, cache));
}

const lazyRepository: HouseholdMealPreferencesRepository = {
  load: () => createHouseholdMealPreferencesRepository().load(),
  setPreferences: async (input) => {
    const repository = createHouseholdMealPreferencesRepository();
    const current = await repository.load();
    if (!current || current.householdId !== input.householdId) throw new Error('Household meal preferences are not available.');
    await createMealPreferenceActions(repository).update({
      requestId: `native-meal-preferences-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      confirmed: true,
      expectedVersion: current.version,
      patch: {
        usualDinerCount: input.usualDinerCount,
        usualDinerPersonIds: input.usualDinerPersonIds,
        setupState: input.setupState,
      },
    });
  },
  setFoodNeed: async (input) => {
    const repository = createHouseholdMealPreferencesRepository();
    const current = await repository.load();
    if (!current) throw new Error('Household meal preferences are not available.');
    await createMealPreferenceActions(repository).update({
      requestId: `native-meal-food-need-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      confirmed: true,
      expectedVersion: current.version,
      patch: { foodNeedChanges: [input] },
    });
  },
  updateReviewed: (input) => createHouseholdMealPreferencesRepository().updateReviewed(input),
};

export const useHouseholdMealPreferencesStore = create<HouseholdMealPreferencesStoreState>(
  initializer(lazyRepository, householdMealPreferencesCache),
);
