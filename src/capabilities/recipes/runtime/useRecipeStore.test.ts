import { createRecipeStore } from './useRecipeStore';
import { recipeContractFixture, recipeVersionContractFixture } from '../domain/recipeContractFixtures';

describe('Recipe store', () => {
  const projection = { recipe: recipeContractFixture(), currentVersion: recipeVersionContractFixture() };
  const catalogProjection = {
    recipe: {
      ...recipeContractFixture(),
      id: 'catalog-recipe',
      currentVersionId: 'catalog-version',
      provenance: {
        ...recipeContractFixture().provenance,
        method: 'catalog' as const,
        rightsBasis: 'kwilt_authored' as const,
      },
      lineage: [],
    },
    currentVersion: {
      ...recipeVersionContractFixture(),
      id: 'catalog-version',
      recipeId: 'catalog-recipe',
    },
  };
  const queue = () => ({ read: jest.fn().mockResolvedValue([]), enqueue: jest.fn().mockResolvedValue([]), acknowledge: jest.fn(), clear: jest.fn() });

  it('clears in-memory data synchronously on account switch, then shows cache while refreshing', async () => {
    let finishRefresh: ((value: typeof projection[]) => void) | undefined;
    const repository = { list: jest.fn(() => new Promise<typeof projection[]>((resolve) => { finishRefresh = resolve; })) };
    const cache = { read: jest.fn(async (userId: string) => userId === 'user-b' ? [projection] : []), write: jest.fn(), clear: jest.fn() };
    const store = createRecipeStore(repository as never, cache as never, queue() as never);
    store.setState({ userId: 'user-a', recipes: [projection], status: 'ready' });
    const switching = store.getState().setIdentity('user-b');
    expect(store.getState().recipes).toEqual([]);
    for (let index = 0; index < 10 && !finishRefresh; index += 1) await Promise.resolve();
    expect(finishRefresh).toBeDefined();
    expect(store.getState()).toMatchObject({ userId: 'user-b', recipes: [projection], status: 'refreshing' });
    finishRefresh?.([projection]);
    await switching;
    expect(store.getState().status).toBe('ready');
  });

  it('merges the complete hosted catalog into the recipe inventory on refresh', async () => {
    const repository = { list: jest.fn().mockResolvedValue([projection]) };
    const cache = { read: jest.fn().mockResolvedValue([]), write: jest.fn(), clear: jest.fn() };
    const hostedCatalog = {
      repository: { list: jest.fn().mockResolvedValue([catalogProjection]) },
      cache: { read: jest.fn().mockResolvedValue([]), write: jest.fn() },
    };
    const store = createRecipeStore(
      repository as never,
      cache as never,
      queue() as never,
      hostedCatalog as never,
    );

    await store.getState().setIdentity('user-a');

    expect(store.getState().recipes).toEqual([projection, catalogProjection]);
    expect(cache.write).toHaveBeenCalledWith('user-a', [projection, catalogProjection]);
  });

  it('keeps the last-known-good hosted catalog when a refresh is empty', async () => {
    const repository = { list: jest.fn().mockResolvedValue([projection]) };
    const cache = { read: jest.fn().mockResolvedValue([catalogProjection]), write: jest.fn(), clear: jest.fn() };
    const hostedCatalog = {
      repository: { list: jest.fn().mockResolvedValue([]) },
      cache: { read: jest.fn().mockResolvedValue([catalogProjection]), write: jest.fn() },
    };
    const store = createRecipeStore(
      repository as never,
      cache as never,
      queue() as never,
      hostedCatalog as never,
    );

    await store.getState().setIdentity('user-a');

    expect(store.getState().recipes).toEqual([projection, catalogProjection]);
    expect(hostedCatalog.cache.write).not.toHaveBeenCalled();
  });

  it('keeps an optimistic version available and queues it when save is offline', async () => {
    const repository = { list: jest.fn(), save: jest.fn().mockRejectedValue(new Error('offline')) };
    const cache = { read: jest.fn(), write: jest.fn(), clear: jest.fn() };
    const pendingQueue = queue();
    pendingQueue.enqueue.mockImplementation(async (_userId, mutation) => [mutation]);
    const store = createRecipeStore(repository as never, cache as never, pendingQueue as never);
    store.setState({ userId: 'user-a', recipes: [projection], status: 'ready' });
    const optimistic = {
      recipe: { ...projection.recipe, currentVersionId: 'version-2' },
      currentVersion: {
        ...projection.currentVersion,
        id: 'version-2',
        version: 2,
        ingredients: projection.currentVersion.ingredients.map((line) => ({ ...line, recipeVersionId: 'version-2' })),
        instructions: projection.currentVersion.instructions.map((step) => ({ ...step, recipeVersionId: 'version-2' })),
      },
    };
    await store.getState().save({ recipeId: projection.recipe.id, expectedVersion: 1, idempotencyKey: 'save-1', reviewedData: { title: 'New' } }, optimistic);
    expect(store.getState()).toMatchObject({ recipes: [optimistic], status: 'ready', pendingCount: 1 });
    expect(pendingQueue.enqueue).toHaveBeenCalledWith('user-a', expect.objectContaining({ idempotencyKey: 'save-1', optimisticProjection: optimistic }));
    expect(cache.write).toHaveBeenCalledWith('user-a', [optimistic]);
  });

  it('refreshes canonical data after a stale-version save failure', async () => {
    const latest = { ...projection, currentVersion: { ...projection.currentVersion, version: 2 } };
    const stale = Object.assign(new Error('stale'), { code: 'stale_recipe_version' });
    const repository = { list: jest.fn().mockResolvedValue([latest]), save: jest.fn().mockRejectedValue(stale) };
    const cache = { read: jest.fn(), write: jest.fn(), clear: jest.fn() };
    const store = createRecipeStore(repository as never, cache as never, queue() as never);
    store.setState({ userId: 'user-a', recipes: [projection], status: 'ready' });
    await expect(store.getState().save({ recipeId: projection.recipe.id, expectedVersion: 1, idempotencyKey: 'save-2', reviewedData: { title: 'Edit' } }, projection)).rejects.toBe(stale);
    expect(store.getState().recipes[0].currentVersion.version).toBe(2);
  });

  it('removes a deleted recipe and updates the scoped cache', async () => {
    const repository = { list: jest.fn(), delete: jest.fn().mockResolvedValue(undefined) };
    const cache = { read: jest.fn(), write: jest.fn(), clear: jest.fn() };
    const store = createRecipeStore(repository as never, cache as never, queue() as never);
    store.setState({ userId: 'user-a', recipes: [projection], status: 'ready' });
    await store.getState().delete(projection.recipe.id, projection.currentVersion.version);
    expect(store.getState().recipes).toEqual([]);
    expect(cache.write).toHaveBeenCalledWith('user-a', []);
  });
});
