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

let locationBlockedAlertActive = false;

function setOsPermissionStatus(status: OsPermissionStatus) {
  useAppStore.getState().setLocationOfferPreferences((current) => ({
    ...current,
    osPermissionStatus: status,
  }));
}

function showLocationBlockedAlert(reason: 'ftue' | 'attach_place' | 'location_offers') {
  // Prevent repeated/strobing alerts (can happen when permission checks rerun quickly).
  if (locationBlockedAlertActive) return;
  locationBlockedAlertActive = true;

  const message =
    reason === 'attach_place'
      ? 'To use place search and map centering, allow Location in system settings.'
      : 'To use location-based prompts, allow “Always” Location in system settings.';

  Alert.alert(
    'Location is blocked',
    message,
    [
      {
        text: 'Not now',
        style: 'cancel',
        onPress: () => {
          locationBlockedAlertActive = false;
        },
      },
      {
        text: 'Open settings',
        onPress: () => {
          locationBlockedAlertActive = false;
          void Linking.openSettings();
        },
      },
    ],
    {
      onDismiss: () => {
        locationBlockedAlertActive = false;
      },
    },
  );

  // Best-effort backstop in case a platform doesn't call onDismiss.
  setTimeout(() => {
    locationBlockedAlertActive = false;
  }, 1500);
}

function mapExpoPermissionToOsStatus(resp: ExpoLocationPermissionsResponse | null | undefined): OsPermissionStatus {
  if (!resp) return 'unavailable';
  if (resp.granted === true || resp.status === 'granted') return 'authorized';
  if (resp.status === 'denied') return 'denied';
  if (resp.status === 'undetermined') return 'notRequested';
  return 'notRequested';
}

function getNativeModule(): ExpoLocationNativeModule | null {
  // We use the optional native-module require so this file is safe to bundle even if
  // the ExpoLocation native module isn't present at runtime (e.g. misconfigured builds).
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
    const fgStatus = mapExpoPermissionToOsStatus(fg);
    
    // If foreground permission was granted, try to request background permission.
    // iOS geofencing requires background permission ("Always").
    if (fgStatus === 'authorized' && mod.requestBackgroundPermissionsAsync) {
      try {
        const bg = await mod.requestBackgroundPermissionsAsync();
        const bgStatus = mapExpoPermissionToOsStatus(bg);
        // If background permission is granted, we're fully authorized
        if (bgStatus === 'authorized') {
          setOsPermissionStatus('authorized');
          return true;
        }
        // If background permission was denied but foreground is granted,
        // sync the actual status from the system to get the accurate state.
        // This handles the "Allow Once" case where foreground is granted but background is not.
        const syncedStatus = await syncOsPermissionStatusInternal();
        return syncedStatus === 'authorized';
      } catch {
        // If background permission request fails, fall back to foreground status
        setOsPermissionStatus(fgStatus);
        return fgStatus === 'authorized';
      }
    }
    
    // No background permission request available, use foreground status
    setOsPermissionStatus(fgStatus);
    return fgStatus === 'authorized';
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
        'Location services aren’t available right now. Please try again, or update/reinstall the app if this persists.',
      );
    }
    return false;
  }

  // If not requested yet, we can prompt the system dialog.
  if (current === 'notRequested') {
    await requestOsPermissionInternal();
    const finalStatus = await syncOsPermissionStatusInternal();
    if (finalStatus === 'authorized') {
      return true;
    }

    // Important: in FTUE, don't immediately show a "blocked" alert after the OS prompt,
    // since iOS can return a mixed state (e.g. foreground-only) and the UI can safely
    // reflect that without popping additional alerts.
    if (reason === 'ftue') return false;

    if (finalStatus === 'denied' || finalStatus === 'restricted') {
      showLocationBlockedAlert(reason);
    }
    return false;
  }

  // Denied/restricted: only Settings can fix it.
  showLocationBlockedAlert(reason);
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


