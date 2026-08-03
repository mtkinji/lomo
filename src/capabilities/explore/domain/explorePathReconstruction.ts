import {
  coordinateDistanceM,
  MAX_CONTINUOUS_TRACE_GAP_M,
  MAX_RECONSTRUCTABLE_TRACE_GAP_M,
} from './exploreGeometry';
import type {
  ExploreCoordinate,
  ExplorePathReconstructionSegment,
  ExplorePoint,
  ExploreSession,
} from './types';

export type ExploreReconstructionRequest = {
  fromPointId: string;
  toPointId: string;
  from: ExplorePoint;
  to: ExplorePoint;
  transport: 'walking' | 'automobile';
};

function elapsedSeconds(from: ExplorePoint, to: ExplorePoint): number {
  return (Date.parse(to.recordedAt) - Date.parse(from.recordedAt)) / 1000;
}

function observedSpeedMps(from: ExplorePoint, to: ExplorePoint): number {
  const speeds = [from.speedMps, to.speedMps].filter(
    (speed): speed is number => typeof speed === 'number' && Number.isFinite(speed) && speed >= 0,
  );
  if (speeds.length) return Math.max(...speeds);
  return coordinateDistanceM(from, to) / elapsedSeconds(from, to);
}

export function buildExploreReconstructionRequests(
  points: readonly ExplorePoint[],
): ExploreReconstructionRequest[] {
  return points.slice(1).flatMap((to, index) => {
    const from = points[index];
    const distanceM = coordinateDistanceM(from, to);
    const seconds = elapsedSeconds(from, to);
    if (
      distanceM <= MAX_CONTINUOUS_TRACE_GAP_M ||
      distanceM > MAX_RECONSTRUCTABLE_TRACE_GAP_M ||
      !Number.isFinite(seconds) ||
      seconds <= 0 ||
      seconds > 180
    ) return [];
    const speedMps = observedSpeedMps(from, to);
    if (!Number.isFinite(speedMps) || speedMps > 55) return [];
    return [{
      fromPointId: from.id,
      toPointId: to.id,
      from,
      to,
      transport: speedMps >= 6 ? 'automobile' as const : 'walking' as const,
    }];
  });
}

export function validateExploreReconstruction({
  from,
  to,
  coordinates,
  routeDistanceM,
}: {
  from: ExplorePoint;
  to: ExplorePoint;
  coordinates: ExploreCoordinate[];
  routeDistanceM: number;
}): ExplorePathReconstructionSegment | null {
  if (coordinates.length < 2 || !Number.isFinite(routeDistanceM) || routeDistanceM <= 0) return null;
  if (coordinates.some((coordinate) =>
    !Number.isFinite(coordinate.latitude) || !Number.isFinite(coordinate.longitude))) return null;
  if (
    coordinateDistanceM(from, coordinates[0]) > 35 ||
    coordinateDistanceM(to, coordinates.at(-1)!) > 35
  ) return null;
  const directDistanceM = coordinateDistanceM(from, to);
  if (routeDistanceM > directDistanceM * 2.5 + 120) return null;
  const seconds = elapsedSeconds(from, to);
  if (!Number.isFinite(seconds) || seconds <= 0 || routeDistanceM / seconds > 55) return null;
  const interior = coordinates.slice(1, -1);
  const stride = Math.max(1, Math.ceil(interior.length / 126));
  const boundedInterior = interior.filter((_, index) => index % stride === 0).slice(0, 126);
  return {
    fromPointId: from.id,
    toPointId: to.id,
    coordinates: [{ latitude: from.latitude, longitude: from.longitude }, ...boundedInterior, {
      latitude: to.latitude,
      longitude: to.longitude,
    }],
    source: 'apple-directions',
    routeDistanceM,
  };
}

function reconstructedPoint(
  from: ExplorePoint,
  to: ExplorePoint,
  coordinate: ExploreCoordinate,
  progress: number,
  index: number,
): ExplorePoint {
  const fromTime = Date.parse(from.recordedAt);
  const toTime = Date.parse(to.recordedAt);
  const altitudeM = typeof from.altitudeM === 'number' && typeof to.altitudeM === 'number'
    ? from.altitudeM + (to.altitudeM - from.altitudeM) * progress
    : null;
  const altitudeAccuracyM = altitudeM === null
    ? null
    : Math.max(from.altitudeAccuracyM ?? 0, to.altitudeAccuracyM ?? 0);
  return {
    id: `reconstructed:${from.id}:${to.id}:${index}`,
    ...coordinate,
    altitudeM,
    horizontalAccuracyM: null,
    altitudeAccuracyM,
    speedMps: (from.speedMps ?? to.speedMps) ?? null,
    courseDeg: null,
    recordedAt: new Date(fromTime + (toTime - fromTime) * progress).toISOString(),
  };
}

export function displayPointsForExploreSession(session: ExploreSession): ExplorePoint[] {
  if (session.points.length < 2 || !session.reconstructedSegments?.length) return session.points;
  const segments = new Map(session.reconstructedSegments.map((segment) => [
    `${segment.fromPointId}:${segment.toPointId}`,
    segment,
  ]));
  const displayed: ExplorePoint[] = [session.points[0]];
  session.points.slice(1).forEach((to, pointIndex) => {
    const from = session.points[pointIndex];
    const segment = segments.get(`${from.id}:${to.id}`);
    if (segment && segment.coordinates.length > 2) {
      const distances = segment.coordinates.slice(1).map((coordinate, index) =>
        coordinateDistanceM(segment.coordinates[index], coordinate));
      const totalDistanceM = distances.reduce((total, distance) => total + distance, 0);
      let traveledM = 0;
      segment.coordinates.slice(1, -1).forEach((coordinate, index) => {
        traveledM += distances[index];
        displayed.push(reconstructedPoint(
          from,
          to,
          coordinate,
          totalDistanceM > 0 ? traveledM / totalDistanceM : (index + 1) / (segment.coordinates.length - 1),
          index,
        ));
      });
    }
    displayed.push(to);
  });
  return displayed;
}
