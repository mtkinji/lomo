import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { createEmptyExploreData, markExploreRecapNotified, rebuildExploreTerritory } from '../domain/exploreState';
import { exploreRecapNotification } from '../domain/exploreRecap';
import { prepareExploreBackgroundBatch } from '../domain/exploreRecordingMode';
import { normalizeCourseDeg } from '../domain/explorePointPolicy';
import {
  normalizeExploreTrackingState,
  resumeExploreTracking,
  trackingPolicyForRecordingMode,
} from '../domain/exploreAdaptiveTracking';
import type { ExploreData, ExploreSession } from '../domain/types';
import { applyBackgroundSamples } from './exploreBackgroundPolicy';
import {
  enterExploreDeepSleep,
  startExploreBackgroundUpdates,
  stopExploreBackgroundUpdates,
} from './exploreLocationUpdates';
import { useExploreStore } from './useExploreStore';
import {
  EXPLORE_BACKGROUND_TASK,
  EXPLORE_WAKE_REGION_ID,
  EXPLORE_WAKE_TASK,
} from './exploreLocationTaskNames';
import { KWILT_LABS_STORAGE_KEY, parsePersistedKwiltLabs } from '../../../labs/kwiltLabs';

export { EXPLORE_BACKGROUND_TASK } from './exploreLocationTaskNames';
const EXPLORE_STORAGE_KEY = 'kwilt-explore-v1';
const APP_STORAGE_KEY = 'kwilt-store';

async function exploreLabIsEnabled(): Promise<boolean> {
  const persisted = parsePersistedKwiltLabs(await AsyncStorage.getItem(KWILT_LABS_STORAGE_KEY));
  return persisted.enabledCapabilities.includes('explore');
}

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

function upgradeSession(
  session: Partial<ExploreSession>,
  fallbackPolicy: ExploreSession['trackingPolicy'] = 'ambient',
): ExploreSession {
  return {
    id: session.id ?? 'unknown-session',
    trackingPolicy: session.trackingPolicy === 'adventure' || session.trackingPolicy === 'ambient'
      ? session.trackingPolicy
      : fallbackPolicy,
    startedAt: session.startedAt ?? new Date().toISOString(),
    endedAt: session.endedAt ?? null,
    points: Array.isArray(session.points) ? session.points.map((point) => ({
      ...point,
      speedMps: typeof point.speedMps === 'number' && Number.isFinite(point.speedMps) && point.speedMps >= 0
        ? point.speedMps
        : null,
      courseDeg: normalizeCourseDeg(point.courseDeg),
    })) : [],
    reconstructedSegments: Array.isArray(session.reconstructedSegments) ? session.reconstructedSegments : [],
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
    const activeFallbackPolicy = persisted.tracking?.policy === 'adventure' || persisted.tracking?.policy === 'ambient'
      ? persisted.tracking.policy
      : trackingPolicyForRecordingMode(persisted.preferences?.recording ?? defaults.preferences.recording);
    const data = {
        ...defaults,
        ...persisted,
        version: 10,
        activeSession: persisted.activeSession
          ? upgradeSession(persisted.activeSession, activeFallbackPolicy)
          : null,
        sessions: Array.isArray(persisted.sessions)
          ? persisted.sessions.map((session) => upgradeSession(session))
          : [],
        preferences: { ...defaults.preferences, ...(persisted.preferences ?? {}) },
        tracking: normalizeExploreTrackingState(
          persisted.tracking,
          persisted.activeSession
            ? trackingPolicyForRecordingMode(persisted.preferences?.recording ?? defaults.preferences.recording)
            : null,
          persisted.activeSession?.startedAt ?? null,
        ),
      } as ExploreData;
    return {
      envelope,
      data: (envelope.version ?? persisted.version ?? 0) < 7
        ? rebuildExploreTerritory(data)
        : data,
    };
  } catch {
    return null;
  }
}

