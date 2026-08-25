import { useAppStore } from '../../store/useAppStore';

describe('global Search launch presentation', () => {
  beforeEach(() => {
    useAppStore.getState().resetStore();
  });

  it('can hide the shared scope selector for a locked capability search', () => {
    useAppStore.getState().openGlobalSearch({
      initialScope: 'recipes',
      showScopeSelector: false,
    });

    expect(useAppStore.getState().globalSearchShowScopeSelector).toBe(false);
  });

  it('keeps the shared scope selector visible by default and restores that default on close', () => {
    useAppStore.getState().openGlobalSearch({
      initialScope: 'recipes',
      showScopeSelector: false,
    });
    useAppStore.getState().closeGlobalSearch();

    expect(useAppStore.getState().globalSearchShowScopeSelector).toBe(true);

    useAppStore.getState().openGlobalSearch({ initialScope: 'activities' });

    expect(useAppStore.getState().globalSearchShowScopeSelector).toBe(true);
  });
});
