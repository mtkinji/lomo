import AsyncStorage from '@react-native-async-storage/async-storage';

import { parseHostedCatalogMediaRows, type HostedCatalogMedia } from './catalogMediaOverlay';

type Storage = Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>;

export function catalogMediaCacheKey(userId: string): string {
  return `kwilt.recipe-catalog-media.v1.${userId}`;
}

function parseEnvelope(raw: string): HostedCatalogMedia[] {
  const value = JSON.parse(raw) as { overlays?: unknown };
  if (!Array.isArray(value.overlays)) throw new Error('Invalid catalog media cache');
  return parseHostedCatalogMediaRows(value.overlays.map((overlay) => {
    if (!overlay || typeof overlay !== 'object') return null;
    const item = overlay as HostedCatalogMedia;
    return { projection: { catalog: { rosterId: item.rosterId }, recipe: { mediaAssets: [item.media] } } };
  }));
}

export function createCatalogMediaCache(storage: Storage) {
  return {
    async read(userId: string): Promise<HostedCatalogMedia[]> {
      try {
        const raw = await storage.getItem(catalogMediaCacheKey(userId));
        return raw ? parseEnvelope(raw) : [];
      } catch {
        await storage.removeItem(catalogMediaCacheKey(userId)).catch(() => undefined);
        return [];
      }
    },
    async write(userId: string, overlays: readonly HostedCatalogMedia[]): Promise<void> {
      if (!overlays.length) return;
      const validated = parseEnvelope(JSON.stringify({ overlays }));
      await storage.setItem(catalogMediaCacheKey(userId), JSON.stringify({ overlays: validated }));
    },
  };
}

export type CatalogMediaCache = ReturnType<typeof createCatalogMediaCache>;
export const catalogMediaCache = createCatalogMediaCache(AsyncStorage);
