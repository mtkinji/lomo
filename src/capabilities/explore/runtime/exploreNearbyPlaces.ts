import KwiltPlaceSearch, { type KwiltNearbyPlace } from '../../../../modules/kwilt-place-search';
import type { ExploreNearbyCandidate } from '../domain/exploreNearby';

function isCandidate(value: KwiltNearbyPlace): value is ExploreNearbyCandidate {
  return Boolean(
    value &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (typeof value.category === 'string' || value.category === null) &&
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude),
  );
}

export async function searchNearbyPlaces(
  center: { latitude: number; longitude: number },
  radiusMeters: number,
): Promise<ExploreNearbyCandidate[] | null> {
  if (!KwiltPlaceSearch?.isAvailable()) return null;
  const results = await KwiltPlaceSearch.searchNearby(center.latitude, center.longitude, radiusMeters);
  return results.filter(isCandidate);
}
