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

export function buildAltitudeSegments<T extends AltitudePoint>(points: readonly T[]) {
  return points.slice(1).flatMap((point, index) => {
    const previous = points[index];
    if (!isExploreTraceContinuous(previous, point)) return [];
    const knownAltitudes = [previous.altitudeM, point.altitudeM].filter(
      (altitude): altitude is number => typeof altitude === 'number',
    );
    const segmentAltitude = knownAltitudes.length
      ? knownAltitudes.reduce((sum, altitude) => sum + altitude, 0) / knownAltitudes.length
      : null;
    return [{
      coordinates: [previous, point] as [T, T],
      color: altitudeColor(segmentAltitude),
    }];
  });
}
