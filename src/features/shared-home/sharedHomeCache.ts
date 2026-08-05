import AsyncStorage from '@react-native-async-storage/async-storage';

import { parseSharedHomeRow } from './sharedHomePresentation';
import type { SharedHomeDelivery } from './sharedHomeTypes';

const SCHEMA_VERSION = 1;
const KEY_PREFIX = 'kwilt:shared-home:snapshot:v1:';

type StorageAdapter = Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>;

export type SharedHomeCacheSnapshot = {
  savedAt: string;
  items: SharedHomeDelivery[];
};

export function sharedHomeCacheKey(userId: string): string {
  return `${KEY_PREFIX}${encodeURIComponent(userId.trim())}`;
}

function toPersistedRow(item: SharedHomeDelivery): Record<string, unknown> {
  return {
    id: item.id,
    event_kind: item.eventKind,
    source_capability: item.sourceCapability,
    source_entity_type: item.sourceEntityType,
    source_entity_id: item.sourceEntityId,
    actor_display_name: item.actorDisplayName,
    title: item.title,
    body: item.body,
    destination: item.destination,
    state: item.state,
    settled_reason: item.settledReason,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
    settled_at: item.settledAt,
    expires_at: item.expiresAt,
    retain_until: item.retainUntil,
  };
}

export function createSharedHomeCache(storage: StorageAdapter) {
  return {
    async load(userId: string): Promise<SharedHomeCacheSnapshot | null> {
      try {
        const raw = await storage.getItem(sharedHomeCacheKey(userId));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        if (
          !parsed
          || parsed.schemaVersion !== SCHEMA_VERSION
          || typeof parsed.savedAt !== 'string'
          || !Number.isFinite(new Date(parsed.savedAt).getTime())
          || !Array.isArray(parsed.items)
        ) return null;

        const items = parsed.items.map((item) => parseSharedHomeRow(item));
        if (items.some((item) => item == null)) return null;
        return {
          savedAt: parsed.savedAt,
          items: items as SharedHomeDelivery[],
        };
      } catch {
        return null;
      }
    },

    async save(userId: string, items: SharedHomeDelivery[]): Promise<void> {
      await storage.setItem(sharedHomeCacheKey(userId), JSON.stringify({
        schemaVersion: SCHEMA_VERSION,
        savedAt: new Date().toISOString(),
        items: items.map(toPersistedRow),
      }));
    },

    async remove(userId: string): Promise<void> {
      await storage.removeItem(sharedHomeCacheKey(userId));
    },
  };
}

export const sharedHomeCache = createSharedHomeCache(AsyncStorage);
