import {
  metersForNearbyRadius,
  rankNearbyPlaces,
  type ExploreNearbyCandidate,
} from './exploreNearby';
import type { Place } from './types';

const origin = { latitude: 35.6762, longitude: 139.6503 };

function candidate(
  id: string,
  name: string,
  latitudeOffset: number,
  category = 'MKPOICategoryMuseum',
): ExploreNearbyCandidate {
  return {
    id,
    name,
    category,
    latitude: origin.latitude + latitudeOffset,
    longitude: origin.longitude,
  };
}

describe('Explore nearby recommendation policy', () => {
  it('converts the three human radius choices to exact meters', () => {
    expect(metersForNearbyRadius('quarter-mile')).toBeCloseTo(402.336, 3);
    expect(metersForNearbyRadius('half-mile')).toBeCloseTo(804.672, 3);
    expect(metersForNearbyRadius('one-mile')).toBeCloseTo(1609.344, 3);
  });

  it('drops invalid and out-of-radius candidates, dedupes stable identities, and caps the result', () => {
    const candidates = [
      candidate('near-duplicate', 'Nezu Shrine', 0.001),
      candidate('far-duplicate', '  NEZU SHRINE ', 0.0014),
      candidate('park', 'Shinjuku Gyoen', 0.002, 'MKPOICategoryPark'),
      candidate('museum', 'Tokyo Toy Museum', 0.0025),
      candidate('library', 'Local Library', 0.003, 'MKPOICategoryLibrary'),
      candidate('theater', 'Kabuki-za', 0.0035, 'MKPOICategoryTheater'),
      candidate('camp', 'City Campground', 0.004, 'MKPOICategoryCampground'),
      candidate('too-far', 'Outside Radius', 0.03),
      { ...candidate('invalid', 'Invalid', 0.001), latitude: Number.NaN },
    ];

    const ranked = rankNearbyPlaces({ candidates, origin, radiusM: 805, knownPlaces: [] });

    expect(ranked).toHaveLength(5);
    expect(ranked.filter((place) => place.name.toLocaleLowerCase().includes('nezu shrine'))).toHaveLength(1);
    expect(ranked.map((place) => place.id)).not.toContain('too-far');
    expect(ranked.map((place) => place.id)).not.toContain('invalid');
    expect(ranked[0].id).toBe('near-duplicate');
  });

  it('excludes already known Places and gently favors locally familiar kinds without hiding distance', () => {
    const knownPlaces: Place[] = [{
      id: 'known-nezu',
      name: 'Nezu Shrine',
      kind: 'place',
      latitude: origin.latitude + 0.001,
      longitude: origin.longitude,
      source: 'apple-maps',
    }, {
      id: 'known-park',
      name: 'Home Park',
      kind: 'park',
      latitude: 40,
      longitude: -105,
      source: 'user',
    }];

    const ranked = rankNearbyPlaces({
      candidates: [
        candidate('visited', 'Nezu Shrine', 0.001, 'MKPOICategoryLandmark'),
        candidate('museum', 'Small Museum', 0.0015),
        candidate('park', 'Pocket Garden', 0.0018, 'MKPOICategoryPark'),
      ],
      origin,
      radiusM: 805,
      knownPlaces,
    });

    expect(ranked.map((place) => place.id)).toEqual(['park', 'museum']);
    expect(ranked[0]).toMatchObject({ kind: 'park', reason: 'A park near you' });
    expect(ranked[0].distanceM).toBeGreaterThan(0);
  });
});