TaskManager.defineTask(EXPLORE_BACKGROUND_TASK, async ({ data, error }) => {
  if (error) return;
  if (!await exploreLabIsEnabled()) {
    await stopExploreBackgroundUpdates().catch(() => undefined);
    return;
  }
  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations ?? [];
  if (!locations.length) return;
  const persisted = parsePersistedExplore(await AsyncStorage.getItem(EXPLORE_STORAGE_KEY));
  if (!persisted) return;
  const samples = locations.map((location) => ({
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    altitudeM: location.coords.altitude,
    horizontalAccuracyM: location.coords.accuracy,
    altitudeAccuracyM: location.coords.altitudeAccuracy,
    speedMps: location.coords.speed,
    courseDeg: location.coords.heading,
    recordedAt: new Date(location.timestamp).toISOString(),
  }));
  const preparedBatch = prepareExploreBackgroundBatch(
    persisted.data,
    samples[0],
    `automatic-${samples[0].recordedAt}`,
  );
  const prepared = preparedBatch.data;
  if (!prepared.activeSession) return;
  const result = applyBackgroundSamples(prepared, samples);
  let next = result.data;

  const completedSessionId = result.completedSessionId ?? preparedBatch.completedSessionId;
  if (completedSessionId) {
    const session = next.sessions.find((candidate) => candidate.id === completedSessionId);
    if (session) {
      const unseenRecapAlreadyNotified = next.sessions.some((candidate) =>
        candidate.id !== session.id &&
        candidate.recapStatus !== 'seen' &&
        Boolean(candidate.recapNotificationSentAt),
      );
      const content = exploreRecapNotification({
        sessionId: session.id,
        completedReason: session.completedReason,
        recapNotificationSentAt: session.recapNotificationSentAt,
        enabled: next.preferences.recapNotifications,
        showPlaceNamesOnLockScreen: next.preferences.showPlaceNamesOnLockScreen,
        placeNames: [],
        unseenRecapAlreadyNotified,
      });
      if (content && await globalNotificationsAreEnabled()) {
        const notificationId = await Notifications.scheduleNotificationAsync({ content, trigger: null }).catch(() => null);
        if (notificationId) next = markExploreRecapNotified(next, session.id, new Date().toISOString());
      }
    }
  }

  if (useExploreStore.persist.hasHydrated()) {
    const persistLiveState = useExploreStore.setState as unknown as (
      state: Partial<ReturnType<typeof useExploreStore.getState>>,
    ) => void | Promise<void>;
    await persistLiveState({ ...next, lastPointDecision: 'background-location' });
  } else {
    const envelope = 'state' in persisted.envelope
      ? { ...persisted.envelope, state: next, version: 10 }
      : { state: next, version: 10 };
    await AsyncStorage.setItem(EXPLORE_STORAGE_KEY, JSON.stringify(envelope));
  }
  if (result.trackingAction === 'deep-sleep' && next.tracking.wakeAnchor) {
    await enterExploreDeepSleep(next.tracking.wakeAnchor).catch(() => undefined);
  } else if (result.trackingAction === 'soft-sleep' || result.trackingAction === 'active') {
    await startExploreBackgroundUpdates(
      next.tracking.policy === 'ambient' ? 'automatic' : 'manual',
      next.tracking.phase === 'soft-sleep' ? 'soft-sleep' : 'active',
      next.tracking.movement,
    ).catch(() => undefined);
  }
});

TaskManager.defineTask(EXPLORE_WAKE_TASK, async ({ data, error }) => {
  if (error) return;
  if (!await exploreLabIsEnabled()) {
    await stopExploreBackgroundUpdates().catch(() => undefined);
    return;
  }
  const event = data as {
    eventType?: Location.GeofencingEventType;
    region?: Location.LocationRegion;
  } | undefined;
  if (
    event?.eventType !== Location.GeofencingEventType.Exit ||
    event.region?.identifier !== EXPLORE_WAKE_REGION_ID
  ) return;
  const persisted = parsePersistedExplore(await AsyncStorage.getItem(EXPLORE_STORAGE_KEY));
  if (!persisted?.data.activeSession || !persisted.data.tracking.policy) {
    await stopExploreBackgroundUpdates();
    return;
  }
  const next: ExploreData = {
    ...persisted.data,
    tracking: resumeExploreTracking(persisted.data.tracking, new Date().toISOString()),
  };
  const envelope = 'state' in persisted.envelope
    ? { ...persisted.envelope, state: next, version: 10 }
    : { state: next, version: 10 };
  await AsyncStorage.setItem(EXPLORE_STORAGE_KEY, JSON.stringify(envelope));
  if (useExploreStore.persist.hasHydrated()) {
    useExploreStore.setState({ ...next, lastPointDecision: 'background-wake' });
  }
  const recordingMode = next.tracking.policy === 'ambient' ? 'automatic' : 'manual';
  await startExploreBackgroundUpdates(recordingMode, 'active', 'unknown').catch(() => undefined);
});
