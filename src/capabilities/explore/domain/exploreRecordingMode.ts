import { coordinateDistanceM } from './exploreGeometry';
import {
  adaptiveLocationProfile,
  shouldSplitExploreOuting,
  trackingPolicyForRecordingMode,
  type ExploreAdaptiveLocationProfile,
} from './exploreAdaptiveTracking';
import { beginExploreSession, completeExploreSession } from './exploreState';
import type { ExploreData, ExplorePoint, ExplorePreferences } from './types';
import type { ExploreLocationSample } from './explorePointPolicy';

export type ExploreLocationProfile = ExploreAdaptiveLocationProfile;

export function locationProfileForExploreMode(
  mode: ExplorePreferences['recording'],
  appContext: 'foreground' | 'background',
): ExploreLocationProfile {
  if (appContext === 'background') {
    return adaptiveLocationProfile(
      trackingPolicyForRecordingMode(mode),
      'active',
      'unknown',
    );
  }
  return mode === 'automatic'
    ? { accuracy: 'high', distanceIntervalM: 20, timeIntervalMs: 20_000, deferredDistanceM: 0, deferredIntervalMs: 0, pausesAutomatically: false }
    : { accuracy: 'high', distanceIntervalM: 6, timeIntervalMs: 1_000, deferredDistanceM: 0, deferredIntervalMs: 0, pausesAutomatically: false };
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
  return beginExploreSession(state, sessionId, sample.recordedAt, 'ambient');
}

export function prepareExploreBackgroundBatch(
  state: ExploreData,
  sample: ExploreLocationSample,
  sessionId: string,
): { data: ExploreData; completedSessionId: string | null } {
  const active = state.activeSession;
  const previous = active?.points.at(-1);
  const policy = state.tracking.policy ?? trackingPolicyForRecordingMode(state.preferences.recording);
  if (active && previous) {
    const gapMs = Date.parse(sample.recordedAt) - Date.parse(previous.recordedAt);
    if (shouldSplitExploreOuting(policy, gapMs) && coordinateDistanceM(previous, sample) >= 50) {
      const completed = completeExploreSession(state, previous.recordedAt, 'background-stillness');
      return {
        data: beginExploreSession(completed, sessionId, sample.recordedAt, policy),
        completedSessionId: active.id,
      };
    }
  }
  return {
    data: prepareAutomaticBackgroundSession(state, sample, sessionId),
    completedSessionId: null,
  };
}

export const prepareAutomaticBackgroundBatch = prepareExploreBackgroundBatch;
