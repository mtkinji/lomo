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

  it('finishes once later samples prove fifteen minutes of stillness', () => {
    const state = beginExploreSession(createEmptyExploreData(), 'session-1', sample(0).recordedAt);
    const result = applyBackgroundSamples(state, [sample(0), sample(5), sample(10), sample(15)]);
    expect(result.completedSessionId).toBe('session-1');
    expect(result.data.activeSession).toBeNull();
    expect(result.data.sessions[0]).toEqual(expect.objectContaining({
      completedReason: 'background-stillness',
      recapStatus: 'resolving',
    }));
  });

  it('does not infer stillness from inaccurate samples', () => {
    const state = beginExploreSession(createEmptyExploreData(), 'session-1', sample(0).recordedAt);
    const inaccurate = [0, 5, 10, 15].map((minute) => ({ ...sample(minute), horizontalAccuracyM: 90 }));
    expect(applyBackgroundSamples(state, inaccurate).completedSessionId).toBeNull();
  });
});
