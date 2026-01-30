import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '../../store/useAppStore';
import { shouldFireLocationOffer, recordLocationOfferFired } from './LocationOfferLedger';

export const LOCATION_OFFER_GEOFENCE_TASK = 'kwilt-location-offers-geofence-v1';

const MIN_SPACING_MS_PER_ACTIVITY = 30 * 60 * 1000;
const STORE_STORAGE_KEY = 'kwilt-store';
const DOMAIN_STORAGE_KEY = 'kwilt-domain-v1';

function eventFromGeofenceEventType(
  type: Location.GeofencingEventType | undefined,
): 'enter' | 'exit' | null {
  if (type === Location.GeofencingEventType.Enter) return 'enter';
  if (type === Location.GeofencingEventType.Exit) return 'exit';
  return null;
}

type PersistedNotificationPreferences = {
  notificationsEnabled?: boolean;
  osPermissionStatus?: 'notRequested' | 'authorized' | 'denied' | 'restricted';
};

type PersistedLocationOfferPreferences = {
  enabled?: boolean;
  osPermissionStatus?: 'notRequested' | 'authorized' | 'denied' | 'restricted' | 'unavailable';
};

async function loadPersistedPreferences(): Promise<{
  notificationPreferences: PersistedNotificationPreferences | null;
  locationOfferPreferences: PersistedLocationOfferPreferences | null;
}> {
  try {
    const raw = await AsyncStorage.getItem(STORE_STORAGE_KEY);
    if (!raw) return { notificationPreferences: null, locationOfferPreferences: null };
    const parsed = JSON.parse(raw) as any;
    const state = parsed && typeof parsed === 'object' && 'state' in parsed ? (parsed as any).state : parsed;
    const notificationPreferences =
      state && typeof state.notificationPreferences === 'object' ? (state.notificationPreferences as any) : null;
    const locationOfferPreferences =
      state && typeof state.locationOfferPreferences === 'object' ? (state.locationOfferPreferences as any) : null;
    return { notificationPreferences, locationOfferPreferences };
  } catch {
    return { notificationPreferences: null, locationOfferPreferences: null };
  }
}

async function loadPersistedActivity(params: { activityId: string }): Promise<any | null> {
  try {
    const raw = await AsyncStorage.getItem(DOMAIN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as any;
    const activities = parsed && typeof parsed === 'object' ? (parsed.activities as any) : null;
    if (!Array.isArray(activities)) return null;
    return activities.find((a) => a && typeof a === 'object' && a.id === params.activityId) ?? null;
  } catch {
    return null;
  }
}

function shouldNotifyForTrigger(params: {
  configuredTrigger: 'arrive' | 'leave';
  event: 'enter' | 'exit';
}): boolean {
  return (
    (params.configuredTrigger === 'arrive' && params.event === 'enter') ||
    (params.configuredTrigger === 'leave' && params.event === 'exit')
  );
}

TaskManager.defineTask(LOCATION_OFFER_GEOFENCE_TASK, async ({ data, error }) => {
  if (error) {
    if (__DEV__) {
      console.warn('[locationOffers] geofence task error', error);
    }
    return;
  }

  // expo-location's geofencing payload type has changed across SDKs; keep a small structural type
  // so we don't pin this file to a specific Expo type export name.
  const payload = (data ?? undefined) as
    | {
        eventType?: Location.GeofencingEventType;
        type?: Location.GeofencingEventType;
        region?: { identifier?: string };
        regionIdentifier?: string;
        identifier?: string;
      }
    | undefined;
  const rawEventType = payload?.eventType ?? payload?.type;
  const event = eventFromGeofenceEventType(rawEventType);
  const activityId =
    (typeof payload?.region?.identifier === 'string' && payload.region.identifier) ||
    (typeof (payload as any)?.regionIdentifier === 'string' && (payload as any).regionIdentifier) ||
    (typeof (payload as any)?.identifier === 'string' && (payload as any).identifier) ||
    null;
  if (!event || !activityId) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[locationOffers] geofence task ignored (missing event/activityId)', {
        hasEvent: Boolean(event),
        activityId,
        rawEventType,
      });
    }
    return;
  }
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[locationOffers] geofence event received', { activityId, event });
  }

  // In headless/background task contexts, the zustand store may not have hydrated yet.
  // Prefer reading persisted snapshots to decide gating + find the Activity payload.
  const persisted = await loadPersistedPreferences();
  const inMemory = useAppStore.getState();
  const prefs = (persisted.notificationPreferences ?? inMemory.notificationPreferences) as any;
  const locPrefs = (persisted.locationOfferPreferences ?? inMemory.locationOfferPreferences) as any;

  if (!prefs?.notificationsEnabled || prefs?.osPermissionStatus !== 'authorized') {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[locationOffers] geofence blocked by notification prefs', {
        notificationsEnabled: Boolean(prefs?.notificationsEnabled),
        osPermissionStatus: prefs?.osPermissionStatus,
      });
    }
    return;
  }
  if (!locPrefs?.enabled || locPrefs?.osPermissionStatus !== 'authorized') {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[locationOffers] geofence blocked by location-offer prefs', {
        enabled: Boolean(locPrefs?.enabled),
        osPermissionStatus: locPrefs?.osPermissionStatus,
      });
    }
    return;
  }

  const activity =
    inMemory.activities.find((a) => a.id === activityId) ??
    (await loadPersistedActivity({ activityId })) ??
    null;
  const loc = (activity as any)?.location as any;
  if (!activity || !loc) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[locationOffers] geofence ignored (activity not found / missing location)', {
        activityId,
        foundActivity: Boolean(activity),
        hasLocation: Boolean(loc),
      });
    }
    return;
  }
  if (activity.status === 'done' || activity.status === 'cancelled') return;
  // Trigger semantics:
  // - If the activity has an explicit trigger, only notify for the matching event.
  // - If the trigger is missing (older data / AI-created items), allow BOTH enter+exit.
  const configuredTrigger: 'arrive' | 'leave' | null =
    loc?.trigger === 'arrive' || loc?.trigger === 'leave' ? loc.trigger : null;
  if (configuredTrigger && !shouldNotifyForTrigger({ configuredTrigger, event })) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[locationOffers] geofence ignored (trigger mismatch)', {
        activityId,
        event,
        configuredTrigger,
      });
    }
    return;
  }

  const nowIso = new Date().toISOString();
  const shouldFire = await shouldFireLocationOffer({
    activityId,
    event,
    minSpacingMs: MIN_SPACING_MS_PER_ACTIVITY,
    nowIso,
  });
  if (!shouldFire) return;

  const title = activity.title?.trim() ? activity.title.trim() : 'Activity';
  const locationLabel = typeof loc?.label === 'string' && loc.label.trim() ? loc.label.trim() : 'your place';
  const whenLabel = event === 'enter' ? 'Arrived at' : 'Left';

  const scheduledId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Mark “${title}” done?`,
      body: `${whenLabel} ${locationLabel}.`,
      data: { type: 'locationOffer', activityId, event },
    },
    trigger: null,
  }).catch((err) => {
    if (__DEV__) {
      console.warn('[locationOffers] failed to schedule notification', err);
    }
    return null;
  });
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[locationOffers] notification scheduled from geofence', {
      activityId,
      event,
      scheduled: Boolean(scheduledId),
      scheduledId,
    });
  }

  // Only record as "fired" if we successfully scheduled; otherwise we'd suppress retries
  // even though the user never saw the offer.
  if (scheduledId) {
    await recordLocationOfferFired({ activityId, event, firedAtIso: nowIso }).catch(() => undefined);
  }
});


