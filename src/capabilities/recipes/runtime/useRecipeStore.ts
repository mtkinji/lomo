import { create } from 'zustand';
import { createStore, type StateCreator } from 'zustand/vanilla';

import { recipeCache, type RecipeCache, type RecipeProjection } from '../data/recipeCache';
import { catalogMediaCache, type CatalogMediaCache } from '../data/catalogMediaCache';
import { createCatalogMediaRepository, type CatalogMediaRepository } from '../data/catalogMediaRepository';
import { replaceHostedCatalogMedia } from '../data/catalogMediaOverlay';
import {
  applyPendingRecipeVersions,
  recipeOfflineQueue,
  reconcileRecipeOfflineQueue,
  type RecipeOfflineQueue,
} from '../data/recipeOfflineQueue';
import { createRecipeRepository, type RecipeRepository, type SaveRecipeInput } from '../data/recipeRepository';

export type RecipeStoreStatus = 'idle' | 'cached' | 'refreshing' | 'ready' | 'error';

export type RecipeStoreState = {
  userId: string | null;
  recipes: RecipeProjection[];
  status: RecipeStoreStatus;
  error: string | null;
  pendingCount: number;
  pendingRecipeIds: string[];
  setIdentity(userId: string | null): Promise<void>;
  refresh(): Promise<void>;
  save(input: SaveRecipeInput, optimisticProjection: RecipeProjection): Promise<void>;
  delete(recipeId: string, expectedVersion: number): Promise<void>;
};

function shouldQueueRecipeSave(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  if (code === 'recipe_repository_failed') return true;
  if (code) return false;
  const message = error instanceof Error ? error.message : String(error);
  return /offline|network|fetch|timeout|connection/i.test(message);
}

type HostedMediaDependencies = { repository: CatalogMediaRepository; cache: CatalogMediaCache };

function initializer(
  repository: RecipeRepository,
  cache: RecipeCache,
  queue: RecipeOfflineQueue,
  hostedMedia: HostedMediaDependencies | null = null,
): StateCreator<RecipeStoreState> {
  return (set, get) => ({
    userId: null,
    recipes: [],
    status: 'idle',
    error: null,
    pendingCount: 0,
    pendingRecipeIds: [],
    async setIdentity(userId) {
      replaceHostedCatalogMedia([], { allowEmpty: true });
      set({ userId, recipes: [], status: 'idle', error: null, pendingCount: 0, pendingRecipeIds: [] });
      if (!userId) return;
      const [cached, pending, hosted] = await Promise.all([
        cache.read(userId),
        queue.read(userId),
        hostedMedia?.cache.read(userId) ?? Promise.resolve([]),
      ]);
      if (get().userId !== userId) return;
      replaceHostedCatalogMedia(hosted);
      const available = applyPendingRecipeVersions(cached, pending);
      set({
        recipes: available,
        status: available.length ? 'cached' : 'idle',
        pendingCount: pending.length,
        pendingRecipeIds: [...new Set(pending.map((item) => item.optimisticProjection.recipe.id))],
      });
      await get().refresh();
    },
    async refresh() {
      const userId = get().userId;
      if (!userId) return;
      const hasCached = get().recipes.length > 0;
      set({ status: hasCached ? 'refreshing' : 'idle', error: null });
      try {
        const sync = await reconcileRecipeOfflineQueue({ userId, queue, save: repository.save });
        const [canonical, hostedResult] = await Promise.all([
          repository.list(),
          hostedMedia?.repository.list().catch(() => []) ?? Promise.resolve([]),
        ]);
        if (hostedResult.length) {
          replaceHostedCatalogMedia(hostedResult);
          await hostedMedia?.cache.write(userId, hostedResult);
        }
        const pending = await queue.read(userId);
        const recipes = applyPendingRecipeVersions(canonical, pending);
        if (get().userId !== userId) return;
        set({
          recipes,
          status: 'ready',
          pendingCount: pending.length,
          pendingRecipeIds: [...new Set(pending.map((item) => item.optimisticProjection.recipe.id))],
          error: sync.conflicts.length ? 'This recipe also changed elsewhere. Review both versions before syncing.' : null,
        });
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
        if ((error as { code?: string })?.code === 'stale_recipe_version') {
          set({ recipes: previous, status: 'error', error: error instanceof Error ? error.message : String(error) });
          await get().refresh();
          throw error;
        }
        if (input.recipeId !== null && shouldQueueRecipeSave(error)) {
          const pending = await queue.enqueue(userId, { ...input, optimisticProjection, queuedAt: new Date().toISOString() });
          await cache.write(userId, optimistic);
          set({
            recipes: optimistic,
            status: 'ready',
            error: null,
            pendingCount: pending.length,
            pendingRecipeIds: [...new Set(pending.map((item) => item.optimisticProjection.recipe.id))],
          });
          return;
        }
        set({ recipes: previous, status: 'error', error: error instanceof Error ? error.message : String(error) });
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

export function createRecipeStore(
  repository: RecipeRepository,
  cache: RecipeCache,
  queue: RecipeOfflineQueue = recipeOfflineQueue,
  hostedMedia: HostedMediaDependencies | null = null,
) {
  return createStore<RecipeStoreState>(initializer(repository, cache, queue, hostedMedia));
}

const lazyRecipeRepository: RecipeRepository = {
  list: () => createRecipeRepository().list(),
  save: (input) => createRecipeRepository().save(input),
  delete: (recipeId, expectedVersion) => createRecipeRepository().delete(recipeId, expectedVersion),
};

const hostedMediaDependencies: HostedMediaDependencies = {
  repository: { list: () => createCatalogMediaRepository().list() },
  cache: catalogMediaCache,
};

export const useRecipeStore = create<RecipeStoreState>(
  initializer(lazyRecipeRepository, recipeCache, recipeOfflineQueue, hostedMediaDependencies),
);
