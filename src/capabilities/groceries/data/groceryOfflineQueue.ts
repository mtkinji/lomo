import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GroceryProjection } from './groceryRepository';

export type QueuedGroceryItemState = {
  listId: string;
  itemId: string;
  state: 'needed' | 'already_have' | 'purchased' | 'skipped';
  queuedAt: string;
};

type Storage = Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>;

export const groceryOfflineQueueKey = (userId: string) => `kwilt.groceries.pending-item-states.v1.${userId}`;

function isQueuedState(value: unknown): value is QueuedGroceryItemState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<QueuedGroceryItemState>;
  return typeof candidate.listId === 'string'
    && typeof candidate.itemId === 'string'
    && typeof candidate.queuedAt === 'string'
    && ['needed', 'already_have', 'purchased', 'skipped'].includes(candidate.state ?? '');
}

export function createGroceryOfflineQueue(storage: Storage) {
  const read = async (userId: string): Promise<QueuedGroceryItemState[]> => {
    try {
      const raw = await storage.getItem(groceryOfflineQueueKey(userId));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed?.mutations)) throw new Error('invalid grocery queue');
      return parsed.mutations.filter(isQueuedState);
    } catch {
      await storage.removeItem(groceryOfflineQueueKey(userId)).catch(() => undefined);
      return [];
    }
  };

  const write = async (userId: string, mutations: QueuedGroceryItemState[]) => {
    if (!mutations.length) {
      await storage.removeItem(groceryOfflineQueueKey(userId));
      return;
    }
    await storage.setItem(groceryOfflineQueueKey(userId), JSON.stringify({ mutations }));
  };

  return {
    read,
    async enqueue(userId: string, mutation: QueuedGroceryItemState) {
      const current = await read(userId);
      const next = current.filter((item) => item.listId !== mutation.listId || item.itemId !== mutation.itemId);
      next.push(mutation);
      await write(userId, next);
      return next;
    },
    async acknowledge(userId: string, mutation: QueuedGroceryItemState) {
      const current = await read(userId);
      const next = current.filter((item) => item.listId !== mutation.listId
        || item.itemId !== mutation.itemId
        || item.queuedAt !== mutation.queuedAt);
      await write(userId, next);
      return next;
    },
    clear(userId: string) {
      return storage.removeItem(groceryOfflineQueueKey(userId));
    },
  };
}

export type GroceryOfflineQueue = ReturnType<typeof createGroceryOfflineQueue>;

export function applyQueuedGroceryStates(
  lists: GroceryProjection[],
  mutations: QueuedGroceryItemState[],
): GroceryProjection[] {
  const stateByItem = new Map(mutations.map((mutation) => [`${mutation.listId}:${mutation.itemId}`, mutation.state]));
  return lists.map((list) => ({
    ...list,
    items: list.items.map((item) => ({
      ...item,
      state: stateByItem.get(`${list.id}:${item.id}`) ?? item.state,
    })),
  }));
}

export async function reconcileGroceryOfflineQueue({
  userId,
  lists,
  queue,
  setItemState,
}: {
  userId: string;
  lists: GroceryProjection[];
  queue: GroceryOfflineQueue;
  setItemState(
    itemId: string,
    expectedRevision: number,
    state: QueuedGroceryItemState['state'],
  ): Promise<{ groceryListId: string; itemId: string; revision: number; state: QueuedGroceryItemState['state'] }>;
}) {
  const pending = await queue.read(userId);
  let authoritative = lists.map((list) => ({ ...list, items: list.items.map((item) => ({ ...item })) }));
  let syncedCount = 0;
  let interrupted = false;

  for (const mutation of pending) {
    const list = authoritative.find((item) => item.id === mutation.listId);
    const item = list?.items.find((candidate) => candidate.id === mutation.itemId);
    if (!list || !item) continue;
    try {
      if (list.status === 'stale') {
        await queue.acknowledge(userId, mutation);
        syncedCount += 1;
        continue;
      }
      if (item.state === mutation.state) {
        await queue.acknowledge(userId, mutation);
        syncedCount += 1;
        continue;
      }
      const receipt = await setItemState(item.id, list.revision, mutation.state);
      list.revision = receipt.revision;
      item.state = receipt.state;
      await queue.acknowledge(userId, mutation);
      syncedCount += 1;
    } catch {
      interrupted = true;
      break;
    }
  }

  const remaining = await queue.read(userId);
  return {
    lists: applyQueuedGroceryStates(authoritative, remaining),
    syncedCount,
    pendingCount: remaining.length,
    interrupted,
  };
}

export function shouldStackGroceryItemLayout({ width, fontScale }: { width: number; fontScale: number }): boolean {
  return width < 390 || fontScale >= 1.35;
}

export const groceryOfflineQueue = createGroceryOfflineQueue(AsyncStorage);
