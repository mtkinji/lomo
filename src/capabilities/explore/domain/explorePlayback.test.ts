import {
  buildExploreElevationProfile,
  buildExplorePlaybackFrame,
  explorePlaybackDurationMs,
} from './explorePlayback';
import type { ExplorePoint } from './types';

function point(
  index: number,
  overrides: Partial<ExplorePoint> = {},
): ExplorePoint {
  return {
    id: `point-${index}`,
    latitude: 40 + index * 0.0001,
    longitude: -105,
    altitudeM: 1500 + index * 10,
    horizontalAccuracyM: 6,
    altitudeAccuracyM: 5,
    speedMps: 2,
    courseDeg: 0,
    recordedAt: new Date(Date.parse('2026-08-02T12:00:00.000Z') + index * 10_000).toISOString(),
    ...overrides,
  };
}

describe('Explore Adventure playback projection', () => {
  it('selects the visible point prefix from recorded time rather than array percentage', () => {
    const points = [
      point(0),
      point(1, { recordedAt: '2026-08-02T12:00:10.000Z' }),
      point(2, { recordedAt: '2026-08-02T12:01:40.000Z' }),
    ];

    expect(buildExplorePlaybackFrame(points, 0)).toMatchObject({
      progress: 0,
      visiblePointCount: 1,
      cursor: points[0],
    });
    expect(buildExplorePlaybackFrame(points, 0.5)).toMatchObject({
      progress: 0.5,
      visiblePointCount: 2,
      cursor: points[1],
    });
    expect(buildExplorePlaybackFrame(points, 1)).toMatchObject({
      progress: 1,
      visiblePointCount: 3,
      cursor: points[2],
    });
  });

  it('falls back to ordered index progress when recorded times are invalid', () => {
    const points = [point(0), point(1, { recordedAt: 'invalid' }), point(2)];

    expect(buildExplorePlaybackFrame(points, 0.5).visiblePointCount).toBe(2);
  });

  it('bounds compressed playback duration for both tiny and long outings', () => {
    expect(explorePlaybackDurationMs(2)).toBe(6000);
    expect(explorePlaybackDurationMs(100)).toBe(8000);
    expect(explorePlaybackDurationMs(1000)).toBe(18000);
  });

  it('builds a distance-based elevation profile from trusted retained samples', () => {
    const profile = buildExploreElevationProfile([point(0), point(1), point(2)]);

    expect(profile).not.toBeNull();
    expect(profile?.segments).toHaveLength(1);
    expect(profile?.segments[0].samples.map((sample) => sample.pointIndex)).toEqual([0, 1, 2]);
    expect(profile?.segments[0].samples[1].distanceM).toBeGreaterThan(10);
    expect(profile?.minAltitudeM).toBe(1500);
    expect(profile?.maxAltitudeM).toBe(1520);
  });

  it('breaks the measured profile across missing altitude instead of inventing a sample', () => {
    const profile = buildExploreElevationProfile([
      point(0),
      point(1, { altitudeM: null, altitudeAccuracyM: 80 }),
      point(2),
      point(3),
    ]);

    expect(profile?.segments.map((segment) => segment.samples.map((sample) => sample.pointIndex)))
      .toEqual([[0], [2, 3]]);
  });

  it('returns no elevation profile when fewer than two trusted samples exist', () => {
    expect(buildExploreElevationProfile([
      point(0, { altitudeM: null }),
      point(1, { altitudeM: 1510 }),
    ])).toBeNull();
  });
});
