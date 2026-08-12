import type { ExploreCoordinate, ExploredCell } from './types';

export const EXPLORE_REVEAL_RADIUS_M = 65 * 0.3048;
export const EXPLORE_FEATHER_REFERENCE_RADIUS_M = 100 * 0.3048;
export const EXPLORE_CELL_SIZE_M = 24;
export const MAX_CONTINUOUS_TRACE_GAP_M = 60;
export const MAX_RECONSTRUCTABLE_TRACE_GAP_M = 0.25 * 1609.344;
const MAX_ACQUISITION_AWARE_TRACE_INTERVAL_S = 180;
const TRACE_POSITION_ALLOWANCE_M = 8;
const FOG_TRACE_SIMPLIFICATION_TOLERANCE_M = 3;

const EARTH_RADIUS_M = 6_371_000;
const METERS_PER_LATITUDE_DEGREE = 111_320;

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function radiansToDegrees(value: number): number {
  return (value * 180) / Math.PI;
}

export function coordinateDistanceM(a: ExploreCoordinate, b: ExploreCoordinate): number {
  const latitudeDelta = degreesToRadians(b.latitude - a.latitude);
  const longitudeDelta = degreesToRadians(b.longitude - a.longitude);
  const latitudeA = degreesToRadians(a.latitude);
  const latitudeB = degreesToRadians(b.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

export function exploreCellForCoordinate(coordinate: ExploreCoordinate): Pick<ExploredCell, 'id' | 'center'> {
  const row = Math.round((coordinate.latitude * METERS_PER_LATITUDE_DEGREE) / EXPLORE_CELL_SIZE_M);
  const centerLatitude = (row * EXPLORE_CELL_SIZE_M) / METERS_PER_LATITUDE_DEGREE;
  const longitudeScale = Math.max(0.1, Math.cos(degreesToRadians(centerLatitude)));
  const column = Math.round(
    (coordinate.longitude * METERS_PER_LATITUDE_DEGREE * longitudeScale) / EXPLORE_CELL_SIZE_M,
  );
  const centerLongitude =
    (column * EXPLORE_CELL_SIZE_M) / (METERS_PER_LATITUDE_DEGREE * longitudeScale);

  return {
    id: `${row}:${column}`,
    center: { latitude: centerLatitude, longitude: centerLongitude },
  };
}

export function exploreCellsAlongSegment(
  from: ExploreCoordinate,
  to: ExploreCoordinate,
): Array<Pick<ExploredCell, 'id' | 'center'>> {
  const distanceM = coordinateDistanceM(from, to);
  const segmentCount = Math.max(1, Math.ceil(distanceM / EXPLORE_CELL_SIZE_M));
  const cells = Array.from({ length: segmentCount + 1 }, (_, index) => {
    const progress = index / segmentCount;
    return exploreCellForCoordinate({
      latitude: from.latitude + (to.latitude - from.latitude) * progress,
      longitude: from.longitude + (to.longitude - from.longitude) * progress,
    });
  });
  return [...new Map(cells.map((cell) => [cell.id, cell])).values()];
}

type ExploreContinuityCoordinate = ExploreCoordinate & {
  recordedAt?: string;
  speedMps?: number | null;
  horizontalAccuracyM?: number | null;
};

function trustworthySpeedMps(coordinate: ExploreContinuityCoordinate): number | null {
  return typeof coordinate.speedMps === 'number' &&
    Number.isFinite(coordinate.speedMps) &&
    coordinate.speedMps >= 0 &&
    coordinate.speedMps < 60
    ? coordinate.speedMps
    : null;
}

function trustworthyAccuracyM(coordinate: ExploreContinuityCoordinate): number {
  return typeof coordinate.horizontalAccuracyM === 'number' &&
    Number.isFinite(coordinate.horizontalAccuracyM) &&
    coordinate.horizontalAccuracyM >= 0
    ? Math.min(45, coordinate.horizontalAccuracyM)
    : 0;
}

export function isExploreTraceContinuous(
  from: ExploreContinuityCoordinate,
  to: ExploreContinuityCoordinate,
): boolean {
  const distanceM = coordinateDistanceM(from, to);
  if (distanceM <= MAX_CONTINUOUS_TRACE_GAP_M) return true;
  if (distanceM > MAX_RECONSTRUCTABLE_TRACE_GAP_M) return false;

  const elapsedSeconds = (Date.parse(to.recordedAt ?? '') - Date.parse(from.recordedAt ?? '')) / 1000;
  if (
    !Number.isFinite(elapsedSeconds) ||
    elapsedSeconds <= 0 ||
    elapsedSeconds > MAX_ACQUISITION_AWARE_TRACE_INTERVAL_S
  ) return false;

  const speeds = [trustworthySpeedMps(from), trustworthySpeedMps(to)]
    .filter((speed): speed is number => speed !== null);
  const inferredSpeedMps = distanceM / elapsedSeconds;
  if (!speeds.length) return inferredSpeedMps <= 55;
  const plausibleDistanceM = Math.max(...speeds) * elapsedSeconds +
    trustworthyAccuracyM(from) +
    trustworthyAccuracyM(to) +
    TRACE_POSITION_ALLOWANCE_M;
  return distanceM <= plausibleDistanceM;
}

export function exploreCellsForRecordedStep(
  from: ExploreCoordinate | null,
  to: ExploreCoordinate,
): Array<Pick<ExploredCell, 'id' | 'center'>> {
  if (!from || !isExploreTraceContinuous(from, to)) {
    return [exploreCellForCoordinate(to)];
  }
  return exploreCellsAlongSegment(from, to);
}

export function destinationCoordinate(
  center: ExploreCoordinate,
  distanceM: number,
  bearingDegrees: number,
): ExploreCoordinate {
  const angularDistance = distanceM / EARTH_RADIUS_M;
  const bearing = degreesToRadians(bearingDegrees);
  const latitude = degreesToRadians(center.latitude);
  const longitude = degreesToRadians(center.longitude);
  const destinationLatitude = Math.asin(
    Math.sin(latitude) * Math.cos(angularDistance) +
      Math.cos(latitude) * Math.sin(angularDistance) * Math.cos(bearing),
  );
  const destinationLongitude =
    longitude +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitude),
      Math.cos(angularDistance) - Math.sin(latitude) * Math.sin(destinationLatitude),
    );
  return {
    latitude: radiansToDegrees(destinationLatitude),
    longitude: radiansToDegrees(destinationLongitude),
  };
}

