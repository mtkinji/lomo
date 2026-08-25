import { useCapabilityMenuPinsStore } from './useCapabilityMenuPinsStore';

describe('useCapabilityMenuPinsStore', () => {
  beforeEach(() => {
    useCapabilityMenuPinsStore.setState({ overridesByUserId: {} });
  });

  it('keeps pin preferences scoped to the current user', () => {
    useCapabilityMenuPinsStore.getState().setPinned('user-a', 'games', true);
    useCapabilityMenuPinsStore.getState().setPinned('user-b', 'chores', false);

    expect(useCapabilityMenuPinsStore.getState().overridesByUserId).toEqual({
      'user-a': { games: true },
      'user-b': { chores: false },
    });
  });

  it('removes a user override after returning to the product default', () => {
    useCapabilityMenuPinsStore.getState().setPinned('user-a', 'games', true);
    useCapabilityMenuPinsStore.getState().setPinned('user-a', 'games', false);

    expect(useCapabilityMenuPinsStore.getState().overridesByUserId).toEqual({});
  });
});
