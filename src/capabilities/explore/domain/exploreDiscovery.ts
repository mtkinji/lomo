import type { PlaceKind } from '../../../domain/places';
import type { ExplorePoint, Place } from './types';
import { coordinateDistanceM } from './exploreGeometry';

export type ExplorePlacemark = {
  name?: string | null;
  street?: string | null;
  city?: string | null;
  district?: string | null;
  subregion?: string | null;
  region?: string | null;
};

const PLACE_KIND_PATTERNS: Array<{ kind: PlaceKind; pattern: RegExp }> = [
  { kind: 'trail', pattern: /\b(trail|trailhead|greenway|path)\b/i },
  { kind: 'overlook', pattern: /\b(overlook|viewpoint|vista)\b/i },
  { kind: 'summit', pattern: /\b(summit|peak|mount|mountain)\b/i },
  { kind: 'park', pattern: /\b(park|preserve|reserve|garden|open space)\b/i },
  { kind: 'landmark', pattern: /\b(falls|waterfall|monument|museum|landmark|bridge|lake|reservoir|beach|canyon)\b/i },
];

function normalizedSlug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72);
}

function looksLikeStreetAddress(value: string): boolean {
  return /^\s*\d+[a-z]?\s+\S+/i.test(value) || /\b(street|st|road|rd|avenue|ave|drive|dr|lane|ln|court|ct|boulevard|blvd)\b/i.test(value);
}

export function candidatePlaceFromPlacemark(
  placemark: ExplorePlacemark,
  point: ExplorePoint,
): Place | null {
  const name = placemark.name?.trim();
  if (!name || looksLikeStreetAddress(name)) return null;
  const isLocality = [placemark.city, placemark.district, placemark.subregion, placemark.region]
    .some((value) => value?.trim().toLocaleLowerCase() === name.toLocaleLowerCase());
  if (isLocality) return null;
  const match = PLACE_KIND_PATTERNS.find(({ pattern }) => pattern.test(name));
  if (!match) return null;
  const slug = normalizedSlug(name);
  if (!slug) return null;
  return {
    id: `apple:${slug}:${point.latitude.toFixed(4)}:${point.longitude.toFixed(4)}`,
    name,
    kind: match.kind,
    latitude: point.latitude,
    longitude: point.longitude,
    source: 'apple-maps',
  };
}

export function sampleRouteForDiscovery(points: ExplorePoint[], limit = 12): ExplorePoint[] {
  const safeLimit = Math.max(1, Math.floor(limit));
  if (points.length <= safeLimit) return points;
  return Array.from({ length: safeLimit }, (_, index) => {
    const sourceIndex = Math.round((index * (points.length - 1)) / (safeLimit - 1));
    return points[sourceIndex];
  });
}

export function canonicalPlaceForCandidate(existingPlaces: Place[], candidate: Place): Place {
  const normalizedName = candidate.name.trim().toLocaleLowerCase();
  return existingPlaces.find((place) =>
    place.name.trim().toLocaleLowerCase() === normalizedName &&
    place.kind === candidate.kind &&
    coordinateDistanceM(place, candidate) <= 500,
  ) ?? candidate;
}