export function buildFogHole(
  center: ExploreCoordinate,
  radiusM: number = EXPLORE_REVEAL_RADIUS_M,
  segmentCount: number = 20,
): ExploreCoordinate[] {
  const safeSegments = Math.max(8, Math.floor(segmentCount));
  const ring = Array.from({ length: safeSegments }, (_, index) =>
    destinationCoordinate(center, radiusM, 360 - (index * 360) / safeSegments),
  );
  return [...ring, ring[0]];
}

export function isCoordinateExplored(
  coordinate: ExploreCoordinate,
  exploredCells: Array<Pick<ExploredCell, 'center'>>,
  revealRadiusM: number = EXPLORE_REVEAL_RADIUS_M,
): boolean {
  return exploredCells.some((cell) => coordinateDistanceM(coordinate, cell.center) <= revealRadiusM);
}

export type ExploreFogRenderGeometry<T extends ExploreCoordinate = ExploreCoordinate> = {
  points: T[];
  segmentStarts: T[];
  segmentEnds: T[];
  traces: T[][];
};

function pointToSegmentDistanceM(
  point: ExploreCoordinate,
  start: ExploreCoordinate,
  end: ExploreCoordinate,
): number {
  const latitudeScale = METERS_PER_LATITUDE_DEGREE;
  const longitudeScale = latitudeScale * Math.max(0.1, Math.cos(degreesToRadians(start.latitude)));
  const endX = (end.longitude - start.longitude) * longitudeScale;
  const endY = (end.latitude - start.latitude) * latitudeScale;
  const pointX = (point.longitude - start.longitude) * longitudeScale;
  const pointY = (point.latitude - start.latitude) * latitudeScale;
  const denominator = endX * endX + endY * endY;
  if (denominator <= 0) return coordinateDistanceM(point, start);
  const projection = Math.max(0, Math.min(1, (pointX * endX + pointY * endY) / denominator));
  return Math.hypot(pointX - endX * projection, pointY - endY * projection);
}

