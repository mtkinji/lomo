import * as Location from 'expo-location';
import { useAppStore } from '../../store/useAppStore';
import { LOCATION_OFFER_GEOFENCE_TASK } from './locationOfferGeofenceTask';
import { LocationPermissionService } from '../LocationPermissionService';

const MAX_GEOFENCES = 20;

let isInitialized = false;
let hasAttachedStoreSubscription = false;
let reconcileTimeout: ReturnType<typeof setTimeout> | null = null;

function getEligibleActivities() {
  const state = useAppStore.getState();
  return (state.activities ?? [])
    .filter((a) => a.status !== 'done' && a.status !== 'cancelled')
    .filter((a) => Boolean((a as any)?.location))
    .filter((a) => {
      const loc = (a as any).location as any;
      return (
        loc &&
        typeof loc.latitude === 'number' &&
        typeof loc.longitude === 'number' &&
        typeof loc.radiusM === 'number' &&
        (loc.trigger === 'arrive' || loc.trigger === 'leave')
      );
    })
    .slice(0, MAX_GEOFENCES);
}

async function stopGeofencingIfRunning(): Promise<void> {
  try {
    const started = await Location.hasStartedGeofencingAsync(LOCATION_OFFER_GEOFENCE_TASK);
    if (started) {
      await Location.stopGeofencingAsync(LOCATION_OFFER_GEOFENCE_TASK);
    }
  } catch {
    // best-effort
  }
}

async function reconcileGeofencesInternal(): Promise<void> {
  const state = useAppStore.getState();
  const prefs = state.notificationPreferences;
  const locPrefs = state.locationOfferPreferences;

  // Feature gate + notification permission gate.
  if (!locPrefs.enabled || locPrefs.osPermissionStatus !== 'authorized') {
    await stopGeofencingIfRunning();
    return;
  }
  if (!prefs.notificationsEnabled || prefs.osPermissionStatus !== 'authorized') {
    await stopGeofencingIfRunning();
    return;
  }

  // Ensure permissions (foreground + always). This may show a prompt if needed.
  // If the user declines, we can't run geofences.
  const ok = await LocationPermissionService.ensurePermissionWithRationale('location_offers');
  if (!ok) {
    await stopGeofencingIfRunning();
    return;
  }

  const eligible = getEligibleActivities();
  if (eligible.length === 0) {
    await stopGeofencingIfRunning();
    return;
  }

  const regions: Location.LocationRegion[] = eligible.map((a) => {
    const loc = (a as any).location as any;
    const radiusM = Math.max(15, Math.min(5000, Number(loc.radiusM) || 150));
    return {
      identifier: a.id,
      latitude: loc.latitude,
      longitude: loc.longitude,
      radius: radiusM,
      notifyOnEnter: true,
      notifyOnExit: true,
    };
  });

  // Restart with the latest region set (simple + reliable).
  await stopGeofencingIfRunning();
  await Location.startGeofencingAsync(LOCATION_OFFER_GEOFENCE_TASK, regions);
}

function scheduleReconcile(): void {
  if (reconcileTimeout) clearTimeout(reconcileTimeout);
  reconcileTimeout = setTimeout(() => {
    reconcileTimeout = null;
    void reconcileGeofencesInternal().catch((error) => {
      if (__DEV__) {
        console.warn('[locationOffers] reconcile failed', error);
      }
    });
  }, 400);
}

function attachStoreSubscription() {
  if (hasAttachedStoreSubscription) return;
  hasAttachedStoreSubscription = true;

  let prevActivitiesRef = useAppStore.getState().activities;
  let prevPrefsRef = useAppStore.getState().locationOfferPreferences;

  useAppStore.subscribe((next) => {
    const nextActivities = next.activities;
    const nextPrefs = next.locationOfferPreferences;
    if (nextActivities !== prevActivitiesRef || nextPrefs !== prevPrefsRef) {
      prevActivitiesRef = nextActivities;
      prevPrefsRef = nextPrefs;
      scheduleReconcile();
    }
  });
}

export const LocationOfferService = {
  async init(): Promise<void> {
    if (isInitialized) return;
    isInitialized = true;
    // Keep store's OS permission status in sync early (used by FTUE and settings).
    await LocationPermissionService.syncOsPermissionStatus().catch(() => undefined);
    attachStoreSubscription();
    scheduleReconcile();
  },
  async reconcileNow(): Promise<void> {
    await reconcileGeofencesInternal();
  },
  async stop(): Promise<void> {
    await stopGeofencingIfRunning();
  },
};


