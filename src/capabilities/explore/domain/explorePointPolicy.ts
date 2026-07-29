import { coordinateDistanceM } from './exploreGeometry';
import type { ExplorePoint } from './types';

export type ExploreLocationSample = Omit<ExplorePoint, 'id' | 'speedMps' | 'courseDeg'> & {
  speedMps?: number | null;
  courseDeg?: number | null;
};

export type ExplorePointDecision =
  | { accepted: true; reason: 'first-point' | 'adaptive-distance' | 'course-change' }
  | { accepted: false; reason: 'weak-accuracy' | 'too-close' | 'sampling-window' | 'stale' | 'invalid' };

const MAX_HORIZONTAL_ACCURACY_M = 45;
const MIN_MOVEMENT_M = 3;
export const EXPLORE_SAMPLE_HORIZON_SECONDS = 0.8;
export const MIN_EXPLORE_SAMPLE_DISTANCE_M = 6;
export const MAX_EXPLORE_SAMPLE_DISTANCE_M = 22;
export const COURSE_CHANGE_RETENTION_DEG = 10;
export const COURSE_RETENTION_MIN_SPEED_MPS = 3;

export function normalizeCourseDeg(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return ((value % 360) + 360) % 360;
}

export function adaptiveExploreSampleDistanceM(speedMps: number | null): number {
  if (speedMps === null || !Number.isFinite(speedMps) || speedMps < 0) {
    return MIN_EXPLORE_SAMPLE_DISTANCE_M;
  }
  return Math.max(
    MIN_EXPLORE_SAMPLE_DISTANCE_M,
    Math.min(MAX_EXPLORE_SAMPLE_DISTANCE_M, speedMps * EXPLORE_SAMPLE_HORIZON_SECONDS),
  );
}

export function circularCourseDifferenceDeg(from: number, to: number): number {
  const normalizedFrom = normalizeCourseDeg(from);
  const normalizedTo = normalizeCourseDeg(to);
  if (normalizedFrom === null || normalizedTo === null) return 0;
  const directDifference = Math.abs(normalizedTo - normalizedFrom);
  return Math.min(directDifference, 360 - directDifference);
}

function inferredSpeedMps(
  previous: ExploreLocationSample,
  candidate: ExploreLocationSample,
  distanceM: number,
): number | null {
  const observedSpeeds = [previous.speedMps, candidate.speedMps].filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0,
  );
  if (observedSpeeds.length) {
    return observedSpeeds.reduce((total, value) => total + value, 0) / observedSpeeds.length;
  }
  const elapsedSeconds = (Date.parse(candidate.recordedAt) - Date.parse(previous.recordedAt)) / 1000;
  return Number.isFinite(elapsedSeconds) && elapsedSeconds > 0
    ? distanceM / elapsedSeconds
    : null;
}

export function sanitizeLocationSample<T extends ExploreLocationSample>(sample: T): T {
  const altitudeIsTrustworthy =
    typeof sample.altitudeM === 'number' &&
    Number.isFinite(sample.altitudeM) &&
    (sample.altitudeAccuracyM === null || sample.altitudeAccuracyM <= 30);
  return {
    ...sample,
    altitudeM: altitudeIsTrustworthy ? sample.altitudeM : null,
    courseDeg: normalizeCourseDeg(sample.courseDeg),
  };
}

export function explorePointFromSample(
  id: string,
  sample: ExploreLocationSample,
): ExplorePoint {
  const sanitized = sanitizeLocationSample(sample);
  return {
    id,
    latitude: sanitized.latitude,
    longitude: sanitized.longitude,
    altitudeM: sanitized.altitudeM,
    horizontalAccuracyM: sanitized.horizontalAccuracyM,
    altitudeAccuracyM: sanitized.altitudeAccuracyM,
    speedMps: typeof sanitized.speedMps === 'number' && Number.isFinite(sanitized.speedMps) && sanitized.speedMps >= 0
      ? sanitized.speedMps
      : null,
    courseDeg: normalizeCourseDeg(sanitized.courseDeg),
    recordedAt: sanitized.recordedAt,
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
  const distanceM = coordinateDistanceM(previous, candidate);
  if (distanceM < MIN_MOVEMENT_M) {
    return { accepted: false, reason: 'too-close' };
  }
  const speedMps = inferredSpeedMps(previous, candidate, distanceM);
  const previousCourse = normalizeCourseDeg(previous.courseDeg);
  const candidateCourse = normalizeCourseDeg(candidate.courseDeg);
  if (
    speedMps !== null &&
    speedMps >= COURSE_RETENTION_MIN_SPEED_MPS &&
    previousCourse !== null &&
    candidateCourse !== null &&
    circularCourseDifferenceDeg(previousCourse, candidateCourse) >= COURSE_CHANGE_RETENTION_DEG
  ) {
    return { accepted: true, reason: 'course-change' };
  }
  if (distanceM >= adaptiveExploreSampleDistanceM(speedMps)) {
    return { accepted: true, reason: 'adaptive-distance' };
  }
  return { accepted: false, reason: 'sampling-window' };
}
