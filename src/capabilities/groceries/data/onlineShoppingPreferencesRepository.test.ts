import AsyncStorage from '@react-native-async-storage/async-storage';

import { createDefaultOnlineShoppingPreferences } from '../domain/onlineShoppingPreferences';
import {
  createOnlineShoppingPreferencesRepository,
  onlineShoppingPreferencesStorageKey,
} from './onlineShoppingPreferencesRepository';

describe('online shopping preferences repository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('isolates person and device preferences', async () => {
    const repository = createOnlineShoppingPreferencesRepository(AsyncStorage);
    const preferences = createDefaultOnlineShoppingPreferences('2026-08-13T16:00:00.000Z');

    await repository.replace('person-1', preferences);

    await expect(repository.read('person-1')).resolves.toEqual(preferences);
    await expect(repository.read('person-2')).resolves.toBeNull();
    await expect(repository.read(null)).resolves.toBeNull();
    expect(onlineShoppingPreferencesStorageKey('person-1')).toBe(
      'kwilt-online-shopping-preferences-v1:person-1',
    );
    expect(onlineShoppingPreferencesStorageKey(null)).toBe(
      'kwilt-online-shopping-preferences-v1:device',
    );
  });

  it('recovers malformed data as null', async () => {
    const repository = createOnlineShoppingPreferencesRepository(AsyncStorage);
    await AsyncStorage.setItem(onlineShoppingPreferencesStorageKey('person-1'), '{nope');

    await expect(repository.read('person-1')).resolves.toBeNull();
  });

  it('atomically replaces and clears one owner value', async () => {
    const repository = createOnlineShoppingPreferencesRepository(AsyncStorage);
    const first = createDefaultOnlineShoppingPreferences('2026-08-13T16:00:00.000Z');
    const second = {
      ...first,
      defaultFulfillment: 'pickup' as const,
      savedAt: '2026-08-13T17:00:00.000Z',
    };

    await repository.replace('person-1', first);
    await repository.replace('person-1', second);
    await expect(repository.read('person-1')).resolves.toEqual(second);

    await repository.clear('person-1');
    await expect(repository.read('person-1')).resolves.toBeNull();
  });
});
