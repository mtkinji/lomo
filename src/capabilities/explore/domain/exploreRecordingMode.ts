import { coordinateDistanceM } from './exploreGeometry';
import { beginExploreSession, completeExploreSession } from './exploreState';
import type { ExploreData, ExplorePoint, ExplorePreferences } from './types';
import type { ExploreLocationSample } from './explorePointPolicy';

export type ExploreLocationProfile = {
  accuracy: 'balanced' | 'high';
  distanceIntervalM: number;
  timeIntervalMs: number;
  deferredDistanceM: number;
  deferredIntervalMs: number;
  pausesAutomatically: boolean;
};

export function locationProfileForExploreMode(
  mode: ExplorePreferences['recording'],
  appContext: 'foreground' | 'background',
): ExploreLocationProfile {
  if (appContext === 'background') {
    return mode === 'automatic'
      ? { accuracy: 'high', distanceIntervalM: 30, timeIntervalMs: 30_000, deferredDistanceM: 60, deferredIntervalMs: 60_000, pausesAutomatically: true }
      : { accuracy: 'high', distanceIntervalM: 24, timeIntervalMs: 20_000, deferredDistanceM: 48, deferredIntervalMs: 45_000, pausesAutomatically: true };
  }
  return mode === 'automatic'
    ? { accuracy: 'high', distanceIntervalM: 20, timeIntervalMs: 20_000, deferredDistanceM: 0, deferredIntervalMs: 0, pausesAutomatically: false }
    : { accuracy: 'high', distanceIntervalM: 12, timeIntervalMs: 10_000, deferredDistanceM: 0, deferredIntervalMs: 0, pausesAutomatically: false };
}

function lastCompletedPoint(state: ExploreData): ExplorePoint | null {
  for (const session of state.sessions) {
    const point = session.points.at(-1);
    if (point) return point;
  }
  return null;
}

export function prepareAutomaticBackgroundSession(
  state: ExploreData,
  sample: ExploreLocationSample,
  sessionId: string,
): ExploreData {
  if (state.preferences.recording !== 'automatic' || state.activeSession) return state;
  const previous = lastCompletedPoint(state);
  if (previous && coordinateDistanceM(previous, sample) < 50) return state;
  return beginExploreSession(state, sessionId, sample.recordedAt);
}

export function prepareAutomaticBackgroundBatch(
  state: ExploreData,
  sample: ExploreLocationSample,
  sessionId: string,
): { data: ExploreData; completedSessionId: string | null } {
  if (state.preferences.recording !== 'automatic') {
    return { data: state, completedSessionId: null };
  }
  const active = state.activeSession;
  const previous = active?.points.at(-1);
  if (active && previous) {
    const gapMs = Date.parse(sample.recordedAt) - Date.parse(previous.recordedAt);
    if (gapMs >= 20 * 60_000 && coordinateDistanceM(previous, sample) >= 50) {
      const completed = completeExploreSession(state, previous.recordedAt, 'background-stillness');
      return {
        data: beginExploreSession(completed, sessionId, sample.recordedAt),
        completedSessionId: active.id,
      };
    }
  }
  return {
    data: prepareAutomaticBackgroundSession(state, sample, sessionId),
    completedSessionId: null,
  };
}
