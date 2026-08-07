import { create } from 'zustand';
import { createStore, type StateCreator } from 'zustand/vanilla';

import { householdMealPreferencesCache, type HouseholdMealPreferencesCache } from '../data/householdMealPreferencesCache';
import {
  createHouseholdMealPreferencesRepository,
  type HouseholdMealPreferencesProjection,
  type HouseholdMealPreferencesRepository,
  type MealSetupState,
} from '../data/householdMealPreferencesRepository';

type Status = 'idle' | 'cached' | 'refreshing' | 'ready' | 'error';

export type HouseholdMealPreferencesStoreState = {
  userId: string | null;
  projection: HouseholdMealPreferencesProjection | null;
  status: Status;
  error: string | null;
  setIdentity(userId: string | null): Promise<void>;
  refresh(): Promise<void>;
  setSetupState(state: MealSetupState): Promise<void>;
  setUsualDiners(personIds: string[]): Promise<void>;
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
          usualDinerPersonIds: current.usualDinerPersonIds,
          setupState,
        }));
      },
      async setUsualDiners(personIds) {
        const current = get().projection;
        if (!current) throw new Error('Household meal preferences are not available.');
        const usualDinerPersonIds = [...new Set(personIds)];
        const optimistic = { ...current, usualDinerPersonIds };
        await mutateProjection(optimistic, () => repository.setPreferences({
          householdId: current.householdId,
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
  setPreferences: (input) => createHouseholdMealPreferencesRepository().setPreferences(input),
  setFoodNeed: (input) => createHouseholdMealPreferencesRepository().setFoodNeed(input),
};

export const useHouseholdMealPreferencesStore = create<HouseholdMealPreferencesStoreState>(
  initializer(lazyRepository, householdMealPreferencesCache),
);
