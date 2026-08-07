import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SaveRecipeInput } from './recipeRepository';
import { parseRecipeProjection, type RecipeProjection } from './recipeCache';

export type QueuedRecipeVersion = SaveRecipeInput & {
  optimisticProjection: RecipeProjection;
  queuedAt: string;
};

type Storage = Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>;
export const recipeOfflineQueueKey = (userId: string) => `kwilt.recipes.pending-versions.v1.${userId}`;

function parseQueued(value: unknown): QueuedRecipeVersion {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid queued Recipe version');
  const item = value as Partial<QueuedRecipeVersion>;
  if ((item.recipeId !== null && typeof item.recipeId !== 'string') || !Number.isInteger(item.expectedVersion) || (item.expectedVersion ?? -1) < 0 ||
      typeof item.idempotencyKey !== 'string' || !item.idempotencyKey || typeof item.queuedAt !== 'string' || !Number.isFinite(Date.parse(item.queuedAt))) {
    throw new Error('invalid queued Recipe version');
  }
  return {
    recipeId: item.recipeId ?? null,
    expectedVersion: item.expectedVersion as number,
    idempotencyKey: item.idempotencyKey,
    reviewedData: item.reviewedData,
    optimisticProjection: parseRecipeProjection(item.optimisticProjection),
    queuedAt: item.queuedAt,
  };
}

export function createRecipeOfflineQueue(storage: Storage) {
  const read = async (userId: string): Promise<QueuedRecipeVersion[]> => {
    try {
      const raw = await storage.getItem(recipeOfflineQueueKey(userId));
      if (!raw) return [];
      const parsed = JSON.parse(raw) as { mutations?: unknown };
      if (!Array.isArray(parsed.mutations)) throw new Error('invalid Recipe queue');
      return parsed.mutations.map(parseQueued);
    } catch {
      await storage.removeItem(recipeOfflineQueueKey(userId)).catch(() => undefined);
      return [];
    }
  };
  const write = async (userId: string, mutations: QueuedRecipeVersion[]) => {
    if (!mutations.length) return storage.removeItem(recipeOfflineQueueKey(userId));
    return storage.setItem(recipeOfflineQueueKey(userId), JSON.stringify({ mutations }));
  };
  return {
    read,
    async enqueue(userId: string, mutation: QueuedRecipeVersion) {
      const validated = parseQueued(mutation);
      const current = await read(userId);
      const next = current.filter((item) => item.idempotencyKey !== validated.idempotencyKey);
      next.push(validated);
      await write(userId, next);
      return next;
    },
    async acknowledge(userId: string, idempotencyKey: string) {
      const next = (await read(userId)).filter((item) => item.idempotencyKey !== idempotencyKey);
      await write(userId, next);
      return next;
    },
    clear(userId: string) { return storage.removeItem(recipeOfflineQueueKey(userId)); },
  };
}

export type RecipeOfflineQueue = ReturnType<typeof createRecipeOfflineQueue>;

export function applyPendingRecipeVersions(recipes: RecipeProjection[], pending: QueuedRecipeVersion[]): RecipeProjection[] {
  const next = recipes.map((projection) => ({ ...projection }));
  for (const mutation of [...pending].sort((left, right) => left.queuedAt.localeCompare(right.queuedAt))) {
    const recipeId = mutation.optimisticProjection.recipe.id;
    const index = next.findIndex((projection) => projection.recipe.id === recipeId);
    if (index >= 0) next[index] = mutation.optimisticProjection;
    else next.unshift(mutation.optimisticProjection);
  }
  return next;
}

export async function reconcileRecipeOfflineQueue({
  userId, queue, save,
}: {
  userId: string;
  queue: RecipeOfflineQueue;
  save(input: SaveRecipeInput): Promise<unknown>;
}) {
  const pending = await queue.read(userId);
  const conflicts: QueuedRecipeVersion[] = [];
  let syncedCount = 0;
  let interrupted = false;
  for (const mutation of pending) {
    try {
      await save({
        recipeId: mutation.recipeId,
        expectedVersion: mutation.expectedVersion,
        idempotencyKey: mutation.idempotencyKey,
        reviewedData: mutation.reviewedData,
      });
      await queue.acknowledge(userId, mutation.idempotencyKey);
      syncedCount += 1;
    } catch (error) {
      if ((error as { code?: string })?.code === 'stale_recipe_version') {
        conflicts.push(mutation);
      } else {
        interrupted = true;
      }
      break;
    }
  }
  return {
    syncedCount,
    pendingCount: (await queue.read(userId)).length,
    conflicts,
    interrupted,
  };
}

export const recipeOfflineQueue = createRecipeOfflineQueue(AsyncStorage);
