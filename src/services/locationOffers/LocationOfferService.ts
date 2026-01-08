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
      const lat = Number(loc?.latitude);
      const lon = Number(loc?.longitude);
      const radiusM = Number(loc?.radiusM);
      const trigger = loc?.trigger;
      return (
        loc &&
        Number.isFinite(lat) &&
        Number.isFinite(lon) &&
        // Radius/trigger can be absent (older data / partially configured); we clamp/default later.
        // If trigger is present, it must be valid.
        (trigger == null || trigger === 'arrive' || trigger === 'leave') &&
        // If radius is present, it must be a finite number (otherwise we default).
        (loc?.radiusM == null || Number.isFinite(radiusM))
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

  // Feature gate: user must opt in at the product layer.
  if (!locPrefs.enabled) {
    await stopGeofencingIfRunning();
    return;
  }

  // Notifications must be enabled and OS-authorized; otherwise a geofence-triggered
  // offer would be invisible, so stop to avoid background work.
  if (!prefs.notificationsEnabled || prefs.osPermissionStatus !== 'authorized') {
    await stopGeofencingIfRunning();
    return;
  }

  // Ensure location permissions (foreground + background/always).
  // Important: don't rely on potentially stale store state; this call syncs and
  // can show a prompt if needed.
  const ok = await LocationPermissionService.ensurePermissionWithRationale('location_offers');
  if (!ok) {
    await stopGeofencingIfRunning();
    return;
  }

  // Android can report geofencing unavailable depending on device/services state.
  // `expo-location` exposes this helper in newer SDKs; guard to keep compatibility.
  try {
    const isGeofencingAvailableAsync = (Location as any)?.isGeofencingAvailableAsync as
      | (() => Promise<boolean>)
      | undefined;
    if (isGeofencingAvailableAsync) {
      const available = await isGeofencingAvailableAsync();
      if (!available) {
        await stopGeofencingIfRunning();
        return;
      }
    }
  } catch {
    // best-effort
  }

  const eligible = getEligibleActivities();
  if (eligible.length === 0) {
    await stopGeofencingIfRunning();
    return;
  }

  const regions: Location.LocationRegion[] = eligible.map((a) => {
    const loc = (a as any).location as any;
    const configuredTrigger =
      loc?.trigger === 'arrive' || loc?.trigger === 'leave' ? loc.trigger : null;
    const radiusM = Math.max(15, Math.min(5000, Number(loc?.radiusM) || 150));
    return {
      identifier: a.id,
      latitude: Number(loc.latitude),
      longitude: Number(loc.longitude),
      radius: radiusM,
      // Reduce event noise: only ask the OS for the event we care about when known.
      notifyOnEnter: configuredTrigger ? configuredTrigger === 'arrive' : true,
      notifyOnExit: configuredTrigger ? configuredTrigger === 'leave' : true,
    };
  });

  // Restart with the latest region set (simple + reliable).
  await stopGeofencingIfRunning();
  await Location.startGeofencingAsync(LOCATION_OFFER_GEOFENCE_TASK, regions);

  if (__DEV__) {
    try {
      const started = await Location.hasStartedGeofencingAsync(LOCATION_OFFER_GEOFENCE_TASK);
      // eslint-disable-next-line no-console
      console.log('[locationOffers] geofencing started', {
        started,
        regions: regions.length,
      });
    } catch {
      // best-effort
    }
  }
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