function simplifyTrace<T extends ExploreCoordinate>(
  points: readonly T[],
  toleranceM: number,
): T[] {
  if (points.length <= 2) return [...points];
  let furthestIndex = -1;
  let furthestDistanceM = 0;
  const start = points[0];
  const end = points[points.length - 1];
  for (let index = 1; index < points.length - 1; index += 1) {
    const distanceM = pointToSegmentDistanceM(points[index], start, end);
    if (distanceM > furthestDistanceM) {
      furthestDistanceM = distanceM;
      furthestIndex = index;
    }
  }
  if (furthestIndex < 0 || furthestDistanceM <= toleranceM) return [start, end];
  const before = simplifyTrace(points.slice(0, furthestIndex + 1), toleranceM);
  const after = simplifyTrace(points.slice(furthestIndex), toleranceM);
  return [...before.slice(0, -1), ...after];
}

function continuousTraceGroups<T extends ExploreCoordinate>(
  pointGroups: readonly (readonly T[])[],
): T[][] {
  const traces: T[][] = [];
  pointGroups.forEach((group) => {
    let current: T[] = [];
    group.forEach((point) => {
      const previous = current.at(-1);
      if (previous && !isExploreTraceContinuous(previous, point)) {
        if (current.length) traces.push(current);
        current = [];
      }
      current.push(point);
    });
    if (current.length) traces.push(current);
  });
  return traces;
}

/**
 * Produces explicit, rounded corridor segments for the native fog renderer.
 * Simplification may remove redundant observations, but never joins sessions or
 * crosses an untrusted recorded gap.
 */
export function buildFogRenderGeometry<T extends ExploreCoordinate>(
  pointGroups: readonly (readonly T[])[],
  maxSegments = 256,
): ExploreFogRenderGeometry<T> {
  const traces = continuousTraceGroups(pointGroups);
  let toleranceM = FOG_TRACE_SIMPLIFICATION_TOLERANCE_M;
  let simplified = traces.map((trace) => simplifyTrace(trace, toleranceM));
  const segmentCount = () => simplified.reduce((total, trace) => total + Math.max(0, trace.length - 1), 0);
  while (segmentCount() > maxSegments && toleranceM < 192) {
    toleranceM *= 2;
    simplified = traces.map((trace) => simplifyTrace(trace, toleranceM));
  }

  const points: T[] = [];
  const segmentStarts: T[] = [];
  const segmentEnds: T[] = [];
  const renderTraces: T[][] = [];
  simplified.forEach((trace) => {
    const remainingPrimitiveCount = Math.max(0, maxSegments - points.length - segmentStarts.length);
    if (remainingPrimitiveCount === 0) return;
    if (trace.length === 1) {
      points.push(trace[0]);
      return;
    }
    const renderTrace = trace.slice(0, remainingPrimitiveCount + 1);
    if (renderTrace.length < 2) return;
    renderTraces.push(renderTrace);
    renderTrace.slice(1).forEach((end, index) => {
      segmentStarts.push(trace[index]);
      segmentEnds.push(end);
    });
  });
  return { points, segmentStarts, segmentEnds, traces: renderTraces };
}
