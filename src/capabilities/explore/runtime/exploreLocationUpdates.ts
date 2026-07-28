import * as Location from 'expo-location';
import {
  adaptiveLocationProfile,
  trackingPolicyForRecordingMode,
} from '../domain/exploreAdaptiveTracking';
import type {
  ExploreMovementClass,
  ExplorePreferences,
  ExploreTrackingPhase,
} from '../domain/types';
import {
  EXPLORE_BACKGROUND_TASK,
  EXPLORE_WAKE_REGION_ID,
  EXPLORE_WAKE_TASK,
} from './exploreLocationTaskNames';

function expoAccuracy(accuracy: 'balanced' | 'high'): Location.Accuracy {
  return accuracy === 'balanced' ? Location.Accuracy.Balanced : Location.Accuracy.High;
}

function expoActivityType(movement: ExploreMovementClass): Location.ActivityType {
  if (movement === 'airplane') return Location.ActivityType.Airborne;
  if (movement === 'vehicle') return Location.ActivityType.OtherNavigation;
  return Location.ActivityType.Fitness;
}

export async function startExploreBackgroundUpdates(
  mode: ExplorePreferences['recording'],
  phase: Exclude<ExploreTrackingPhase, 'deep-sleep'> = 'active',
  movement: ExploreMovementClass = 'unknown',
): Promise<void> {
  const wakeStarted = await Location.hasStartedGeofencingAsync(EXPLORE_WAKE_TASK).catch(() => false);
  if (wakeStarted) await Location.stopGeofencingAsync(EXPLORE_WAKE_TASK).catch(() => undefined);
  const profile = adaptiveLocationProfile(
    trackingPolicyForRecordingMode(mode),
    phase,
    movement,
  );
  await Location.startLocationUpdatesAsync(EXPLORE_BACKGROUND_TASK, {
    accuracy: expoAccuracy(profile.accuracy),
    distanceInterval: profile.distanceIntervalM,
    timeInterval: profile.timeIntervalMs,
    deferredUpdatesDistance: profile.deferredDistanceM,
    deferredUpdatesInterval: profile.deferredIntervalMs,
    pausesUpdatesAutomatically: profile.pausesAutomatically,
    activityType: expoActivityType(movement),
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Explore is recording',
      notificationBody: 'Kwilt is efficiently clearing your private map.',
      killServiceOnDestroy: false,
    },
  });
}

export async function enterExploreDeepSleep(anchor: {
  latitude: number;
  longitude: number;
  horizontalAccuracyM: number | null;
}): Promise<void> {
  await Location.startGeofencingAsync(EXPLORE_WAKE_TASK, [{
    identifier: EXPLORE_WAKE_REGION_ID,
    latitude: anchor.latitude,
    longitude: anchor.longitude,
    radius: 200,
    notifyOnEnter: false,
    notifyOnExit: true,
  }]);
  const started = await Location.hasStartedLocationUpdatesAsync(EXPLORE_BACKGROUND_TASK).catch(() => false);
  if (started) await Location.stopLocationUpdatesAsync(EXPLORE_BACKGROUND_TASK).catch(() => undefined);
}

export async function isExploreLocationServiceStarted(): Promise<boolean> {
  const [locationsStarted, wakeStarted] = await Promise.all([
    Location.hasStartedLocationUpdatesAsync(EXPLORE_BACKGROUND_TASK).catch(() => false),
    Location.hasStartedGeofencingAsync(EXPLORE_WAKE_TASK).catch(() => false),
  ]);
  return locationsStarted || wakeStarted;
}

export async function stopExploreBackgroundUpdates(): Promise<void> {
  const started = await Location.hasStartedLocationUpdatesAsync(EXPLORE_BACKGROUND_TASK).catch(() => false);
  if (started) await Location.stopLocationUpdatesAsync(EXPLORE_BACKGROUND_TASK).catch(() => undefined);
  const wakeStarted = await Location.hasStartedGeofencingAsync(EXPLORE_WAKE_TASK).catch(() => false);
  if (wakeStarted) await Location.stopGeofencingAsync(EXPLORE_WAKE_TASK).catch(() => undefined);
}
