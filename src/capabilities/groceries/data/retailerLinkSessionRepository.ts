import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  parseRetailerLinkSession,
  type RetailerLinkId,
  type RetailerLinkSession,
} from '../domain/retailerLinkSession';

type Storage = Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>;
const KEY_PREFIX = 'kwilt-retailer-link-session-v1';

export const retailerLinkSessionStorageKey = (
  personId: string | null,
  listId: string,
  retailerId: RetailerLinkId,
) => `${KEY_PREFIX}:${encodeURIComponent(personId ?? 'device')}:${encodeURIComponent(listId)}:${retailerId}`;

export function createRetailerLinkSessionRepository(storage: Storage = AsyncStorage) {
  return {
    async read(
      personId: string | null,
      listId: string,
      retailerId: RetailerLinkId,
    ): Promise<RetailerLinkSession | null> {
      const key = retailerLinkSessionStorageKey(personId, listId, retailerId);
      try {
        const raw = await storage.getItem(key);
        if (!raw) return null;
        const session = parseRetailerLinkSession(JSON.parse(raw));
        if (!session) await storage.removeItem(key);
        return session;
      } catch {
        await storage.removeItem(key).catch(() => undefined);
        return null;
      }
    },

    async replace(personId: string | null, session: RetailerLinkSession): Promise<void> {
      const parsed = parseRetailerLinkSession(session);
      if (!parsed) throw new Error('retailer-link-session.invalid');
      await storage.setItem(
        retailerLinkSessionStorageKey(personId, parsed.listId, parsed.retailerId),
        JSON.stringify(parsed),
      );
    },

    clear(personId: string | null, listId: string, retailerId: RetailerLinkId): Promise<void> {
      return storage.removeItem(retailerLinkSessionStorageKey(personId, listId, retailerId));
    },
  };
}

export const retailerLinkSessionRepository = createRetailerLinkSessionRepository(AsyncStorage);
