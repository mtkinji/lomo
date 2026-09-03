import { destinationCoordinate } from './exploreGeometry';
import {
  acceptExplorePoint,
  adaptiveExploreSampleDistanceM,
  circularCourseDifferenceDeg,
  explorePointFromSample,
  sanitizeLocationSample,
} from './explorePointPolicy';

const base = {
  latitude: 40.58526,
  longitude: -105.08442,
  altitudeM: 1525,
  horizontalAccuracyM: 8,
  altitudeAccuracyM: 6,
  recordedAt: '2026-07-27T18:00:00.000Z',
  speedMps: 11.176,
  courseDeg: 0,
};

function movedSample(distanceM: number, courseDeg: number, speedMps = 11.176) {
  return {
    ...base,
    ...destinationCoordinate(base, distanceM, courseDeg),
    speedMps,
    courseDeg,
    recordedAt: '2026-07-27T18:00:01.000Z',
  };
}

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
      acceptExplorePoint(base, movedSample(9, 0)),
    ).toEqual({ accepted: true, reason: 'adaptive-distance' });
  });

  it('scales straight-line retention with speed over a bounded time horizon', () => {
    expect(adaptiveExploreSampleDistanceM(25 * 0.44704)).toBeCloseTo(8.94, 1);
    expect(adaptiveExploreSampleDistanceM(1.4)).toBe(6);
    expect(adaptiveExploreSampleDistanceM(65 * 0.44704)).toBe(22);
  });

  it('measures course changes correctly across north', () => {
    expect(circularCourseDifferenceDeg(355, 5)).toBe(10);
    expect(circularCourseDifferenceDeg(5, 355)).toBe(10);
    expect(circularCourseDifferenceDeg(90, 270)).toBe(180);
  });

  it('retains a trustworthy turn before the straight-line distance threshold', () => {
    expect(acceptExplorePoint(base, movedSample(5, 12))).toEqual({
      accepted: true,
      reason: 'course-change',
    });
  });

  it('does not turn low-speed course jitter into recorded territory', () => {
    expect(acceptExplorePoint(
      { ...base, speedMps: 1.2 },
      movedSample(4, 90, 1.2),
    )).toEqual({ accepted: false, reason: 'sampling-window' });
  });

  it('thins straight residential observations until the adaptive spacing is reached', () => {
    expect(acceptExplorePoint(base, movedSample(6, 0))).toEqual({
      accepted: false,
      reason: 'sampling-window',
    });
    expect(acceptExplorePoint(base, movedSample(9, 0))).toEqual({
      accepted: true,
      reason: 'adaptive-distance',
    });
  });

  it('keeps ambient observations sparse even when the location provider batches dense samples', () => {
    expect(acceptExplorePoint(base, movedSample(59, 20), 'ambient')).toEqual({
      accepted: false,
      reason: 'sampling-window',
    });
    expect(acceptExplorePoint(base, movedSample(60, 20), 'ambient')).toEqual({
      accepted: true,
      reason: 'adaptive-distance',
    });
  });

  it('drops untrustworthy altitude without dropping the coordinate', () => {
    expect(sanitizeLocationSample({ ...base, altitudeAccuracyM: 80 }).altitudeM).toBeNull();
  });

  it('preserves normalized speed and GPS course in the canonical point', () => {
    expect(explorePointFromSample('point-1', { ...base, courseDeg: 372 })).toEqual(expect.objectContaining({
      id: 'point-1',
      speedMps: 11.176,
      courseDeg: 12,
    }));
  });
});
