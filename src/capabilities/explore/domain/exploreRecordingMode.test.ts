import { locationProfileForExploreMode, prepareExploreBackgroundBatch, prepareAutomaticBackgroundSession } from './exploreRecordingMode';
import { appendExplorePoint, beginExploreSession, createEmptyExploreData } from './exploreState';

const sample = (minute: number, latitude = 40.5) => ({
  latitude, longitude: -105.1, altitudeM: 1500, horizontalAccuracyM: 12, altitudeAccuracyM: 8,
  speedMps: null, courseDeg: null,
  recordedAt: new Date(Date.parse('2026-07-28T12:00:00.000Z') + minute * 60_000).toISOString(),
});

describe('Explore recording modes', () => {
  it('uses the initial Ambient profile while Always Exploring is locked', () => {
    expect(locationProfileForExploreMode('automatic', 'background')).toEqual({
      accuracy: 'high', distanceIntervalM: 60, timeIntervalMs: 120_000,
      deferredDistanceM: 300, deferredIntervalMs: 180_000, pausesAutomatically: false,
    });
    expect(locationProfileForExploreMode('manual', 'foreground')).toEqual(expect.objectContaining({
      accuracy: 'high', distanceIntervalM: 6, timeIntervalMs: 1_000,
    }));
  });

  it('starts an ambient outing only after moving away from the last stopped outing', () => {
    const empty = { ...createEmptyExploreData(), preferences: { ...createEmptyExploreData().preferences, recording: 'automatic' as const } };
    const first = prepareAutomaticBackgroundSession(empty, sample(0), 'auto-1');
    expect(first.activeSession?.id).toBe('auto-1');
    let completed = beginExploreSession(empty, 'old', sample(0).recordedAt);
    completed = appendExplorePoint(completed, { id: 'p', ...sample(0) });
    completed = { ...completed, activeSession: null, sessions: [{ ...completed.activeSession!, endedAt: sample(10).recordedAt, completedReason: 'background-stillness', recapStatus: 'resolving' }, ...completed.sessions] };
    expect(prepareAutomaticBackgroundSession(completed, sample(20), 'auto-2').activeSession).toBeNull();
    expect(prepareAutomaticBackgroundSession(completed, sample(20, 40.501), 'auto-2').activeSession?.id).toBe('auto-2');
  });

  it('splits an ambient outing when OS pausing leaves a long stationary gap before movement resumes', () => {
    const empty = { ...createEmptyExploreData(), preferences: { ...createEmptyExploreData().preferences, recording: 'automatic' as const } };
    let active = beginExploreSession(empty, 'old', sample(0).recordedAt, 'ambient');
    active = appendExplorePoint(active, { id: 'p', ...sample(0) });
    const prepared = prepareExploreBackgroundBatch(active, sample(30, 40.501), 'new');
    expect(prepared.completedSessionId).toBe('old');
    expect(prepared.data.sessions[0].completedReason).toBe('background-stillness');
    expect(prepared.data.activeSession?.id).toBe('new');
  });

  it('keeps an Adventure together across short breaks and splits after thirty minutes', () => {
    let active = beginExploreSession(createEmptyExploreData(), 'old', sample(0).recordedAt, 'adventure');
    active = appendExplorePoint(active, { id: 'p', ...sample(0) });
    expect(prepareExploreBackgroundBatch(active, sample(20, 40.501), 'new').completedSessionId).toBeNull();
    const prepared = prepareExploreBackgroundBatch(active, sample(30, 40.501), 'new');
    expect(prepared.completedSessionId).toBe('old');
    expect(prepared.data.activeSession?.id).toBe('new');
    expect(prepared.data.tracking.policy).toBe('adventure');
  });
});
