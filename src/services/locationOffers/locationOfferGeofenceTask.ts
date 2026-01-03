import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useAppStore } from '../../store/useAppStore';
import { shouldFireLocationOffer, recordLocationOfferFired } from './LocationOfferLedger';

export const LOCATION_OFFER_GEOFENCE_TASK = 'kwilt-location-offers-geofence-v1';

const MIN_SPACING_MS_PER_ACTIVITY = 30 * 60 * 1000;

function eventFromGeofenceEventType(
  type: Location.GeofencingEventType | undefined,
): 'enter' | 'exit' | null {
  if (type === Location.GeofencingEventType.Enter) return 'enter';
  if (type === Location.GeofencingEventType.Exit) return 'exit';
  return null;
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
  const payload = data as
    | {
        eventType?: Location.GeofencingEventType;
        region?: { identifier?: string };
      }
    | undefined;
  const event = eventFromGeofenceEventType(payload?.eventType);
  const region = payload?.region;
  const activityId = region?.identifier;
  if (!event || !activityId) return;

  const state = useAppStore.getState();
  const prefs = state.notificationPreferences;
  const locPrefs = state.locationOfferPreferences;
  if (!prefs.notificationsEnabled || prefs.osPermissionStatus !== 'authorized') return;
  if (!locPrefs.enabled || locPrefs.osPermissionStatus !== 'authorized') return;

  const activity = state.activities.find((a) => a.id === activityId);
  const loc = (activity as any)?.location as any;
  if (!activity || !loc) return;
  if (activity.status === 'done' || activity.status === 'cancelled') return;
  if (loc?.trigger !== 'arrive' && loc?.trigger !== 'leave') return;
  if (!shouldNotifyForTrigger({ configuredTrigger: loc.trigger, event })) return;

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

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Mark “${title}” done?`,
      body: `${whenLabel} ${locationLabel}.`,
      data: { type: 'locationOffer', activityId, event },
    },
    trigger: null,
  }).catch(() => undefined);

  await recordLocationOfferFired({ activityId, event, firedAtIso: nowIso }).catch(() => undefined);
});


