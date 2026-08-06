import { createRecipeStore } from './useRecipeStore';
import { recipeContractFixture, recipeVersionContractFixture } from '../domain/recipeContractFixtures';

describe('Recipe store', () => {
  const projection = { recipe: recipeContractFixture(), currentVersion: recipeVersionContractFixture() };

  it('clears in-memory data synchronously on account switch, then shows cache while refreshing', async () => {
    let finishRefresh: ((value: typeof projection[]) => void) | undefined;
    const repository = { list: jest.fn(() => new Promise<typeof projection[]>((resolve) => { finishRefresh = resolve; })) };
    const cache = { read: jest.fn(async (userId: string) => userId === 'user-b' ? [projection] : []), write: jest.fn(), clear: jest.fn() };
    const store = createRecipeStore(repository as never, cache as never);
    store.setState({ userId: 'user-a', recipes: [projection], status: 'ready' });
    const switching = store.getState().setIdentity('user-b');
    expect(store.getState().recipes).toEqual([]);
    await Promise.resolve();
    expect(store.getState()).toMatchObject({ userId: 'user-b', recipes: [projection], status: 'refreshing' });
    finishRefresh?.([projection]);
    await switching;
    expect(store.getState().status).toBe('ready');
  });

  it('rolls back an optimistic save and preserves the error', async () => {
    const repository = { list: jest.fn(), save: jest.fn().mockRejectedValue(new Error('offline')) };
    const cache = { read: jest.fn(), write: jest.fn(), clear: jest.fn() };
    const store = createRecipeStore(repository as never, cache as never);
    store.setState({ userId: 'user-a', recipes: [projection], status: 'ready' });
    const optimistic = { ...projection, recipe: { ...projection.recipe, id: 'optimistic' } };
    await expect(store.getState().save({ recipeId: null, expectedVersion: 0, idempotencyKey: 'save-1', reviewedData: { title: 'New' } }, optimistic)).rejects.toThrow('offline');
    expect(store.getState().recipes).toEqual([projection]);
    expect(store.getState().status).toBe('error');
  });

  it('refreshes canonical data after a stale-version save failure', async () => {
    const latest = { ...projection, currentVersion: { ...projection.currentVersion, version: 2 } };
    const stale = Object.assign(new Error('stale'), { code: 'stale_recipe_version' });
    const repository = { list: jest.fn().mockResolvedValue([latest]), save: jest.fn().mockRejectedValue(stale) };
    const cache = { read: jest.fn(), write: jest.fn(), clear: jest.fn() };
    const store = createRecipeStore(repository as never, cache as never);
    store.setState({ userId: 'user-a', recipes: [projection], status: 'ready' });
    await expect(store.getState().save({ recipeId: projection.recipe.id, expectedVersion: 1, idempotencyKey: 'save-2', reviewedData: { title: 'Edit' } }, projection)).rejects.toBe(stale);
    expect(store.getState().recipes[0].currentVersion.version).toBe(2);
  });

  it('removes a deleted recipe and updates the scoped cache', async () => {
    const repository = { list: jest.fn(), delete: jest.fn().mockResolvedValue(undefined) };
    const cache = { read: jest.fn(), write: jest.fn(), clear: jest.fn() };
    const store = createRecipeStore(repository as never, cache as never);
    store.setState({ userId: 'user-a', recipes: [projection], status: 'ready' });
    await store.getState().delete(projection.recipe.id, projection.currentVersion.version);
    expect(store.getState().recipes).toEqual([]);
    expect(cache.write).toHaveBeenCalledWith('user-a', []);
  });
});
