import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { createEmptyExploreData, markExploreRecapNotified } from '../domain/exploreState';
import { exploreRecapNotification } from '../domain/exploreRecap';
import type { ExploreData, ExploreSession } from '../domain/types';
import { applyBackgroundSamples } from './exploreBackgroundPolicy';
import { useExploreStore } from './useExploreStore';

export const EXPLORE_BACKGROUND_TASK = 'kwilt-explore-background-location-v1';
const EXPLORE_STORAGE_KEY = 'kwilt-explore-v1';
const APP_STORAGE_KEY = 'kwilt-store';

async function globalNotificationsAreEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(APP_STORAGE_KEY);
    if (!raw) return true;
    const parsed = JSON.parse(raw);
    const state = parsed?.state ?? parsed;
    const preferences = state?.notificationPreferences;
    return preferences?.notificationsEnabled !== false &&
      preferences?.osPermissionStatus !== 'denied' &&
      preferences?.osPermissionStatus !== 'restricted';
  } catch {
    return false;
  }
}

function upgradeSession(session: Partial<ExploreSession>): ExploreSession {
  return {
    id: session.id ?? 'unknown-session',
    startedAt: session.startedAt ?? new Date().toISOString(),
    endedAt: session.endedAt ?? null,
    points: Array.isArray(session.points) ? session.points : [],
    discoveredPlaceIds: Array.isArray(session.discoveredPlaceIds) ? session.discoveredPlaceIds : [],
    recapStatus: session.recapStatus ?? 'none',
    completedReason: session.completedReason ?? null,
    recapNotificationSentAt: session.recapNotificationSentAt ?? null,
    backgroundStillnessAnchor: session.backgroundStillnessAnchor ?? null,
    backgroundStillSince: session.backgroundStillSince ?? null,
  };
}

type PersistEnvelope = Record<string, unknown> & { state?: unknown; version?: number };

function parsePersistedExplore(raw: string | null): { data: ExploreData; envelope: PersistEnvelope } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const envelope = parsed as PersistEnvelope;
    const persisted = (envelope.state ?? envelope) as Partial<ExploreData>;
    const defaults = createEmptyExploreData();
    return {
      envelope,
      data: {
        ...defaults,
        ...persisted,
        version: 2,
        activeSession: persisted.activeSession ? upgradeSession(persisted.activeSession) : null,
        sessions: Array.isArray(persisted.sessions) ? persisted.sessions.map(upgradeSession) : [],
        preferences: { ...defaults.preferences, ...(persisted.preferences ?? {}) },
      },
    };
  } catch {
    return null;
  }
}

TaskManager.defineTask(EXPLORE_BACKGROUND_TASK, async ({ data, error }) => {
  if (error) return;
  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations ?? [];
  if (!locations.length) return;
  const persisted = parsePersistedExplore(await AsyncStorage.getItem(EXPLORE_STORAGE_KEY));
  if (!persisted?.data.activeSession) return;
  const result = applyBackgroundSamples(persisted.data, locations.map((location) => ({
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    altitudeM: location.coords.altitude,
    horizontalAccuracyM: location.coords.accuracy,
    altitudeAccuracyM: location.coords.altitudeAccuracy,
    recordedAt: new Date(location.timestamp).toISOString(),
  })));
  let next = result.data;

  if (result.completedSessionId) {
    const session = next.sessions.find((candidate) => candidate.id === result.completedSessionId);
    if (session) {
      const content = exploreRecapNotification({
        sessionId: session.id,
        completedReason: session.completedReason,
        recapNotificationSentAt: session.recapNotificationSentAt,
        enabled: next.preferences.recapNotifications,
        showPlaceNamesOnLockScreen: next.preferences.showPlaceNamesOnLockScreen,
        placeNames: [],
      });
      if (content && await globalNotificationsAreEnabled()) {
        const notificationId = await Notifications.scheduleNotificationAsync({ content, trigger: null }).catch(() => null);
        if (notificationId) next = markExploreRecapNotified(next, session.id, new Date().toISOString());
      }
    }
    await Location.stopLocationUpdatesAsync(EXPLORE_BACKGROUND_TASK).catch(() => undefined);
  }

  const envelope = 'state' in persisted.envelope
    ? { ...persisted.envelope, state: next, version: 2 }
    : { state: next, version: 2 };
  await AsyncStorage.setItem(EXPLORE_STORAGE_KEY, JSON.stringify(envelope));
  if (useExploreStore.persist.hasHydrated()) {
    useExploreStore.setState({ ...next, lastPointDecision: 'background-location' });
  }
});
