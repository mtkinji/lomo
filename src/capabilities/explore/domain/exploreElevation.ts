import type { ExploreCoordinate } from './types';
import { isExploreTraceContinuous } from './exploreGeometry';

type AltitudePoint = ExploreCoordinate & { altitudeM: number | null };

const ALTITUDE_STOPS = [
  { meters: 0, color: '#2F6F89' },
  { meters: 1500, color: '#5F7E54' },
  { meters: 3000, color: '#D28A3D' },
  { meters: 4500, color: '#A95662' },
] as const;

function parseHex(hex: string): [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

function toHex(value: number): string {
  return Math.round(value).toString(16).padStart(2, '0').toUpperCase();
}

export function altitudeColor(altitudeM: number | null): string {
  if (altitudeM === null || !Number.isFinite(altitudeM)) return '#6F756E';
  if (altitudeM <= ALTITUDE_STOPS[0].meters) return ALTITUDE_STOPS[0].color;
  const finalStop = ALTITUDE_STOPS[ALTITUDE_STOPS.length - 1];
  if (altitudeM >= finalStop.meters) return finalStop.color;

  const upperIndex = ALTITUDE_STOPS.findIndex((stop) => altitudeM <= stop.meters);
  const lower = ALTITUDE_STOPS[upperIndex - 1];
  const upper = ALTITUDE_STOPS[upperIndex];
  if (altitudeM === upper.meters) return upper.color;
  const progress = (altitudeM - lower.meters) / (upper.meters - lower.meters);
  const lowerRgb = parseHex(lower.color);
  const upperRgb = parseHex(upper.color);
  return `#${lowerRgb
    .map((channel, index) => toHex(channel + (upperRgb[index] - channel) * progress))
    .join('')}`;
}

function interpolatedAltitudes<T extends AltitudePoint>(points: readonly T[]): Array<number | null> {
  const knownIndexes = points.flatMap((point, index) =>
    typeof point.altitudeM === 'number' && Number.isFinite(point.altitudeM) ? [index] : [],
  );
  if (!knownIndexes.length) return points.map(() => null);

  return points.map((point, index) => {
    if (typeof point.altitudeM === 'number' && Number.isFinite(point.altitudeM)) return point.altitudeM;
    const lowerIndex = [...knownIndexes].reverse().find((candidate) => candidate < index);
    const upperIndex = knownIndexes.find((candidate) => candidate > index);
    if (lowerIndex === undefined) return points[upperIndex!].altitudeM;
    if (upperIndex === undefined) return points[lowerIndex].altitudeM;
    const lowerAltitude = points[lowerIndex].altitudeM!;
    const upperAltitude = points[upperIndex].altitudeM!;
    const progress = (index - lowerIndex) / (upperIndex - lowerIndex);
    return lowerAltitude + (upperAltitude - lowerAltitude) * progress;
  });
}

export function buildAltitudeGradients<T extends AltitudePoint>(points: readonly T[]) {
  const traces: T[][] = [];
  let current: T[] = [];
  points.forEach((point) => {
    const previous = current.at(-1);
    if (previous && !isExploreTraceContinuous(previous, point)) {
      if (current.length > 1) traces.push(current);
      current = [];
    }
    current.push(point);
  });
  if (current.length > 1) traces.push(current);

  return traces.map((coordinates) => ({
    coordinates,
    strokeColors: interpolatedAltitudes(coordinates).map(altitudeColor),
  }));
}
