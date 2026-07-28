import { appendExplorePoint, completeExploreSession } from '../domain/exploreState';
import { coordinateDistanceM } from '../domain/exploreGeometry';
import { acceptExplorePoint, sanitizeLocationSample, type ExploreLocationSample } from '../domain/explorePointPolicy';
import type { ExploreData } from '../domain/types';

const STILLNESS_MS = 15 * 60_000;
const STILLNESS_RADIUS_M = 30;
const MAX_STILLNESS_ACCURACY_M = 35;

export function applyBackgroundSamples(
  state: ExploreData,
  samples: ExploreLocationSample[],
): { data: ExploreData; completedSessionId: string | null } {
  if (!state.activeSession) return { data: state, completedSessionId: null };
  let next = state;
  samples.forEach((sample, index) => {
    if (!next.activeSession) return;
    const sanitized = sanitizeLocationSample(sample);
    const accurate = sanitized.horizontalAccuracyM !== null && sanitized.horizontalAccuracyM <= MAX_STILLNESS_ACCURACY_M;
    const anchor = next.activeSession.backgroundStillnessAnchor;
    const remainsStill = accurate && anchor && coordinateDistanceM(anchor, sanitized) <= STILLNESS_RADIUS_M;
    next = {
      ...next,
      activeSession: {
        ...next.activeSession,
        backgroundStillnessAnchor: accurate
          ? (remainsStill ? anchor : { latitude: sanitized.latitude, longitude: sanitized.longitude })
          : null,
        backgroundStillSince: accurate
          ? (remainsStill ? next.activeSession.backgroundStillSince : sanitized.recordedAt)
          : null,
      },
    };
    const activeAfterStillnessUpdate = next.activeSession;
    if (!activeAfterStillnessUpdate) return;
    const previous = activeAfterStillnessUpdate.points.at(-1) ?? null;
    if (!acceptExplorePoint(previous, sanitized).accepted) return;
    next = appendExplorePoint(next, {
      id: `background-${sanitized.recordedAt}-${index}`,
      ...sanitized,
    });
  });
  const stillSince = next.activeSession?.backgroundStillSince;
  const latestAt = samples.at(-1)?.recordedAt;
  if (!next.activeSession || !stillSince || !latestAt || Date.parse(latestAt) - Date.parse(stillSince) < STILLNESS_MS) {
    return { data: next, completedSessionId: null };
  }
  const sessionId = next.activeSession.id;
  const endedAt = next.activeSession.points.at(-1)?.recordedAt ?? new Date().toISOString();
  return {
    data: completeExploreSession(next, endedAt, 'background-stillness'),
    completedSessionId: sessionId,
  };
}
