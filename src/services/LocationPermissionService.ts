import { Alert, Linking } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { useAppStore } from '../store/useAppStore';

type OsPermissionStatus = 'notRequested' | 'authorized' | 'denied' | 'restricted' | 'unavailable';

type ExpoLocationPermissionsResponse = {
  status?: 'granted' | 'denied' | 'undetermined';
  granted?: boolean;
  canAskAgain?: boolean;
};

type ExpoLocationNativeModule = {
  getForegroundPermissionsAsync?: () => Promise<ExpoLocationPermissionsResponse>;
  requestForegroundPermissionsAsync?: () => Promise<ExpoLocationPermissionsResponse>;
  getBackgroundPermissionsAsync?: () => Promise<ExpoLocationPermissionsResponse>;
  requestBackgroundPermissionsAsync?: () => Promise<ExpoLocationPermissionsResponse>;
};

function setOsPermissionStatus(status: OsPermissionStatus) {
  useAppStore.getState().setLocationOfferPreferences((current) => ({
    ...current,
    osPermissionStatus: status,
  }));
}

function mapExpoPermissionToOsStatus(resp: ExpoLocationPermissionsResponse | null | undefined): OsPermissionStatus {
  if (!resp) return 'unavailable';
  if (resp.granted === true || resp.status === 'granted') return 'authorized';
  if (resp.status === 'denied') return 'denied';
  if (resp.status === 'undetermined') return 'notRequested';
  return 'notRequested';
}

function getNativeModule(): ExpoLocationNativeModule | null {
  // Note: `expo-location` isn't currently in this repo's dependencies. We use the
  // optional native-module require so this file is safe to bundle even when the
  // module is absent (e.g. standalone builds without expo-location installed).
  return requireOptionalNativeModule<ExpoLocationNativeModule>('ExpoLocation');
}

async function syncOsPermissionStatusInternal(): Promise<OsPermissionStatus> {
  const mod = getNativeModule();
  if (!mod?.getForegroundPermissionsAsync) {
    setOsPermissionStatus('unavailable');
    return 'unavailable';
  }
  try {
    const fg = await mod.getForegroundPermissionsAsync();
    // For location offers (geofences), we need background permission. If the module
    // supports background permission checks, treat that as the source of truth.
    const bg = mod.getBackgroundPermissionsAsync ? await mod.getBackgroundPermissionsAsync() : null;
    const status = mapExpoPermissionToOsStatus(bg ?? fg);
    setOsPermissionStatus(status);
    return status;
  } catch {
    // Best-effort; don't crash.
    setOsPermissionStatus('unavailable');
    return 'unavailable';
  }
}

async function requestOsPermissionInternal(): Promise<boolean> {
  const mod = getNativeModule();
  if (!mod?.requestForegroundPermissionsAsync) {
    setOsPermissionStatus('unavailable');
    return false;
  }
  try {
    const fg = await mod.requestForegroundPermissionsAsync();
    // iOS geofencing requires background permission ("Always"). Request it immediately
    // after foreground permission succeeds when available.
    let bg: ExpoLocationPermissionsResponse | null = null;
    const fgStatus = mapExpoPermissionToOsStatus(fg);
    if (fgStatus === 'authorized' && mod.requestBackgroundPermissionsAsync) {
      bg = await mod.requestBackgroundPermissionsAsync();
    }
    const status = mapExpoPermissionToOsStatus(bg ?? fg);
    setOsPermissionStatus(status);
    return status === 'authorized';
  } catch {
    setOsPermissionStatus('unavailable');
    return false;
  }
}

async function ensurePermissionWithRationaleInternal(
  reason: 'ftue' | 'attach_place' | 'location_offers',
): Promise<boolean> {
  const current = await syncOsPermissionStatusInternal();
  if (current === 'authorized') return true;

  // If we can't even check/request, tell the user what's going on and let them continue.
  if (current === 'unavailable') {
    if (reason === 'attach_place') {
      Alert.alert(
        'Location not available',
        'This build doesn’t include location support yet. Update the app and try again.',
      );
    }
    return false;
  }

  // If not requested yet, we can prompt the system dialog.
  if (current === 'notRequested') {
    return await requestOsPermissionInternal();
  }

  // Denied/restricted: only Settings can fix it.
  Alert.alert(
    'Location is blocked',
    reason === 'attach_place'
      ? 'To use place search and map centering, allow Location in system settings.'
      : 'To use location-based prompts, allow “Always” Location in system settings.',
    [
      { text: 'Not now', style: 'cancel' },
      {
        text: 'Open settings',
        onPress: () => {
          void Linking.openSettings();
        },
      },
    ],
  );
  return false;
}

export const LocationPermissionService = {
  async syncOsPermissionStatus(): Promise<OsPermissionStatus> {
    return await syncOsPermissionStatusInternal();
  },
  async requestOsPermission(): Promise<boolean> {
    return await requestOsPermissionInternal();
  },
  async ensurePermissionWithRationale(reason: 'ftue' | 'attach_place' | 'location_offers'): Promise<boolean> {
    return await ensurePermissionWithRationaleInternal(reason);
  },
};


