import { create } from 'zustand';
import { createStore, type StateCreator } from 'zustand/vanilla';

import { hiddenRecipeCache, type HiddenRecipeCache } from '../data/hiddenRecipeCache';
import { createHiddenRecipeRepository, type HiddenRecipeRepository } from '../data/hiddenRecipeRepository';
import { createRecipeFavoriteRepository } from '../data/recipeFavoriteRepository';
import { createRecipeControlActions } from '../actions/recipeControlActions';

type HiddenRecipeStatus = 'idle' | 'cached' | 'refreshing' | 'ready' | 'error';
const LOCAL_IDENTITY = 'local';

export type HiddenRecipeStoreState = {
  userId: string | null;
  recipeIds: string[];
  mutatingRecipeIds: string[];
  status: HiddenRecipeStatus;
  error: string | null;
  setIdentity(userId: string | null): Promise<void>;
  refresh(): Promise<void>;
  setHidden(recipeId: string, hidden: boolean): Promise<void>;
};

function initializer(repository: HiddenRecipeRepository, cache: HiddenRecipeCache): StateCreator<HiddenRecipeStoreState> {
  return (set, get) => ({
    userId: null,
    recipeIds: [],
    mutatingRecipeIds: [],
    status: 'idle',
    error: null,
    async setIdentity(userId) {
      const identity = userId ?? LOCAL_IDENTITY;
      set({ userId, recipeIds: [], mutatingRecipeIds: [], status: 'idle', error: null });
      const cached = await cache.read(identity);
      if (get().userId !== userId) return;
      set({ recipeIds: cached, status: cached.length ? 'cached' : 'idle' });
      if (userId) await get().refresh();
      else set({ status: 'ready' });
    },
    async refresh() {
      const userId = get().userId;
      if (!userId) return;
      set({ status: get().recipeIds.length ? 'refreshing' : 'idle', error: null });
      try {
        const recipeIds = await repository.list();
        if (get().userId !== userId) return;
        set({ recipeIds, status: 'ready', error: null });
        await cache.write(userId, recipeIds);
      } catch (error) {
        if (get().userId !== userId) return;
        set({ status: 'error', error: error instanceof Error ? error.message : String(error) });
      }
    },
    async setHidden(recipeId, hidden) {
      const { userId, recipeIds, mutatingRecipeIds } = get();
      if (mutatingRecipeIds.includes(recipeId)) return;
      const identity = userId ?? LOCAL_IDENTITY;
      const wasHidden = recipeIds.includes(recipeId);
      if (wasHidden === hidden) return;
      const optimistic = hidden
        ? [...recipeIds, recipeId]
        : recipeIds.filter((id) => id !== recipeId);
      set({ recipeIds: optimistic, mutatingRecipeIds: [...mutatingRecipeIds, recipeId], error: null });
      try {
        if (userId) await repository.set(recipeId, hidden);
        if (get().userId !== userId) return;
        await cache.write(identity, get().recipeIds);
        set({ mutatingRecipeIds: get().mutatingRecipeIds.filter((id) => id !== recipeId) });
      } catch (error) {
        if (get().userId !== userId) throw error;
        const current = get().recipeIds;
        const rolledBack = wasHidden
          ? [...current.filter((id) => id !== recipeId), recipeId]
          : current.filter((id) => id !== recipeId);
        set({
          recipeIds: rolledBack,
          mutatingRecipeIds: get().mutatingRecipeIds.filter((id) => id !== recipeId),
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        });
        await Promise.resolve(cache.write(identity, rolledBack)).catch(() => undefined);
        throw error;
      }
    },
  });
}

export function createHiddenRecipeStore(repository: HiddenRecipeRepository, cache: HiddenRecipeCache) {
  return createStore<HiddenRecipeStoreState>(initializer(repository, cache));
}

const lazyRepository: HiddenRecipeRepository = {
  list: () => createHiddenRecipeRepository().list(),
  set: async (recipeRef, hidden) => {
    const hiddenRepository = createHiddenRecipeRepository();
    const actions = createRecipeControlActions({ favorite: createRecipeFavoriteRepository(), hidden: hiddenRepository });
    const current = await hiddenRepository.list();
    await actions.setVisibility({
      requestId: `native-recipe-visibility-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      confirmed: true,
      recipeId: recipeRef,
      expectedVersion: current.includes(recipeRef) ? 1 : 0,
      visibility: hidden ? 'hidden' : 'visible',
    });
  },
};

export const useHiddenRecipeStore = create<HiddenRecipeStoreState>(initializer(lazyRepository, hiddenRecipeCache));
