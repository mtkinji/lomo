import { createHiddenRecipeStore } from './useHiddenRecipeStore';

describe('Hidden recipe store', () => {
  it('shows cached personal hides while refreshing canonical state', async () => {
    let finishRefresh: ((ids: string[]) => void) | undefined;
    const repository = {
      list: jest.fn(() => new Promise<string[]>((resolve) => { finishRefresh = resolve; })),
      set: jest.fn(),
    };
    const cache = { read: jest.fn().mockResolvedValue(['meal-cached']), write: jest.fn(), clear: jest.fn() };
    const store = createHiddenRecipeStore(repository as never, cache as never);

    const loading = store.getState().setIdentity('user-a');
    await Promise.resolve();
    expect(store.getState()).toMatchObject({ recipeIds: ['meal-cached'], status: 'refreshing' });
    finishRefresh?.(['meal-live']);
    await loading;
    expect(store.getState()).toMatchObject({ recipeIds: ['meal-live'], status: 'ready' });
  });

  it('persists a signed-out hide locally without calling the backend', async () => {
    const repository = { list: jest.fn(), set: jest.fn() };
    const cache = { read: jest.fn().mockResolvedValue([]), write: jest.fn(), clear: jest.fn() };
    const store = createHiddenRecipeStore(repository as never, cache as never);

    await store.getState().setIdentity(null);
    await store.getState().setHidden('meal-1', true);

    expect(store.getState().recipeIds).toEqual(['meal-1']);
    expect(cache.write).toHaveBeenCalledWith('local', ['meal-1']);
    expect(repository.set).not.toHaveBeenCalled();
  });

  it('rolls back only the failed hide and reports the failure', async () => {
    const repository = { list: jest.fn(), set: jest.fn().mockRejectedValue(new Error('offline')) };
    const cache = { read: jest.fn(), write: jest.fn(), clear: jest.fn() };
    const store = createHiddenRecipeStore(repository as never, cache as never);
    store.setState({ userId: 'user-a', recipeIds: ['meal-2'], status: 'ready' });

    const hiding = store.getState().setHidden('meal-1', true);
    expect(store.getState().recipeIds).toEqual(['meal-2', 'meal-1']);
    await expect(hiding).rejects.toThrow('offline');
    expect(store.getState().recipeIds).toEqual(['meal-2']);
    expect(store.getState().mutatingRecipeIds).toEqual([]);
  });

  it('restores a hidden meal and persists the result', async () => {
    const repository = { list: jest.fn(), set: jest.fn().mockResolvedValue(undefined) };
    const cache = { read: jest.fn(), write: jest.fn(), clear: jest.fn() };
    const store = createHiddenRecipeStore(repository as never, cache as never);
    store.setState({ userId: 'user-a', recipeIds: ['meal-1', 'meal-2'], status: 'ready' });

    await store.getState().setHidden('meal-1', false);

    expect(repository.set).toHaveBeenCalledWith('meal-1', false);
    expect(cache.write).toHaveBeenCalledWith('user-a', ['meal-2']);
    expect(store.getState().recipeIds).toEqual(['meal-2']);
  });

  it('does not roll a failed mutation into a different signed-in identity', async () => {
    let failMutation: ((error: Error) => void) | undefined;
    const repository = {
      list: jest.fn(),
      set: jest.fn(() => new Promise<void>((_resolve, reject) => { failMutation = reject; })),
    };
    const cache = { read: jest.fn(), write: jest.fn(), clear: jest.fn() };
    const store = createHiddenRecipeStore(repository as never, cache as never);
    store.setState({ userId: 'user-a', recipeIds: ['meal-1'], status: 'ready' });

    const hiding = store.getState().setHidden('meal-1', false);
    store.setState({ userId: 'user-b', recipeIds: ['meal-b'], mutatingRecipeIds: [], status: 'ready' });
    failMutation?.(new Error('offline'));

    await expect(hiding).rejects.toThrow('offline');
    expect(store.getState()).toMatchObject({ userId: 'user-b', recipeIds: ['meal-b'] });
  });
});
