import type { PlaceKind } from '../../../domain/places';
import { coordinateDistanceM } from './exploreGeometry';
import type { Place } from './types';

export type ExploreNearbyRadius = 'quarter-mile' | 'half-mile' | 'one-mile';

export type ExploreNearbyCandidate = {
  id: string;
  name: string;
  category: string | null;
  latitude: number;
  longitude: number;
};

export type ExploreNearbyRecommendation = ExploreNearbyCandidate & {
  kind: PlaceKind;
  distanceM: number;
  reason: string;
};

const RADIUS_METERS: Record<ExploreNearbyRadius, number> = {
  'quarter-mile': 402.336,
  'half-mile': 804.672,
  'one-mile': 1609.344,
};

export function metersForNearbyRadius(radius: ExploreNearbyRadius): number {
  return RADIUS_METERS[radius];
}

function normalizedName(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ');
}

export function nearbyKindForCategory(category: string | null): PlaceKind {
  const normalized = category?.toLocaleLowerCase() ?? '';
  if (normalized.includes('campground') || normalized.includes('hiking')) return 'trail';
  if (normalized.includes('park') || normalized.includes('garden')) return 'park';
  if (normalized.includes('scenic') || normalized.includes('view')) return 'overlook';
  if (normalized.includes('mountain') || normalized.includes('summit')) return 'summit';
  if (
    normalized.includes('museum') ||
    normalized.includes('theater') ||
    normalized.includes('library') ||
    normalized.includes('landmark') ||
    normalized.includes('monument') ||
    normalized.includes('castle') ||
    normalized.includes('fortress')
  ) return 'landmark';
  return 'place';
}

function reasonForKind(kind: PlaceKind): string {
  switch (kind) {
    case 'park': return 'A park near you';
    case 'trail': return 'An outdoor place near you';
    case 'overlook': return 'A viewpoint near you';
    case 'summit': return 'A high point near you';
    case 'landmark': return 'A landmark near you';
    default: return 'A place near you';
  }
}

function matchesKnownPlace(candidate: ExploreNearbyCandidate, knownPlaces: Place[]): boolean {
  const name = normalizedName(candidate.name);
  return knownPlaces.some((place) =>
    normalizedName(place.name) === name && coordinateDistanceM(place, candidate) <= 200,
  );
}

export function rankNearbyPlaces(params: {
  candidates: ExploreNearbyCandidate[];
  origin: { latitude: number; longitude: number };
  radiusM: number;
  knownPlaces: Place[];
  limit?: number;
}): ExploreNearbyRecommendation[] {
  const knownKinds = new Set(params.knownPlaces.map((place) => place.kind));
  const unique = new Map<string, ExploreNearbyRecommendation>();

  params.candidates.forEach((candidate) => {
    if (
      !candidate.id.trim() ||
      !candidate.name.trim() ||
      !Number.isFinite(candidate.latitude) ||
      !Number.isFinite(candidate.longitude)
    ) return;
    const distanceM = coordinateDistanceM(params.origin, candidate);
    if (!Number.isFinite(distanceM) || distanceM > params.radiusM) return;
    if (matchesKnownPlace(candidate, params.knownPlaces)) return;
    const key = normalizedName(candidate.name);
    if (!key) return;
    const kind = nearbyKindForCategory(candidate.category);
    const recommendation = { ...candidate, kind, distanceM, reason: reasonForKind(kind) };
    const current = unique.get(key);
    if (!current || recommendation.distanceM < current.distanceM) unique.set(key, recommendation);
  });

  return [...unique.values()]
    .sort((left, right) => {
      const leftScore = left.distanceM - (knownKinds.has(left.kind) ? 120 : 0);
      const rightScore = right.distanceM - (knownKinds.has(right.kind) ? 120 : 0);
      return leftScore - rightScore || left.name.localeCompare(right.name);
    })
    .slice(0, params.limit ?? 5);
}
