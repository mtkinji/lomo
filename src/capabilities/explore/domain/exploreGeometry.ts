import type { ExploreCoordinate, ExploredCell } from './types';

export const EXPLORE_REVEAL_RADIUS_M = 30.48;
export const EXPLORE_CELL_SIZE_M = 24;

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
