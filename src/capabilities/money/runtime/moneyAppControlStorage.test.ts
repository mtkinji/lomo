import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_MONEY_APP_CONTROL_SETTINGS } from '../domain/moneyAppControl';
import {
  loadMoneyAppControlSettings,
  resetMoneyAppControlStorageForTests,
  retireMoneyAppControlSettings,
} from './moneyAppControlStorage';

describe('moneyAppControlStorage retirement', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    resetMoneyAppControlStorageForTests();
  });

  it('removes the legacy policy store and resets the in-memory projection', async () => {
    await AsyncStorage.setItem('kwilt:money:app-control:v1', JSON.stringify({
      authorizationStatus: 'approved',
      policies: {
        shopping: {
          enabled: true, preset: 'when_over', unlockWindowMinutes: 20,
          selectedApps: [{ token: 'amazon' }], selectedCategories: [], lastReview: null,
        },
      },
      lastUpdated: null,
    }));
    resetMoneyAppControlStorageForTests();

    await retireMoneyAppControlSettings();

    expect(await loadMoneyAppControlSettings()).toEqual(DEFAULT_MONEY_APP_CONTROL_SETTINGS);
    expect(await AsyncStorage.getItem('kwilt:money:app-control:v1')).toBeNull();
  });
});
