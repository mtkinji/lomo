import { applyBackgroundSamples } from './exploreBackgroundPolicy';
import { beginExploreSession, createEmptyExploreData } from '../domain/exploreState';

const sample = (minute: number, latitude = 40.5) => ({
  latitude,
  longitude: -105.1,
  altitudeM: 1500,
  horizontalAccuracyM: 6,
  altitudeAccuracyM: 5,
  recordedAt: new Date(Date.parse('2026-07-27T18:00:00.000Z') + minute * 60_000).toISOString(),
});

describe('Explore background policy', () => {
  it('keeps recording credible movement without ending the outing', () => {
    const state = beginExploreSession(createEmptyExploreData(), 'session-1', sample(0).recordedAt);
    const result = applyBackgroundSamples(state, [sample(0), sample(5, 40.505), sample(10, 40.51)]);
    expect(result.completedSessionId).toBeNull();
    expect(result.data.activeSession?.points).toHaveLength(3);
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
});
