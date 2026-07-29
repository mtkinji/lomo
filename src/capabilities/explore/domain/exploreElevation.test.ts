import { altitudeColor, buildAltitudeSegments } from './exploreElevation';

describe('Explore elevation presentation', () => {
  it('moves from water through pine to warm alpine colors', () => {
    expect(altitudeColor(0)).toBe('#2F6F89');
    expect(altitudeColor(1500)).toBe('#5F7E54');
    expect(altitudeColor(3000)).toBe('#D28A3D');
    expect(altitudeColor(4500)).toBe('#A95662');
  });

  it('creates one colored segment between every pair of route points', () => {
    const points = [
      { latitude: 40, longitude: -105, altitudeM: 1500 },
      { latitude: 40.0002, longitude: -105, altitudeM: 1600 },
      { latitude: 40.0004, longitude: -105, altitudeM: null },
    ];

    expect(buildAltitudeSegments(points)).toEqual([
      { coordinates: [points[0], points[1]], color: altitudeColor(1550) },
      { coordinates: [points[1], points[2]], color: altitudeColor(1600) },
    ]);
  });

  it('leaves a visible path discontinuity instead of drawing a shortcut across a long gap', () => {
    const points = [
      { latitude: 40, longitude: -105, altitudeM: 1500 },
      { latitude: 40.001, longitude: -105, altitudeM: 1600 },
    ];

    expect(buildAltitudeSegments(points)).toEqual([]);
  });
});
