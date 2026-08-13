import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  parseOnlineShoppingPreferences,
  type OnlineShoppingPreferences,
} from '../domain/onlineShoppingPreferences';

type Storage = Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>;

const KEY_PREFIX = 'kwilt-online-shopping-preferences-v1';

export const onlineShoppingPreferencesStorageKey = (personId: string | null) =>
  `${KEY_PREFIX}:${personId ?? 'device'}`;

export function createOnlineShoppingPreferencesRepository(storage: Storage = AsyncStorage) {
  return {
    async read(personId: string | null): Promise<OnlineShoppingPreferences | null> {
      try {
        const raw = await storage.getItem(onlineShoppingPreferencesStorageKey(personId));
        if (!raw) return null;
        return parseOnlineShoppingPreferences(JSON.parse(raw));
      } catch {
        return null;
      }
    },

    async replace(
      personId: string | null,
      preferences: OnlineShoppingPreferences,
    ): Promise<void> {
      const parsed = parseOnlineShoppingPreferences(preferences);
      if (!parsed) throw new Error('online-shopping-preferences.invalid');
      await storage.setItem(
        onlineShoppingPreferencesStorageKey(personId),
        JSON.stringify(parsed),
      );
    },

    async clear(personId: string | null): Promise<void> {
      await storage.removeItem(onlineShoppingPreferencesStorageKey(personId));
    },
  };
}

export const onlineShoppingPreferencesRepository =
  createOnlineShoppingPreferencesRepository(AsyncStorage);
