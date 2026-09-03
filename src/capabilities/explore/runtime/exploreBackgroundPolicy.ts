import { appendExplorePoint } from '../domain/exploreState';
import {
  shouldClearFogForMovement,
  transitionExploreTracking,
} from '../domain/exploreAdaptiveTracking';
import {
  acceptExplorePoint,
  explorePointFromSample,
  sanitizeLocationSample,
  type ExploreLocationSample,
} from '../domain/explorePointPolicy';
import type { ExploreData } from '../domain/types';

export type ExploreTrackingAction = 'none' | 'active' | 'soft-sleep' | 'deep-sleep';

export function applyBackgroundSamples(
  state: ExploreData,
  samples: ExploreLocationSample[],
): { data: ExploreData; completedSessionId: string | null; trackingAction: ExploreTrackingAction } {
  if (!state.activeSession) {
    return { data: state, completedSessionId: null, trackingAction: 'none' };
  }
  let next = state;
  let trackingAction: ExploreTrackingAction = 'none';
  samples.forEach((sample, index) => {
    if (!next.activeSession) return;
    const trackingPolicy = next.activeSession.trackingPolicy;
    const sanitized = sanitizeLocationSample(sample);
    const previous = next.activeSession.points.at(-1) ?? null;
    const previousTracking = next.tracking;
    const tracking = transitionExploreTracking(previousTracking, previous, sanitized);
    if (tracking.phase !== previousTracking.phase) {
      trackingAction = tracking.phase;
    } else if (
      tracking.phase === 'active' &&
      tracking.movement !== previousTracking.movement
    ) {
      trackingAction = 'active';
    }
    next = {
      ...next,
      tracking,
    };
    if (!shouldClearFogForMovement(tracking.movement)) return;
    if (!acceptExplorePoint(previous, sanitized, trackingPolicy).accepted) return;
    next = appendExplorePoint(next, explorePointFromSample(
      `background-${sanitized.recordedAt}-${index}`,
      sanitized,
    ));
  });
  return {
    data: next,
    completedSessionId: null,
    trackingAction,
  };
}
