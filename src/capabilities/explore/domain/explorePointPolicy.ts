import { coordinateDistanceM } from './exploreGeometry';
import type { ExplorePoint } from './types';

export type ExploreLocationSample = Omit<ExplorePoint, 'id'> & {
  speedMps?: number | null;
};

export type ExplorePointDecision =
  | { accepted: true; reason: 'first-point' | 'moved' }
  | { accepted: false; reason: 'weak-accuracy' | 'too-close' | 'stale' | 'invalid' };

const MAX_HORIZONTAL_ACCURACY_M = 45;
const MIN_MOVEMENT_M = 3;

export function sanitizeLocationSample<T extends ExploreLocationSample>(sample: T): T {
  const altitudeIsTrustworthy =
    typeof sample.altitudeM === 'number' &&
    Number.isFinite(sample.altitudeM) &&
    (sample.altitudeAccuracyM === null || sample.altitudeAccuracyM <= 30);
  return {
    ...sample,
    altitudeM: altitudeIsTrustworthy ? sample.altitudeM : null,
  };
}

export function acceptExplorePoint(
  previous: ExploreLocationSample | null,
  candidate: ExploreLocationSample,
): ExplorePointDecision {
  if (!Number.isFinite(candidate.latitude) || !Number.isFinite(candidate.longitude)) {
    return { accepted: false, reason: 'invalid' };
  }
  if (
    typeof candidate.horizontalAccuracyM === 'number' &&
    candidate.horizontalAccuracyM > MAX_HORIZONTAL_ACCURACY_M
  ) {
    return { accepted: false, reason: 'weak-accuracy' };
  }
  if (!previous) return { accepted: true, reason: 'first-point' };
  if (Date.parse(candidate.recordedAt) <= Date.parse(previous.recordedAt)) {
    return { accepted: false, reason: 'stale' };
  }
  if (coordinateDistanceM(previous, candidate) < MIN_MOVEMENT_M) {
    return { accepted: false, reason: 'too-close' };
  }
  return { accepted: true, reason: 'moved' };
}
