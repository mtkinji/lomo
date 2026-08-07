import { recipeContractFixture, recipeVersionContractFixture } from '../domain/recipeContractFixtures';
import {
  applyPendingRecipeVersions,
  createRecipeOfflineQueue,
  reconcileRecipeOfflineQueue,
  type QueuedRecipeVersion,
} from './recipeOfflineQueue';

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => { values.set(key, value); },
    removeItem: async (key: string) => { values.delete(key); },
  };
}

const projection = { recipe: recipeContractFixture(), currentVersion: recipeVersionContractFixture() };
const pending = (overrides: Partial<QueuedRecipeVersion> = {}): QueuedRecipeVersion => ({
  recipeId: projection.recipe.id,
  expectedVersion: 1,
  idempotencyKey: 'recipe-save:offline-1',
  reviewedData: { title: 'Updated cake' },
  optimisticProjection: {
    recipe: { ...projection.recipe, currentVersionId: 'local-version-2', updatedAt: '2026-08-07T12:00:00.000Z' },
    currentVersion: {
      ...projection.currentVersion,
      id: 'local-version-2', version: 2, title: 'Updated cake', createdAt: '2026-08-07T12:00:00.000Z',
      ingredients: projection.currentVersion.ingredients.map((line) => ({ ...line, recipeVersionId: 'local-version-2' })),
      instructions: projection.currentVersion.instructions.map((step) => ({ ...step, recipeVersionId: 'local-version-2' })),
    },
  },
  queuedAt: '2026-08-07T12:00:00.000Z',
  ...overrides,
});

describe('Recipe offline queue', () => {
  it('scopes pending versions to the account and deduplicates idempotent retries', async () => {
    const queue = createRecipeOfflineQueue(storage());
    await queue.enqueue('user-a', pending());
    await queue.enqueue('user-a', pending({ queuedAt: '2026-08-07T12:01:00.000Z' }));
    await expect(queue.read('user-a')).resolves.toHaveLength(1);
    await expect(queue.read('user-b')).resolves.toEqual([]);
  });

  it('makes the latest pending version current without erasing other recipes', () => {
    const other = {
      recipe: { ...projection.recipe, id: 'other-recipe', currentVersionId: 'other-version' },
      currentVersion: { ...projection.currentVersion, id: 'other-version', recipeId: 'other-recipe' },
    };
    const applied = applyPendingRecipeVersions([projection, other], [pending()]);
    expect(applied.map((item) => item.currentVersion.id)).toEqual(['local-version-2', 'other-version']);
  });

  it('acknowledges successful sync and stops with both sides preserved on a stale conflict', async () => {
    const queue = createRecipeOfflineQueue(storage());
    await queue.enqueue('user-a', pending());
    const save = jest.fn().mockResolvedValue({ recipeId: projection.recipe.id, version: 2 });
    await expect(reconcileRecipeOfflineQueue({ userId: 'user-a', queue, save })).resolves.toMatchObject({
      syncedCount: 1,
      pendingCount: 0,
      conflicts: [],
    });

    await queue.enqueue('user-a', pending({ idempotencyKey: 'recipe-save:offline-2' }));
    const stale = Object.assign(new Error('stale'), { code: 'stale_recipe_version' });
    const conflict = await reconcileRecipeOfflineQueue({ userId: 'user-a', queue, save: jest.fn().mockRejectedValue(stale) });
    expect(conflict).toMatchObject({ syncedCount: 0, pendingCount: 1, interrupted: false });
    expect(conflict.conflicts).toEqual([expect.objectContaining({ idempotencyKey: 'recipe-save:offline-2' })]);
    await expect(queue.read('user-a')).resolves.toHaveLength(1);
  });
});
