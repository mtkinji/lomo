import { coordinateDistanceM, isExploreTraceContinuous } from './exploreGeometry';
import type { ExplorePoint } from './types';

export type ExplorePlaybackFrame = {
  progress: number;
  visiblePointCount: number;
  cursor: ExplorePoint | null;
  cutoffAt: string | null;
};

export type ExploreElevationSample = {
  pointIndex: number;
  distanceM: number;
  altitudeM: number;
};

export type ExploreElevationProfile = {
  segments: Array<{ samples: ExploreElevationSample[] }>;
  totalDistanceM: number;
  minAltitudeM: number;
  maxAltitudeM: number;
};

function boundedProgress(progress: number): number {
  if (!Number.isFinite(progress)) return 1;
  return Math.max(0, Math.min(1, progress));
}

export function buildExplorePlaybackFrame(
  points: readonly ExplorePoint[],
  requestedProgress: number,
): ExplorePlaybackFrame {
  const progress = boundedProgress(requestedProgress);
  if (!points.length) {
    return { progress, visiblePointCount: 0, cursor: null, cutoffAt: null };
  }

  const timestamps = points.map((point) => Date.parse(point.recordedAt));
  const hasOrderedTimes = timestamps.every((timestamp, index) =>
    Number.isFinite(timestamp) && (index === 0 || timestamp >= timestamps[index - 1]),
  );
  let visiblePointCount: number;
  if (hasOrderedTimes && timestamps.at(-1)! > timestamps[0]) {
    const playbackTime = timestamps[0] + (timestamps.at(-1)! - timestamps[0]) * progress;
    const lastVisibleIndex = timestamps.findLastIndex((timestamp) => timestamp <= playbackTime);
    visiblePointCount = Math.max(1, lastVisibleIndex + 1);
  } else {
    visiblePointCount = Math.min(points.length, Math.floor(progress * (points.length - 1)) + 1);
  }

  const cursor = points[visiblePointCount - 1] ?? points[0];
  return {
    progress,
    visiblePointCount,
    cursor,
    cutoffAt: cursor.recordedAt,
  };
}

export function explorePlaybackDurationMs(pointCount: number): number {
  return Math.max(6000, Math.min(18000, Math.max(0, pointCount) * 80));
}

function hasTrustedAltitude(point: ExplorePoint): point is ExplorePoint & { altitudeM: number } {
  return typeof point.altitudeM === 'number' &&
    Number.isFinite(point.altitudeM) &&
    (point.altitudeAccuracyM === null || point.altitudeAccuracyM <= 30);
}

export function buildExploreElevationProfile(
  points: readonly ExplorePoint[],
): ExploreElevationProfile | null {
  const samples: ExploreElevationSample[] = [];
  const segments: Array<{ samples: ExploreElevationSample[] }> = [];
  let current: ExploreElevationSample[] = [];
  let totalDistanceM = 0;

  points.forEach((point, pointIndex) => {
    const previous = points[pointIndex - 1];
    const continuous = !previous || isExploreTraceContinuous(previous, point);
    if (previous && continuous) totalDistanceM += coordinateDistanceM(previous, point);

    if (!continuous || !hasTrustedAltitude(point)) {
      if (current.length) segments.push({ samples: current });
      current = [];
      return;
    }

    const sample = { pointIndex, distanceM: totalDistanceM, altitudeM: point.altitudeM };
    current.push(sample);
    samples.push(sample);
  });
  if (current.length) segments.push({ samples: current });
  if (samples.length < 2 || !segments.some((segment) => segment.samples.length > 1)) return null;

  const altitudes = samples.map((sample) => sample.altitudeM);
  return {
    segments,
    totalDistanceM,
    minAltitudeM: Math.min(...altitudes),
    maxAltitudeM: Math.max(...altitudes),
  };
}
