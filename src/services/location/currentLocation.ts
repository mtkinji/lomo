import { requireOptionalNativeModule } from 'expo-modules-core';

type ExpoLocationNativeModule = {
  getCurrentPositionAsync?: (options?: any) => Promise<{ coords?: { latitude: number; longitude: number } }>;
  reverseGeocodeAsync?: (coordinates: { latitude: number; longitude: number }) => Promise<Array<{ postalCode?: string | null }>>;
  geocodeAsync?: (query: string) => Promise<Array<{ latitude?: number; longitude?: number }>>;
};

export type CurrentStoreSearchContext = {
  latitude: number;
  longitude: number;
  postalCode: string;
};

export async function getCurrentLocationBestEffort(): Promise<{ latitude: number; longitude: number } | null> {
  const mod = requireOptionalNativeModule<ExpoLocationNativeModule>('ExpoLocation');
  if (!mod?.getCurrentPositionAsync) return null;
  try {
    const pos = await mod.getCurrentPositionAsync({
      // Best-effort; actual accuracy settings depend on the ExpoLocation native module being available.
      accuracy: 3,
    });
    const lat = pos?.coords?.latitude;
    const lon = pos?.coords?.longitude;
    if (typeof lat !== 'number' || typeof lon !== 'number') return null;
    return { latitude: lat, longitude: lon };
  } catch {
    return null;
  }
}

export async function getCurrentStoreSearchContextBestEffort(): Promise<CurrentStoreSearchContext | null> {
  const mod = requireOptionalNativeModule<ExpoLocationNativeModule>('ExpoLocation');
  if (!mod?.reverseGeocodeAsync) return null;
  const coordinates = await getCurrentLocationBestEffort();
  if (!coordinates) return null;
  try {
    const places = await mod.reverseGeocodeAsync(coordinates);
    const postalCode = places
      .map((place) => place.postalCode?.trim() ?? '')
      .find((value) => /^\d{5}$/.test(value));
    return postalCode ? { ...coordinates, postalCode } : null;
  } catch {
    return null;
  }
}

export async function geocodeStoreSearchBestEffort(
  query: string,
): Promise<{ latitude: number; longitude: number } | null> {
  const mod = requireOptionalNativeModule<ExpoLocationNativeModule>('ExpoLocation');
  if (!mod?.geocodeAsync) return null;
  try {
    const result = (await mod.geocodeAsync(query.trim()))[0];
    if (typeof result?.latitude !== 'number' || typeof result.longitude !== 'number') return null;
    return { latitude: result.latitude, longitude: result.longitude };
  } catch {
    return null;
  }
}

type StoreLocationCoordinates = {
  address: string;
  latitude?: number | null;
  longitude?: number | null;
};

export async function hydrateStoreCoordinatesBestEffort<T extends StoreLocationCoordinates>(
  locations: T[],
): Promise<T[]> {
  const hydrated: T[] = [];
  for (const location of locations) {
    if (typeof location.latitude === 'number' && typeof location.longitude === 'number') {
      hydrated.push(location);
      continue;
    }
    const coordinate = await geocodeStoreSearchBestEffort(location.address.replace(/ · /g, ', '));
    hydrated.push(coordinate ? { ...location, ...coordinate } : location);
  }
  return hydrated;
}
