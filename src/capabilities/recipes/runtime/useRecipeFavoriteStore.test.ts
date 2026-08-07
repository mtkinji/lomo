import { createRecipeFavoriteStore } from './useRecipeFavoriteStore';

describe('Recipe favorite store', () => {
  it('shows cached personal favorites while refreshing canonical state', async () => {
    let finishRefresh: ((ids: string[]) => void) | undefined;
    const repository = {
      list: jest.fn(() => new Promise<string[]>((resolve) => { finishRefresh = resolve; })),
      set: jest.fn(),
    };
    const cache = { read: jest.fn().mockResolvedValue(['meal-cached']), write: jest.fn(), clear: jest.fn() };
    const store = createRecipeFavoriteStore(repository as never, cache as never);

    const loading = store.getState().setIdentity('user-a');
    await Promise.resolve();
    expect(store.getState()).toMatchObject({ recipeIds: ['meal-cached'], status: 'refreshing' });
    finishRefresh?.(['meal-live']);
    await loading;
    expect(store.getState()).toMatchObject({ recipeIds: ['meal-live'], status: 'ready' });
  });

  it('optimistically toggles one meal and rolls only that meal back on failure', async () => {
    const repository = { list: jest.fn(), set: jest.fn().mockRejectedValue(new Error('offline')) };
    const cache = { read: jest.fn(), write: jest.fn(), clear: jest.fn() };
    const store = createRecipeFavoriteStore(repository as never, cache as never);
    store.setState({ userId: 'user-a', recipeIds: ['meal-1', 'meal-2'], status: 'ready' });

    const toggling = store.getState().toggle('meal-1');
    expect(store.getState().recipeIds).toEqual(['meal-2']);
    await expect(toggling).rejects.toThrow('offline');
    expect(store.getState().recipeIds).toEqual(['meal-1', 'meal-2']);
    expect(store.getState().togglingRecipeIds).toEqual([]);
  });

  it('persists the optimistic result after a successful toggle', async () => {
    const repository = { list: jest.fn(), set: jest.fn().mockResolvedValue(undefined) };
    const cache = { read: jest.fn(), write: jest.fn(), clear: jest.fn() };
    const store = createRecipeFavoriteStore(repository as never, cache as never);
    store.setState({ userId: 'user-a', recipeIds: [], status: 'ready' });

    await store.getState().toggle('meal-1');
    expect(repository.set).toHaveBeenCalledWith('meal-1', true);
    expect(cache.write).toHaveBeenCalledWith('user-a', ['meal-1']);
  });
});
