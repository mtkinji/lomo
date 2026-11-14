import type { GroceryProjection } from './groceryRepository';
import {
  applyQueuedGroceryStates,
  createGroceryOfflineQueue,
  reconcileGroceryOfflineQueue,
  shouldStackGroceryItemLayout,
  syncGroceryOfflineQueue,
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
  it('preserves both items when two checks are queued before storage finishes', async () => {
    const queue = createGroceryOfflineQueue(storage());
    await Promise.all(['item-1', 'item-2'].map((itemId) => queue.enqueue('user-1', {
      listId: 'list-1', itemId, state: 'already_have', queuedAt: itemId,
    })));
    expect((await queue.read('user-1')).map((item) => item.itemId)).toEqual(['item-1', 'item-2']);
  });

  it('does not erase a new check while acknowledging an earlier save', async () => {
    const queue = createGroceryOfflineQueue(storage());
    const first = { listId: 'list-1', itemId: 'item-1', state: 'already_have' as const, queuedAt: 'first' };
    await queue.enqueue('user-1', first);
    await Promise.all([
      queue.enqueue('user-1', { ...first, itemId: 'item-2', queuedAt: 'second' }),
      queue.acknowledge('user-1', first),
    ]);
    expect((await queue.read('user-1')).map((item) => item.itemId)).toEqual(['item-2']);
  });

  it('keeps pending checks when device storage has a temporary read failure', async () => {
    const deviceStorage = storage();
    const queue = createGroceryOfflineQueue(deviceStorage);
    const mutation = { listId: 'list-1', itemId: 'item-1', state: 'already_have' as const, queuedAt: 'first' };
    await queue.enqueue('user-1', mutation);
    deviceStorage.getItem.mockRejectedValueOnce(new Error('storage temporarily unavailable'));

    await expect(queue.read('user-1')).rejects.toThrow('storage temporarily unavailable');
    expect(deviceStorage.removeItem).not.toHaveBeenCalled();
    expect(await queue.read('user-1')).toEqual([mutation]);
  });

  it('does not let acknowledgement of a check erase a newer undo on the same item', async () => {
    const queue = createGroceryOfflineQueue(storage());
    const check = { listId: 'list-1', itemId: 'item-1', state: 'already_have' as const, queuedAt: 'check' };
    const undo = { ...check, state: 'needed' as const, queuedAt: 'undo' };
    await queue.enqueue('user-1', check);
    await queue.enqueue('user-1', undo);
    await queue.acknowledge('user-1', check);
    expect(await queue.read('user-1')).toEqual([undo]);
  });

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

  it('keeps a newer undo visible while an older checked save completes', async () => {
    const queue = createGroceryOfflineQueue(storage());
    const check = { listId: 'list-1', itemId: 'item-1', state: 'already_have' as const, queuedAt: 'check' };
    await queue.enqueue('user-1', check);
    let finishSave!: (receipt: { groceryListId: string; itemId: string; revision: number; state: 'already_have' }) => void;
    let started!: () => void;
    const saving = new Promise<void>((resolve) => { started = resolve; });
    const setItemState = jest.fn(() => new Promise<{ groceryListId: string; itemId: string; revision: number; state: 'already_have' }>((resolve) => {
      finishSave = resolve;
      started();
    }));
    const reconciliation = reconcileGroceryOfflineQueue({ userId: 'user-1', lists: [list()], queue, setItemState });
    await saving;
    await queue.enqueue('user-1', { ...check, state: 'needed', queuedAt: 'undo' });
    finishSave({ groceryListId: 'list-1', itemId: 'item-1', revision: 5, state: 'already_have' });
    const result = await reconciliation;
    expect(result).toMatchObject({ pendingCount: 1, interrupted: false });
    expect(result.lists[0]).toMatchObject({ revision: 5, items: [expect.objectContaining({ state: 'needed' })] });
    expect(await queue.read('user-1')).toEqual([{ ...check, state: 'needed', queuedAt: 'undo' }]);
  });

  it('preserves an undo from another screen while the first screen is still saving the check', async () => {
    const queue = createGroceryOfflineQueue(storage());
    let server = list();
    const loadLists = jest.fn(async () => JSON.parse(JSON.stringify([server])) as GroceryProjection[]);
    let started!: () => void;
    const saving = new Promise<void>((resolve) => { started = resolve; });
    let release!: () => void;
    const delayedSave = new Promise<void>((resolve) => { release = resolve; });
    const setItemState = jest.fn(async (itemId: string, revision: number, state: GroceryProjection['items'][number]['state']) => {
      if (state === 'already_have') { started(); await delayedSave; }
      if (revision !== server.revision) throw new Error('revision conflict');
      server = { ...server, revision: revision + 1, items: server.items.map((item) => ({ ...item, state })) };
      return { groceryListId: server.id, itemId, revision: server.revision, state };
    });
    const check = { listId: server.id, itemId: 'item-1', state: 'already_have' as const, queuedAt: 'check' };
    await queue.enqueue('user-1', check);
    const firstScreen = syncGroceryOfflineQueue({ userId: 'user-1', queue, loadLists, setItemState });
    await saving;
    await queue.enqueue('user-1', { ...check, state: 'needed', queuedAt: 'undo' });
    const secondScreen = syncGroceryOfflineQueue({ userId: 'user-1', queue, loadLists, setItemState });
    for (let index = 0; index < 30; index += 1) await Promise.resolve();
    release();
    await Promise.all([firstScreen, secondScreen]);
    expect(server.items[0].state).toBe('needed');
    expect(setItemState).toHaveBeenLastCalledWith('item-1', 5, 'needed');
    expect(await queue.read('user-1')).toEqual([]);
  });

  it('retains a persisted check after relaunch while the server is unreachable', async () => {
    const deviceStorage = storage();
    const queue = createGroceryOfflineQueue(deviceStorage);
    await queue.enqueue('user-1', { listId: 'list-1', itemId: 'item-1', state: 'already_have', queuedAt: 'check' });
    const relaunchedQueue = createGroceryOfflineQueue(deviceStorage);
    const result = await reconcileGroceryOfflineQueue({ userId: 'user-1', lists: [list()], queue: relaunchedQueue,
      setItemState: jest.fn().mockRejectedValue(new Error('network offline')) });
    expect(result).toMatchObject({ pendingCount: 1, interrupted: true });
    expect(result.lists[0].items[0].state).toBe('already_have');
    expect(await relaunchedQueue.read('user-1')).toHaveLength(1);
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
