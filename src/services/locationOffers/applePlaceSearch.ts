import { NativeModules, Platform } from 'react-native';

export type ApplePlaceSearchResult = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
};

type NativeKwiltPlaceSearch = {
  search: (
    query: string,
    latitude: number | null,
    longitude: number | null,
    radiusKm: number | null,
    limit: number,
  ) => Promise<ApplePlaceSearchResult[]>;
  cancel: () => void;
};

function getNativeModule(): NativeKwiltPlaceSearch | null {
  const mod = (NativeModules as any)?.KwiltPlaceSearch as NativeKwiltPlaceSearch | undefined;
  return mod ?? null;
}

/**
 * Apple Maps place search (iOS only, dev build required).
 *
 * Returns a list of candidate places with coordinates, biased to the provided center (if any).
 */
export async function applePlaceSearchBestEffort(args: {
  query: string;
  center?: { latitude: number; longitude: number } | null;
  radiusKm?: number;
  limit?: number;
}): Promise<ApplePlaceSearchResult[] | null> {
  if (Platform.OS !== 'ios') return null;
  const mod = getNativeModule();
  if (!mod) return null;

  const q = args.query.trim();
  if (!q) return [];

  const limit = typeof args.limit === 'number' ? args.limit : 6;
  const radiusKm = typeof args.radiusKm === 'number' ? args.radiusKm : 200;
  const lat = args.center?.latitude ?? null;
  const lon = args.center?.longitude ?? null;

  try {
    const res = await mod.search(q, lat, lon, radiusKm, limit);
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
}

export function cancelApplePlaceSearchBestEffort() {
  if (Platform.OS !== 'ios') return;
  const mod = getNativeModule();
  mod?.cancel?.();
}


