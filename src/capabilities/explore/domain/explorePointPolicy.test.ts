import { acceptExplorePoint, sanitizeLocationSample } from './explorePointPolicy';

const base = {
  latitude: 40.58526,
  longitude: -105.08442,
  altitudeM: 1525,
  horizontalAccuracyM: 8,
  altitudeAccuracyM: 6,
  recordedAt: '2026-07-27T18:00:00.000Z',
};

describe('Explore point policy', () => {
  it('accepts a trustworthy first sample', () => {
    expect(acceptExplorePoint(null, base)).toEqual({ accepted: true, reason: 'first-point' });
  });

  it('rejects samples whose horizontal accuracy is wider than the reveal mechanic', () => {
    expect(acceptExplorePoint(null, { ...base, horizontalAccuracyM: 75 })).toEqual({
      accepted: false,
      reason: 'weak-accuracy',
    });
  });

  it('rejects tiny movements so stationary GPS noise does not paint territory', () => {
    expect(
      acceptExplorePoint(base, {
        ...base,
        latitude: base.latitude + 0.000005,
        recordedAt: '2026-07-27T18:00:05.000Z',
      }),
    ).toEqual({ accepted: false, reason: 'too-close' });
  });

  it('accepts meaningful movement in timestamp order', () => {
    expect(
      acceptExplorePoint(base, {
        ...base,
        latitude: base.latitude + 0.00005,
        recordedAt: '2026-07-27T18:00:05.000Z',
      }),
    ).toEqual({ accepted: true, reason: 'moved' });
  });

  it('drops untrustworthy altitude without dropping the coordinate', () => {
    expect(sanitizeLocationSample({ ...base, altitudeAccuracyM: 80 }).altitudeM).toBeNull();
  });
});
