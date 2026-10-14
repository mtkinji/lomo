import type { ExploredCell } from '../domain/types';
import { applyBackgroundSamples } from './exploreBackgroundPolicy';
import * as mutations from '../domain/exploreState';
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
  it('copies existing territory once for a batch instead of once per accepted point', () => {
    const enumerate = jest.fn((target: Record<string, ExploredCell>) => Reflect.ownKeys(target));
    // Instrument intermediate immutable maps too, so repeated copies cannot hide
    // behind replacement of the original object after the first accepted point.
    const append = mutations.appendExplorePoint;
    const appendSpy = jest.spyOn(mutations, 'appendExplorePoint').mockImplementation((data, point) => {
      const next = append(data, point);
      return { ...next, exploredCells: new Proxy(next.exploredCells, { ownKeys: enumerate }) };
    });
    const exploredCells = new Proxy<Record<string, ExploredCell>>({}, { ownKeys: enumerate });
    const state = beginExploreSession({ ...createEmptyExploreData(), exploredCells }, 'session-1', sample(0).recordedAt);
    const result = applyBackgroundSamples(state, [sample(0), sample(5, 40.505), sample(10, 40.51)]);
    expect(result.data.activeSession?.points).toHaveLength(3);
    expect(enumerate).toHaveBeenCalledTimes(1);
    expect(state.activeSession?.points).toEqual([]);
    expect(Object.keys(exploredCells)).toEqual([]);
    const sequential = [sample(0), sample(5, 40.505), sample(10, 40.51)]
      .reduce((current, observation) => applyBackgroundSamples(current, [observation]).data, state);
    expect(result.data.exploredCells).toEqual(sequential.exploredCells);
    expect(result.data.tracking).toEqual(sequential.tracking);
    appendSpy.mockRestore();
  });

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

  it('keeps an Adventure ready after fifteen stationary minutes without painting GPS drift', () => {
    const state = beginExploreSession(createEmptyExploreData(), 'session-1', sample(0).recordedAt, 'adventure');
    const result = applyBackgroundSamples(state, [0, 5, 10, 15].map((minute) => ({
      ...sample(minute),
      speedMps: 0,
    })));
    expect(result.completedSessionId).toBeNull();
    expect(result.trackingAction).toBe('active');
    expect(result.data.activeSession?.id).toBe('session-1');
    expect(result.data.tracking.phase).toBe('active');
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

  it('retains dense 25-mph observations and successive course changes through a turn', () => {
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
      0, 0, 0, 15, 30, 45, 60, 75, 90,
    ]);
  });
});
