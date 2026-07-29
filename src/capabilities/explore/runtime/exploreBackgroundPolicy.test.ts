import { applyBackgroundSamples } from './exploreBackgroundPolicy';
import { beginExploreSession, createEmptyExploreData } from '../domain/exploreState';
import { destinationCoordinate } from '../domain/exploreGeometry';

const sample = (minute: number, latitude = 40.5) => ({
  latitude,
  longitude: -105.1,
  altitudeM: 1500,
  horizontalAccuracyM: 6,
  altitudeAccuracyM: 5,
  speedMps: 11.176,
  courseDeg: 90,
  recordedAt: new Date(Date.parse('2026-07-27T18:00:00.000Z') + minute * 60_000).toISOString(),
});

describe('Explore background policy', () => {
  it('keeps recording credible movement without ending the outing', () => {
    const state = beginExploreSession(createEmptyExploreData(), 'session-1', sample(0).recordedAt);
    const result = applyBackgroundSamples(state, [sample(0), sample(5, 40.505), sample(10, 40.51)]);
    expect(result.completedSessionId).toBeNull();
    expect(result.data.activeSession?.points).toHaveLength(3);
    expect(result.data.activeSession?.points[0]).toEqual(expect.objectContaining({
      speedMps: 11.176,
      courseDeg: 90,
    }));
  });

  it('deep-sleeps an Adventure after fifteen stationary minutes without ending its intent', () => {
    const state = beginExploreSession(createEmptyExploreData(), 'session-1', sample(0).recordedAt, 'adventure');
    const result = applyBackgroundSamples(state, [0, 5, 10, 15].map((minute) => ({
      ...sample(minute),
      speedMps: 0,
    })));
    expect(result.completedSessionId).toBeNull();
    expect(result.trackingAction).toBe('deep-sleep');
    expect(result.data.activeSession?.id).toBe('session-1');
    expect(result.data.tracking.phase).toBe('deep-sleep');
    expect(result.data.activeSession?.points).toHaveLength(0);
  });

  it('soft-sleeps Ambient after two minutes and deep-sleeps after five', () => {
    const state = beginExploreSession(createEmptyExploreData(), 'session-1', sample(0).recordedAt, 'ambient');
    const soft = applyBackgroundSamples(state, [0, 2].map((minute) => ({ ...sample(minute), speedMps: 0 })));
    expect(soft.trackingAction).toBe('soft-sleep');
    const deep = applyBackgroundSamples(soft.data, [{ ...sample(5), speedMps: 0 }]);
    expect(deep.trackingAction).toBe('deep-sleep');
  });

  it('does not infer stillness from inaccurate samples', () => {
    const state = beginExploreSession(createEmptyExploreData(), 'session-1', sample(0).recordedAt);
    const inaccurate = [0, 5, 10, 15].map((minute) => ({ ...sample(minute), horizontalAccuracyM: 90 }));
    expect(applyBackgroundSamples(state, inaccurate).completedSessionId).toBeNull();
    expect(applyBackgroundSamples(state, inaccurate).data.tracking.phase).toBe('active');
  });

  it('does not clear fog from airplane-like movement', () => {
    const state = beginExploreSession(createEmptyExploreData(), 'session-1', sample(0).recordedAt, 'ambient');
    const result = applyBackgroundSamples(state, [{ ...sample(0), speedMps: 80 }]);
    expect(result.data.activeSession?.points).toHaveLength(0);
    expect(result.data.tracking.movement).toBe('airplane');
  });

  it('thins straight 25-mph observations but retains successive course changes through a turn', () => {
    const startedAt = Date.parse('2026-07-27T18:00:00.000Z');
    const origin = { latitude: 40.5, longitude: -105.1 };
    const straightSix = destinationCoordinate(origin, 6, 0);
    const turnEntry = destinationCoordinate(origin, 9, 0);
    let cursor = turnEntry;
    const turnSamples = [15, 30, 45, 60, 75, 90].map((courseDeg, index) => {
      cursor = destinationCoordinate(cursor, 5, courseDeg);
      return {
        ...sample(0),
        ...cursor,
        courseDeg,
        recordedAt: new Date(startedAt + (index + 3) * 1_000).toISOString(),
      };
    });
    const state = beginExploreSession(createEmptyExploreData(), 'session-1', new Date(startedAt).toISOString());
    const result = applyBackgroundSamples(state, [
      { ...sample(0), ...origin, courseDeg: 0, recordedAt: new Date(startedAt).toISOString() },
      { ...sample(0), ...straightSix, courseDeg: 0, recordedAt: new Date(startedAt + 1_000).toISOString() },
      { ...sample(0), ...turnEntry, courseDeg: 0, recordedAt: new Date(startedAt + 2_000).toISOString() },
      ...turnSamples,
    ]);

    expect(result.data.activeSession?.points.map((point) => point.courseDeg)).toEqual([
      0, 0, 15, 30, 45, 60, 75, 90,
    ]);
  });
});
