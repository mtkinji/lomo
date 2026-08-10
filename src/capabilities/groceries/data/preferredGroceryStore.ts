import AsyncStorage from '@react-native-async-storage/async-storage';

import type { KrogerLocation } from '../providers/krogerProvider';

const KEY_PREFIX = 'kwilt-groceries-preferred-store-v1';

function keyFor(userId: string | null): string {
  return `${KEY_PREFIX}:${userId ?? 'device'}`;
}

function parseLocation(value: string | null): KrogerLocation | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<KrogerLocation>;
    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.name !== 'string' ||
      typeof parsed.banner !== 'string' ||
      typeof parsed.address !== 'string'
    ) {
      return null;
    }
    return {
      id: parsed.id,
      name: parsed.name,
      banner: parsed.banner,
      address: parsed.address,
      latitude: typeof parsed.latitude === 'number' ? parsed.latitude : null,
      longitude: typeof parsed.longitude === 'number' ? parsed.longitude : null,
    };
  } catch {
    return null;
  }
}

export const preferredGroceryStore = {
  async read(userId: string | null): Promise<KrogerLocation | null> {
    return parseLocation(await AsyncStorage.getItem(keyFor(userId)));
  },

  async write(userId: string | null, location: KrogerLocation): Promise<void> {
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify(location));
  },

  async clear(userId: string | null): Promise<void> {
    await AsyncStorage.removeItem(keyFor(userId));
  },
};
