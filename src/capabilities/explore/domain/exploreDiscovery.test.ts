import { candidatePlaceFromPlacemark, canonicalPlaceForCandidate, sampleRouteForDiscovery } from './exploreDiscovery';
import type { ExplorePoint } from './types';

const point = (index: number): ExplorePoint => ({
  id: `point-${index}`,
  latitude: 40.5 + index * 0.001,
  longitude: -105.1,
  altitudeM: 1500,
  horizontalAccuracyM: 6,
  altitudeAccuracyM: 5,
  speedMps: null,
  courseDeg: null,
  recordedAt: new Date(Date.parse('2026-07-27T18:00:00.000Z') + index * 60_000).toISOString(),
});

describe('Explore discovery policy', () => {
  it('accepts distinctive named places and creates a spatially bounded canonical id', () => {
    expect(candidatePlaceFromPlacemark({
      name: 'Horsetooth Falls Trail',
      street: null,
      city: 'Fort Collins',
    }, point(0))).toEqual(expect.objectContaining({
      id: 'apple:horsetooth-falls-trail:40.5000:-105.1000',
      name: 'Horsetooth Falls Trail',
      kind: 'trail',
      source: 'apple-maps',
    }));
  });

  it('rejects ordinary street addresses and generic locality names', () => {
    expect(candidatePlaceFromPlacemark({ name: '123 Main Street', street: 'Main Street' }, point(0))).toBeNull();
    expect(candidatePlaceFromPlacemark({ name: 'Fort Collins', city: 'Fort Collins' }, point(0))).toBeNull();
  });

  it('samples a long route without exceeding twelve foreground geocodes', () => {
    const samples = sampleRouteForDiscovery(Array.from({ length: 30 }, (_, index) => point(index)));
    expect(samples).toHaveLength(12);
    expect(samples[0].id).toBe('point-0');
    expect(samples.at(-1)?.id).toBe('point-29');
  });

  it('reuses a nearby canonical Place with the same identity across outings', () => {
    const existing = {
      id: 'apple:horsetooth-falls-trail:40.5000:-105.1000', name: 'Horsetooth Falls Trail', kind: 'trail' as const,
      latitude: 40.5, longitude: -105.1, source: 'apple-maps' as const,
    };
    const candidate = { ...existing, id: 'apple:horsetooth-falls-trail:40.5010:-105.1000', latitude: 40.501 };
    expect(canonicalPlaceForCandidate([existing], candidate)).toBe(existing);
  });
});
