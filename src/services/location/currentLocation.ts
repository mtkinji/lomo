import { requireOptionalNativeModule } from 'expo-modules-core';

type ExpoLocationNativeModule = {
  getCurrentPositionAsync?: (options?: any) => Promise<{ coords?: { latitude: number; longitude: number } }>;
};

export async function getCurrentLocationBestEffort(): Promise<{ latitude: number; longitude: number } | null> {
  const mod = requireOptionalNativeModule<ExpoLocationNativeModule>('ExpoLocation');
  if (!mod?.getCurrentPositionAsync) return null;
  try {
    const pos = await mod.getCurrentPositionAsync({
      // Best-effort; actual accuracy settings depend on expo-location being installed.
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


