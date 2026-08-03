import { altitudeColor, buildAltitudeGradients } from './exploreElevation';

describe('Explore elevation presentation', () => {
  it('moves from water through pine to warm alpine colors', () => {
    expect(altitudeColor(0)).toBe('#2F6F89');
    expect(altitudeColor(1500)).toBe('#5F7E54');
    expect(altitudeColor(3000)).toBe('#D28A3D');
    expect(altitudeColor(4500)).toBe('#A95662');
  });

  it('creates one continuous gradient whose colors follow every route point', () => {
    const points = [
      { latitude: 40, longitude: -105, altitudeM: 1500 },
      { latitude: 40.0002, longitude: -105, altitudeM: 2250 },
      { latitude: 40.0004, longitude: -105, altitudeM: 3000 },
    ];

    expect(buildAltitudeGradients(points)).toEqual([
      {
        coordinates: points,
        strokeColors: [altitudeColor(1500), altitudeColor(2250), altitudeColor(3000)],
      },
    ]);
  });

  it('interpolates missing altitude inside a known climb instead of flashing neutral gray', () => {
    const points = [
      { latitude: 40, longitude: -105, altitudeM: 1500 },
      { latitude: 40.0002, longitude: -105, altitudeM: null },
      { latitude: 40.0004, longitude: -105, altitudeM: 3000 },
    ];

    expect(buildAltitudeGradients(points)[0].strokeColors).toEqual([
      altitudeColor(1500),
      altitudeColor(2250),
      altitudeColor(3000),
    ]);
  });

  it('leaves a visible path discontinuity instead of drawing a shortcut across a long gap', () => {
    const points = [
      { latitude: 40, longitude: -105, altitudeM: 1500 },
      { latitude: 40.001, longitude: -105, altitudeM: 1600 },
    ];

    expect(buildAltitudeGradients(points)).toEqual([]);
  });
});
