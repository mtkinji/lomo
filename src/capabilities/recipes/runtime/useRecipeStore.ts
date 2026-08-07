import { create } from 'zustand';
import { createStore, type StateCreator } from 'zustand/vanilla';

import { recipeCache, type RecipeCache, type RecipeProjection } from '../data/recipeCache';
import { createRecipeRepository, type RecipeRepository, type SaveRecipeInput } from '../data/recipeRepository';

export type RecipeStoreStatus = 'idle' | 'cached' | 'refreshing' | 'ready' | 'error';

export type RecipeStoreState = {
  userId: string | null;
  recipes: RecipeProjection[];
  status: RecipeStoreStatus;
  error: string | null;
  setIdentity(userId: string | null): Promise<void>;
  refresh(): Promise<void>;
  save(input: SaveRecipeInput, optimisticProjection: RecipeProjection): Promise<void>;
  delete(recipeId: string, expectedVersion: number): Promise<void>;
};

function initializer(repository: RecipeRepository, cache: RecipeCache): StateCreator<RecipeStoreState> {
  return (set, get) => ({
    userId: null,
    recipes: [],
    status: 'idle',
    error: null,
    async setIdentity(userId) {
      set({ userId, recipes: [], status: userId ? 'idle' : 'idle', error: null });
      if (!userId) return;
      const cached = await cache.read(userId);
      if (get().userId !== userId) return;
      set({ recipes: cached, status: cached.length ? 'cached' : 'idle' });
      await get().refresh();
    },
    async refresh() {
      const userId = get().userId;
      if (!userId) return;
      const hasCached = get().recipes.length > 0;
      set({ status: hasCached ? 'refreshing' : 'idle', error: null });
      try {
        const recipes = await repository.list();
        if (get().userId !== userId) return;
        set({ recipes, status: 'ready', error: null });
        await cache.write(userId, recipes);
      } catch (error) {
        if (get().userId !== userId) return;
        set({ status: 'error', error: error instanceof Error ? error.message : String(error) });
      }
    },
    async save(input, optimisticProjection) {
      const userId = get().userId;
      if (!userId) throw new Error('Recipe identity is required.');
      const previous = get().recipes;
      const optimistic = input.recipeId
        ? previous.map((item) => item.recipe.id === input.recipeId ? optimisticProjection : item)
        : [optimisticProjection, ...previous];
      set({ recipes: optimistic, status: 'ready', error: null });
      try {
        await repository.save(input);
        await get().refresh();
      } catch (error) {
        set({ recipes: previous, status: 'error', error: error instanceof Error ? error.message : String(error) });
        if ((error as { code?: string })?.code === 'stale_recipe_version') await get().refresh();
        throw error;
      }
    },
    async delete(recipeId, expectedVersion) {
      const userId = get().userId;
      if (!userId) throw new Error('Recipe identity is required.');
      const previous = get().recipes;
      const next = previous.filter((item) => item.recipe.id !== recipeId);
      set({ recipes: next, error: null });
      try {
        await repository.delete(recipeId, expectedVersion);
        await cache.write(userId, next);
      } catch (error) {
        set({ recipes: previous, status: 'error', error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    },
  });
}

export function createRecipeStore(repository: RecipeRepository, cache: RecipeCache) {
  return createStore<RecipeStoreState>(initializer(repository, cache));
}

const lazyRecipeRepository: RecipeRepository = {
  list: () => createRecipeRepository().list(),
  save: (input) => createRecipeRepository().save(input),
  delete: (recipeId, expectedVersion) => createRecipeRepository().delete(recipeId, expectedVersion),
};

export const useRecipeStore = create<RecipeStoreState>(initializer(lazyRecipeRepository, recipeCache));
