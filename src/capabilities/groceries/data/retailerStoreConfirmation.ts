import AsyncStorage from '@react-native-async-storage/async-storage';

import type { KrogerLocation } from '../providers/krogerProvider';

const KEY_PREFIX = 'kwilt-groceries-retailer-store-confirmation-v1';

export type RetailerStoreConfirmation = {
  provider: 'kroger';
  locationId: string;
  retailerLabel: string;
  address: string;
  authority: 'user_confirmed';
  confirmedAt: string;
};

const keyFor = (userId: string | null) => `${KEY_PREFIX}:${userId ?? 'device'}:kroger`;

function parse(value: string | null): RetailerStoreConfirmation | null {
  if (!value) return null;
  try {
    const receipt = JSON.parse(value) as Partial<RetailerStoreConfirmation>;
    if (
      receipt.provider !== 'kroger'
      || receipt.authority !== 'user_confirmed'
      || typeof receipt.locationId !== 'string'
      || typeof receipt.retailerLabel !== 'string'
      || typeof receipt.address !== 'string'
      || typeof receipt.confirmedAt !== 'string'
    ) return null;
    return receipt as RetailerStoreConfirmation;
  } catch {
    return null;
  }
}

export const retailerStoreConfirmation = {
  async read(
    userId: string | null,
    location: KrogerLocation,
  ): Promise<RetailerStoreConfirmation | null> {
    const receipt = parse(await AsyncStorage.getItem(keyFor(userId)));
    return receipt?.locationId === location.id ? receipt : null;
  },

  async confirm(
    userId: string | null,
    location: KrogerLocation,
  ): Promise<RetailerStoreConfirmation> {
    const receipt: RetailerStoreConfirmation = {
      provider: 'kroger',
      locationId: location.id,
      retailerLabel: location.banner || location.name,
      address: location.address,
      authority: 'user_confirmed',
      confirmedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify(receipt));
    return receipt;
  },

  async clear(userId: string | null): Promise<void> {
    await AsyncStorage.removeItem(keyFor(userId));
  },
};
