import { useGamesSettingsStore } from './useGamesSettingsStore';

describe('useGamesSettingsStore', () => {
  beforeEach(() => {
    useGamesSettingsStore.setState({ soundEnabled: true });
  });

  it('keeps game sound enabled by default and lets settings change it', () => {
    expect(useGamesSettingsStore.getState().soundEnabled).toBe(true);
    useGamesSettingsStore.getState().setSoundEnabled(false);
    expect(useGamesSettingsStore.getState().soundEnabled).toBe(false);
  });

});
