import { buildRecordedPathTraces, destinationCoordinate } from './exploreGeometry';
import type { ExplorePoint } from './types';

const origin = { latitude: 40.5, longitude: -111.9 };
function point(x: number, y: number, second: number, speedMps = 10): ExplorePoint {
  const coordinate = destinationCoordinate(destinationCoordinate(origin, x, 90), y, 0);
  return { ...coordinate, id: `p-${second}`, recordedAt: new Date(1_750_000_000_000 + second * 1000).toISOString(),
    speedMps, courseDeg: null, horizontalAccuracyM: 4, altitudeM: 1400, altitudeAccuracyM: 5 };
}

describe('recorded route fidelity', () => {
  it('preserves every block corner in a history longer than the fog budget', () => {
    const points = Array.from({ length: 1200 }, (_, i) => {
      const block = Math.floor(i / 40);
      const step = i % 40;
      return point(block * 200 + Math.min(step, 20) * 10, block * 200 + Math.max(0, step - 20) * 10, i);
    });
    const traces = buildRecordedPathTraces([points]);
    const displayed = traces.flat();
    for (let i = 20; i < points.length; i += 40) expect(displayed).toContainEqual(points[i]);
    expect(displayed).toContainEqual(points.at(-1));
    expect(traces).toHaveLength(1);
  });

  it('keeps a genuine walking passage with tight turns instead of snapping to a road', () => {
    const points = [point(0, 0, 0, 1.5), point(3, 0, 2, 1.5), point(3, 3, 4, 1.5), point(6, 3, 6, 1.5)];
    expect(buildRecordedPathTraces([points])).toEqual([points]);
  });

  it('breaks even a short spatial gap after a tracking outage', () => {
    const points = [point(0, 0, 0), point(10, 0, 1), point(20, 0, 120), point(30, 0, 121)];
    expect(buildRecordedPathTraces([points])).toEqual([points.slice(0, 2), points.slice(2)]);
  });

  it('does not invent a road through a block after a quarter-mile acquisition miss', () => {
    const points = [point(0, 0, 0, 14), point(390, 0, 30, 14)];
    expect(buildRecordedPathTraces([points])).toEqual(points.map(p => [p]));
  });

  it('retains dense motorway samples while rejecting a short impossible jump', () => {
    expect(buildRecordedPathTraces([[point(0, 0, 0, 30), point(60, 0, 2, 30)]])).toHaveLength(1);
    expect(buildRecordedPathTraces([[point(0, 0, 0, 1.5), point(50, 0, 1, 1.5)]])).toHaveLength(2);
  });

  it('never reconnects traces when leaving and reentering the viewport', () => {
    const points = [point(0, 0, 0), point(10, 0, 1), point(20, 0, 2), point(20, 10, 3), point(10, 10, 4), point(0, 10, 5)];
    const region = { ...origin, latitudeDelta: 0.0004, longitudeDelta: 0.0001 };
    const traces = buildRecordedPathTraces([points], region);
    expect(traces).toHaveLength(2);
    expect(traces[0]).toEqual(points.slice(0, 2));
    expect(traces[1]).toEqual(points.slice(-2));
  });
});
