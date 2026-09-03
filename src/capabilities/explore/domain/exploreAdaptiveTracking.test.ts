import {
  adaptiveLocationProfile,
  classifyExploreMovement,
  createExploreTrackingState,
  normalizeExploreTrackingState,
  resumeExploreTracking,
  shouldClearFogForMovement,
  shouldSplitExploreOuting,
  transitionExploreTracking,
} from './exploreAdaptiveTracking';
import type { ExplorePoint } from './types';

const at = (minute: number) => new Date(
  Date.parse('2026-07-28T12:00:00.000Z') + minute * 60_000,
).toISOString();

const point = (minute: number, latitude = 40.5): ExplorePoint => ({
  id: `point-${minute}`,
  latitude,
  longitude: -105.1,
  altitudeM: 1500,
  horizontalAccuracyM: 8,
  altitudeAccuracyM: 6,
  speedMps: null,
  courseDeg: null,
  recordedAt: at(minute),
});

const sample = (minute: number, latitude = 40.5, speedMps: number | null = 0) => ({
  latitude,
  longitude: -105.1,
  altitudeM: 1500,
  horizontalAccuracyM: 8,
  altitudeAccuracyM: 6,
  speedMps,
  recordedAt: at(minute),
});

describe('Explore adaptive tracking', () => {
  it('moves Ambient into soft sleep at two minutes and deep sleep at five', () => {
    let tracking = createExploreTrackingState('ambient', at(0));
    tracking = transitionExploreTracking(tracking, point(0), sample(0));
    tracking = transitionExploreTracking(tracking, point(0), sample(2));
    expect(tracking.phase).toBe('soft-sleep');
    tracking = transitionExploreTracking(tracking, point(0), sample(5));
    expect(tracking.phase).toBe('deep-sleep');
  });

  it('gives a deliberate Adventure three minutes before soft sleep and fifteen before deep sleep', () => {
    let tracking = createExploreTrackingState('adventure', at(0));
    tracking = transitionExploreTracking(tracking, point(0), sample(0));
    expect(transitionExploreTracking(tracking, point(0), sample(2)).phase).toBe('active');
    tracking = transitionExploreTracking(tracking, point(0), sample(3));
    expect(tracking.phase).toBe('soft-sleep');
    tracking = transitionExploreTracking(tracking, point(0), sample(15));
    expect(tracking.phase).toBe('deep-sleep');
  });

  it('returns immediately to active tracking when credible movement resumes', () => {
    const soft = {
      ...createExploreTrackingState('ambient', at(0)),
      phase: 'soft-sleep' as const,
      movement: 'stationary' as const,
      stationarySince: at(0),
    };
    const next = transitionExploreTracking(soft, point(2), sample(3, 40.501, 1.4));
    expect(next).toEqual(expect.objectContaining({
      phase: 'active',
      movement: 'pedestrian',
      stationarySince: null,
    }));
  });

  it('wakes from soft sleep on credible displacement even when speed is unavailable', () => {
    const soft = {
      ...createExploreTrackingState('ambient', at(0)),
      phase: 'soft-sleep' as const,
      movement: 'stationary' as const,
      stationarySince: at(0),
      wakeAnchor: { latitude: 40.5, longitude: -105.1, horizontalAccuracyM: 8 },
    };
    const next = transitionExploreTracking(soft, point(0), sample(10, 40.501, null));
    expect(next.phase).toBe('active');
    expect(next.movement).toBe('pedestrian');
  });

  it('classifies pedestrian, cycling, vehicle, and airplane speeds', () => {
    expect(classifyExploreMovement(point(0), sample(1, 40.5001, 1.4))).toBe('pedestrian');
    expect(classifyExploreMovement(point(0), sample(1, 40.5001, 5))).toBe('cycling');
    expect(classifyExploreMovement(point(0), sample(1, 40.5001, 18))).toBe('vehicle');
    expect(classifyExploreMovement(point(0), sample(1, 40.5001, 80))).toBe('airplane');
  });

  it('uses policy and movement to choose hidden battery profiles', () => {
    expect(adaptiveLocationProfile('ambient', 'active', 'pedestrian')).toEqual(expect.objectContaining({
      accuracy: 'high', distanceIntervalM: 60, deferredIntervalMs: 180_000,
    }));
    expect(adaptiveLocationProfile('adventure', 'active', 'pedestrian')).toEqual(expect.objectContaining({
      accuracy: 'high', distanceIntervalM: 6, deferredIntervalMs: 15_000,
    }));
    expect(adaptiveLocationProfile('ambient', 'active', 'vehicle')).toEqual(expect.objectContaining({
      accuracy: 'high',
      distanceIntervalM: 60,
      timeIntervalMs: 120_000,
      deferredDistanceM: 300,
      deferredIntervalMs: 180_000,
    }));
    expect(adaptiveLocationProfile('adventure', 'active', 'vehicle')).toEqual(expect.objectContaining({
      accuracy: 'high',
      distanceIntervalM: 6,
      timeIntervalMs: 1_000,
      deferredDistanceM: 60,
      deferredIntervalMs: 15_000,
    }));
    expect(adaptiveLocationProfile('adventure', 'active', 'cycling')).toEqual(expect.objectContaining({
      accuracy: 'high', distanceIntervalM: 6, timeIntervalMs: 1_000,
    }));
    expect(adaptiveLocationProfile('ambient', 'soft-sleep', 'stationary')).toEqual(expect.objectContaining({
      accuracy: 'balanced', distanceIntervalM: 75, timeIntervalMs: 120_000,
    }));
  });

  it('uses different semantic outing boundaries without adding a setting', () => {
    expect(shouldSplitExploreOuting('ambient', 9 * 60_000)).toBe(false);
    expect(shouldSplitExploreOuting('ambient', 10 * 60_000)).toBe(true);
    expect(shouldSplitExploreOuting('adventure', 29 * 60_000)).toBe(false);
    expect(shouldSplitExploreOuting('adventure', 30 * 60_000)).toBe(true);
  });

  it('freezes fog for stationary and airplane samples', () => {
    expect(shouldClearFogForMovement('stationary')).toBe(false);
    expect(shouldClearFogForMovement('airplane')).toBe(false);
    expect(shouldClearFogForMovement('pedestrian')).toBe(true);
    expect(shouldClearFogForMovement('cycling')).toBe(true);
  });

  it('migrates a legacy active session into the recording mode policy', () => {
    expect(normalizeExploreTrackingState(undefined, 'ambient', at(0))).toEqual(expect.objectContaining({
      policy: 'ambient',
      phase: 'active',
      movement: 'unknown',
    }));
    expect(normalizeExploreTrackingState({ phase: 'deep-sleep' }, 'adventure', at(0))).toEqual(expect.objectContaining({
      policy: 'adventure',
      phase: 'deep-sleep',
    }));
  });

  it('resets deep sleep into an active unknown state when a wake condition fires', () => {
    const deep = {
      ...createExploreTrackingState('ambient', at(0)),
      phase: 'deep-sleep' as const,
      movement: 'stationary' as const,
      stationarySince: at(0),
      wakeAnchor: { latitude: 40.5, longitude: -105.1, horizontalAccuracyM: 8 },
    };
    expect(resumeExploreTracking(deep, at(6))).toEqual(expect.objectContaining({
      policy: 'ambient',
      phase: 'active',
      movement: 'unknown',
      stationarySince: null,
      phaseChangedAt: at(6),
      wakeAnchor: null,
    }));
  });
});
