import * as Location from 'expo-location';
import { locationProfileForExploreMode } from '../domain/exploreRecordingMode';
import type { ExplorePreferences } from '../domain/types';
import { EXPLORE_BACKGROUND_TASK } from './exploreBackgroundTask';

function expoAccuracy(accuracy: 'balanced' | 'high'): Location.Accuracy {
  return accuracy === 'balanced' ? Location.Accuracy.Balanced : Location.Accuracy.High;
}

export async function startExploreBackgroundUpdates(
  mode: ExplorePreferences['recording'],
): Promise<void> {
  const profile = locationProfileForExploreMode(mode, 'background');
  await Location.startLocationUpdatesAsync(EXPLORE_BACKGROUND_TASK, {
    accuracy: expoAccuracy(profile.accuracy),
    distanceInterval: profile.distanceIntervalM,
    timeInterval: profile.timeIntervalMs,
    deferredUpdatesDistance: profile.deferredDistanceM,
    deferredUpdatesInterval: profile.deferredIntervalMs,
    pausesUpdatesAutomatically: profile.pausesAutomatically,
    activityType: Location.ActivityType.Fitness,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Explore is recording',
      notificationBody: 'Kwilt is efficiently clearing your private map.',
      killServiceOnDestroy: false,
    },
  });
}

export async function stopExploreBackgroundUpdates(): Promise<void> {
  const started = await Location.hasStartedLocationUpdatesAsync(EXPLORE_BACKGROUND_TASK).catch(() => false);
  if (started) await Location.stopLocationUpdatesAsync(EXPLORE_BACKGROUND_TASK).catch(() => undefined);
}
