import { create } from 'zustand';
import { createStore, type StateCreator } from 'zustand/vanilla';

import { recipeFavoriteCache, type RecipeFavoriteCache } from '../data/recipeFavoriteCache';
import { createRecipeFavoriteRepository, type RecipeFavoriteRepository } from '../data/recipeFavoriteRepository';
import { createHiddenRecipeRepository } from '../data/hiddenRecipeRepository';
import { createRecipeControlActions } from '../actions/recipeControlActions';

type RecipeFavoriteStatus = 'idle' | 'cached' | 'refreshing' | 'ready' | 'error';

export type RecipeFavoriteStoreState = {
  userId: string | null;
  recipeIds: string[];
  togglingRecipeIds: string[];
  status: RecipeFavoriteStatus;
  error: string | null;
  setIdentity(userId: string | null): Promise<void>;
  refresh(): Promise<void>;
  toggle(recipeId: string): Promise<void>;
};

function initializer(repository: RecipeFavoriteRepository, cache: RecipeFavoriteCache): StateCreator<RecipeFavoriteStoreState> {
  return (set, get) => ({
    userId: null,
    recipeIds: [],
    togglingRecipeIds: [],
    status: 'idle',
    error: null,
    async setIdentity(userId) {
      set({ userId, recipeIds: [], togglingRecipeIds: [], status: 'idle', error: null });
      if (!userId) return;
      const cached = await cache.read(userId);
      if (get().userId !== userId) return;
      set({ recipeIds: cached, status: cached.length ? 'cached' : 'idle' });
      await get().refresh();
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
    async toggle(recipeId) {
      const { userId, recipeIds, togglingRecipeIds } = get();
      if (!userId) throw new Error('Recipe favorite identity is required.');
      if (togglingRecipeIds.includes(recipeId)) return;
      const wasFavorite = recipeIds.includes(recipeId);
      const optimistic = wasFavorite
        ? recipeIds.filter((id) => id !== recipeId)
        : [...recipeIds, recipeId];
      set({ recipeIds: optimistic, togglingRecipeIds: [...togglingRecipeIds, recipeId], error: null });
      try {
        await repository.set(recipeId, !wasFavorite);
        const current = get().recipeIds;
        await cache.write(userId, current);
        set({ togglingRecipeIds: get().togglingRecipeIds.filter((id) => id !== recipeId) });
      } catch (error) {
        const current = get().recipeIds;
        const rolledBack = wasFavorite
          ? [recipeId, ...current.filter((id) => id !== recipeId)]
          : current.filter((id) => id !== recipeId);
        set({
          recipeIds: rolledBack,
          togglingRecipeIds: get().togglingRecipeIds.filter((id) => id !== recipeId),
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        });
        await Promise.resolve(cache.write(userId, rolledBack)).catch(() => undefined);
        throw error;
      }
    },
  });
}

export function createRecipeFavoriteStore(repository: RecipeFavoriteRepository, cache: RecipeFavoriteCache) {
  return createStore<RecipeFavoriteStoreState>(initializer(repository, cache));
}

const lazyRepository: RecipeFavoriteRepository = {
  list: () => createRecipeFavoriteRepository().list(),
  set: async (recipeRef, favorite) => {
    const favoriteRepository = createRecipeFavoriteRepository();
    const actions = createRecipeControlActions({ favorite: favoriteRepository, hidden: createHiddenRecipeRepository() });
    const current = await favoriteRepository.list();
    await actions.setFavorite({
      requestId: `native-recipe-favorite-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      confirmed: true,
      recipeId: recipeRef,
      expectedVersion: current.includes(recipeRef) ? 1 : 0,
      favorite,
    });
  },
};

export const useRecipeFavoriteStore = create<RecipeFavoriteStoreState>(initializer(lazyRepository, recipeFavoriteCache));
