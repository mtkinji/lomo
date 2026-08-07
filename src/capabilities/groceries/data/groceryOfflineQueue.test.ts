import type { GroceryProjection } from './groceryRepository';
import {
  applyQueuedGroceryStates,
  createGroceryOfflineQueue,
  reconcileGroceryOfflineQueue,
  shouldStackGroceryItemLayout,
} from './groceryOfflineQueue';

function list(overrides: Partial<GroceryProjection> = {}): GroceryProjection {
  return {
    id: 'list-1',
    revision: 4,
    status: 'ready',
    sourceKind: 'meal_plan',
    sourceMealPlanId: 'plan-1',
    sourceMealPlanVersion: 2,
    sourceRecipeVersionId: null,
    sourceTitle: null,
    updatedAt: '2026-08-07T01:00:00.000Z',
    items: [{
      id: 'item-1',
      concept: 'Milk',
      quantityMin: 1,
      quantityMax: null,
      unit: 'gallon',
      aisle: 'dairy_eggs',
      originalDisplayTexts: ['1 gallon milk'],
      reviewReason: null,
      state: 'needed',
      note: null,
      sources: [],
    }],
    ...overrides,
  };
}

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: jest.fn(async (key: string) => values.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { values.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { values.delete(key); }),
  };
}

describe('offline grocery state queue', () => {
  it('coalesces repeated item checks and overlays the latest device-local state', async () => {
    const queue = createGroceryOfflineQueue(storage());
    await queue.enqueue('user-1', { listId: 'list-1', itemId: 'item-1', state: 'already_have', queuedAt: '2026-08-07T01:01:00.000Z' });
    await queue.enqueue('user-1', { listId: 'list-1', itemId: 'item-1', state: 'needed', queuedAt: '2026-08-07T01:02:00.000Z' });

    const pending = await queue.read('user-1');
    expect(pending).toHaveLength(1);
    expect(applyQueuedGroceryStates([list()], pending)[0].items[0].state).toBe('needed');
  });

  it('replays against the latest authoritative revision and clears only acknowledged changes', async () => {
    const queue = createGroceryOfflineQueue(storage());
    const first = { listId: 'list-1', itemId: 'item-1', state: 'already_have' as const, queuedAt: '2026-08-07T01:01:00.000Z' };
    await queue.enqueue('user-1', first);
    const setItemState = jest.fn().mockResolvedValue({ groceryListId: 'list-1', itemId: 'item-1', revision: 5, state: 'already_have' });

    const result = await reconcileGroceryOfflineQueue({
      userId: 'user-1',
      lists: [list()],
      queue,
      setItemState,
    });

    expect(setItemState).toHaveBeenCalledWith('item-1', 4, 'already_have');
    expect(result).toMatchObject({ syncedCount: 1, pendingCount: 0, interrupted: false });
    expect(result.lists[0]).toMatchObject({ revision: 5, items: [expect.objectContaining({ state: 'already_have' })] });
    expect(await queue.read('user-1')).toEqual([]);
  });

  it('keeps a queued change when reconciliation is interrupted', async () => {
    const queue = createGroceryOfflineQueue(storage());
    await queue.enqueue('user-1', { listId: 'list-1', itemId: 'item-1', state: 'already_have', queuedAt: '2026-08-07T01:01:00.000Z' });

    const result = await reconcileGroceryOfflineQueue({
      userId: 'user-1',
      lists: [list()],
      queue,
      setItemState: jest.fn().mockRejectedValue(new Error('network down')),
    });

    expect(result).toMatchObject({ syncedCount: 0, pendingCount: 1, interrupted: true });
    expect(result.lists[0].items[0].state).toBe('already_have');
  });

  it('discards a stale-list mutation and keeps the authoritative state', async () => {
    const queue = createGroceryOfflineQueue(storage());
    await queue.enqueue('user-1', { listId: 'list-1', itemId: 'item-1', state: 'needed', queuedAt: '2026-08-07T01:01:00.000Z' });

    const result = await reconcileGroceryOfflineQueue({
      userId: 'user-1',
      lists: [list({ status: 'stale', items: [
        { ...list().items[0], state: 'already_have' },
      ] })],
      queue,
      setItemState: jest.fn(),
    });

    expect(result).toMatchObject({ syncedCount: 1, pendingCount: 0, interrupted: false });
    expect(result.lists[0].items[0].state).toBe('already_have');
    expect(await queue.read('user-1')).toEqual([]);
  });

  it('stacks rows for small viewports or accessibility text sizes', () => {
    expect(shouldStackGroceryItemLayout({ width: 375, fontScale: 1 })).toBe(true);
    expect(shouldStackGroceryItemLayout({ width: 320, fontScale: 1 })).toBe(true);
    expect(shouldStackGroceryItemLayout({ width: 390, fontScale: 1 })).toBe(false);
    expect(shouldStackGroceryItemLayout({ width: 430, fontScale: 1.5 })).toBe(true);
  });
});
