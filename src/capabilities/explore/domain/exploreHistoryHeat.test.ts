import { buildHistoryHeatGeometry } from './exploreHistoryHeat';
import type { ExplorePoint } from './types';
const point = (i: number, second = i): ExplorePoint => ({ id: `${i}`, latitude: 40 + i * .00003, longitude: -111,
  recordedAt: new Date(1750000000000 + second * 1000).toISOString(), horizontalAccuracyM: 4,
  altitudeM: 0, altitudeAccuracyM: 4, speedMps: 10, courseDeg: null });
it('preserves outing ownership across genuine gaps without joining them', () => {
  const first = [point(0), point(1), point(2, 100), point(3, 101)];
  const snapshot = JSON.stringify(first);
  const result = buildHistoryHeatGeometry([first, [point(0), point(1)]]);
  expect(result.segmentStarts).toEqual([0, 2, 4]);
  expect(result.segmentSessionIds).toEqual([0, 0, 1]);
  expect(result.coordinates).toHaveLength(6);
  expect(JSON.stringify(first)).toBe(snapshot);
});
it('counts native chunks as the same outing and ignores isolated samples', () => {
  const long = Array.from({length: 1100}, (_, i) => ({ ...point(i), longitude: -111 + (i % 2) * .00004 }));
  const result = buildHistoryHeatGeometry([[point(0)], long]);
  expect(result.segmentSessionIds.length).toBeGreaterThan(1);
  expect(new Set(result.segmentSessionIds)).toEqual(new Set([1]));
});
it('has no heat geometry for empty history', () => {
  expect(buildHistoryHeatGeometry([])).toEqual({ coordinates: [], segmentStarts: [], segmentSessionIds: [] });
});
