import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { appendExplorePoint, beginExploreSession, createEmptyExploreData } from '../domain/exploreState';
import {
  enterExploreDeepSleep,
  startExploreBackgroundUpdates,
  stopExploreBackgroundUpdates,
} from './exploreLocationUpdates';
import { KWILT_LABS_STORAGE_KEY } from '../../../labs/kwiltLabs';
import {
  EXPLORE_BACKGROUND_TASK,
  EXPLORE_WAKE_REGION_ID,
  EXPLORE_WAKE_TASK,
} from './exploreLocationTaskNames';
import { useExploreStore } from './useExploreStore';

type TaskBody = { data?: unknown; error?: Error | null };
type TaskHandler = (body: TaskBody) => Promise<void> | void;
const mockTasks: Record<string, TaskHandler> = {};

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn((name: string, handler: TaskHandler) => {
    mockTasks[name] = handler;
  }),
}));

jest.mock('expo-location', () => ({
  GeofencingEventType: { Enter: 1, Exit: 2 },
}));

jest.mock('./exploreLocationUpdates', () => ({
  enterExploreDeepSleep: jest.fn(async () => undefined),
  startExploreBackgroundUpdates: jest.fn(async () => undefined),
  stopExploreBackgroundUpdates: jest.fn(async () => undefined),
}));

jest.mock('./useExploreStore', () => ({
  useExploreStore: {
    persist: { hasHydrated: jest.fn(() => false) },
    setState: jest.fn(),
  },
}));

require('./exploreBackgroundTask');

const storedState = async () => {
  const raw = await AsyncStorage.getItem('kwilt-explore-v1');
  return JSON.parse(raw ?? '{}').state;
};

describe('Explore background tasks', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await AsyncStorage.setItem(KWILT_LABS_STORAGE_KEY, JSON.stringify({
      state: { enabledCapabilities: ['explore'] },
      version: 1,
    }));
  });

  it('stops stale background services without touching Explore data when the Lab is off', async () => {
    const startedAt = '2026-07-28T12:00:00.000Z';
    const state = beginExploreSession(createEmptyExploreData(), 'ambient-1', startedAt, 'ambient');
    await AsyncStorage.removeItem(KWILT_LABS_STORAGE_KEY);
    await AsyncStorage.setItem('kwilt-explore-v1', JSON.stringify({ state, version: 10 }));

    await mockTasks[EXPLORE_BACKGROUND_TASK]({ data: { locations: [{
      coords: {
        latitude: 40.5,
        longitude: -105.1,
        altitude: 1500,
        accuracy: 8,
        altitudeAccuracy: 6,
        speed: 2,
        heading: 90,
      },
      timestamp: Date.parse(startedAt),
    }] } });
    await mockTasks[EXPLORE_WAKE_TASK]({
      data: {
        eventType: Location.GeofencingEventType.Exit,
        region: { identifier: EXPLORE_WAKE_REGION_ID },
      },
    });

    expect(stopExploreBackgroundUpdates).toHaveBeenCalledTimes(2);
    expect((await storedState()).activeSession.points).toHaveLength(0);
    expect(startExploreBackgroundUpdates).not.toHaveBeenCalled();
  });

  it('persists deep sleep and installs the low-power wake condition', async () => {
    const startedAt = '2026-07-28T12:00:00.000Z';
    const state = beginExploreSession(createEmptyExploreData(), 'ambient-1', startedAt, 'ambient');
    await AsyncStorage.setItem('kwilt-explore-v1', JSON.stringify({ state, version: 4 }));

    const locations = [0, 2, 5].map((minute) => ({
      coords: {
        latitude: 40.5,
        longitude: -105.1,
        altitude: 1500,
        accuracy: 8,
        altitudeAccuracy: 6,
        speed: 0,
      },
      timestamp: Date.parse(startedAt) + minute * 60_000,
    }));
    await mockTasks[EXPLORE_BACKGROUND_TASK]({ data: { locations } });

    expect((await storedState()).tracking.phase).toBe('deep-sleep');
    expect(enterExploreDeepSleep).toHaveBeenCalledWith(expect.objectContaining({
      latitude: 40.5,
      longitude: -105.1,
    }));
  });

  it('resumes the saved policy when the exit wake condition fires', async () => {
    const startedAt = '2026-07-28T12:00:00.000Z';
    const state = beginExploreSession(createEmptyExploreData(), 'ambient-1', startedAt, 'ambient');
    state.tracking = {
      ...state.tracking,
      phase: 'deep-sleep',
      movement: 'stationary',
      stationarySince: startedAt,
      wakeAnchor: { latitude: 40.5, longitude: -105.1, horizontalAccuracyM: 8 },
    };
    await AsyncStorage.setItem('kwilt-explore-v1', JSON.stringify({ state, version: 4 }));

    await mockTasks[EXPLORE_WAKE_TASK]({
      data: {
        eventType: Location.GeofencingEventType.Exit,
        region: { identifier: EXPLORE_WAKE_REGION_ID },
      },
    });

    expect((await storedState()).tracking).toEqual(expect.objectContaining({
      policy: 'ambient',
      phase: 'active',
      movement: 'unknown',
      stationarySince: null,
      wakeAnchor: null,
    }));
    expect(startExploreBackgroundUpdates).toHaveBeenCalledWith('automatic', 'active', 'unknown');
  });

  it('upgrades legacy route points with explicit null motion metadata', async () => {
    const startedAt = '2026-07-28T12:00:00.000Z';
    let state = beginExploreSession(createEmptyExploreData(), 'ambient-1', startedAt, 'ambient');
    state = appendExplorePoint(state, {
      id: 'legacy-point',
      latitude: 40.5,
      longitude: -105.1,
      altitudeM: 1500,
      horizontalAccuracyM: 8,
      altitudeAccuracyM: 6,
      speedMps: null,
      courseDeg: null,
      recordedAt: startedAt,
    });
    state.tracking = {
      ...state.tracking,
      phase: 'deep-sleep',
      movement: 'stationary',
      stationarySince: startedAt,
      wakeAnchor: { latitude: 40.5, longitude: -105.1, horizontalAccuracyM: 8 },
    };
    const legacyState = JSON.parse(JSON.stringify(state));
    delete legacyState.activeSession.points[0].speedMps;
    delete legacyState.activeSession.points[0].courseDeg;
    delete legacyState.activeSession.trackingPolicy;
    legacyState.sessions = [{
      ...legacyState.activeSession,
      id: 'legacy-completed',
      endedAt: startedAt,
    }];
    delete legacyState.sessions[0].trackingPolicy;
    await AsyncStorage.setItem('kwilt-explore-v1', JSON.stringify({ state: legacyState, version: 7 }));

    await mockTasks[EXPLORE_WAKE_TASK]({
      data: {
        eventType: Location.GeofencingEventType.Exit,
        region: { identifier: EXPLORE_WAKE_REGION_ID },
      },
    });

    const upgraded = await storedState();
    expect(upgraded.version).toBe(10);
    expect(upgraded.activeSession.points[0]).toEqual(expect.objectContaining({
      speedMps: null,
      courseDeg: null,
    }));
    expect(upgraded.activeSession.trackingPolicy).toBe('ambient');
    expect(upgraded.sessions[0].trackingPolicy).toBe('ambient');
  });

  it('preserves GPS speed and course from a background observation', async () => {
    const startedAt = '2026-07-28T12:00:00.000Z';
    const state = beginExploreSession(createEmptyExploreData(), 'ambient-1', startedAt, 'ambient');
    await AsyncStorage.setItem('kwilt-explore-v1', JSON.stringify({ state, version: 8 }));

    await mockTasks[EXPLORE_BACKGROUND_TASK]({ data: { locations: [{
      coords: {
        latitude: 40.5,
        longitude: -105.1,
        altitude: 1500,
        accuracy: 8,
        altitudeAccuracy: 6,
        speed: 11.176,
        heading: 88,
      },
      timestamp: Date.parse(startedAt),
    }] } });

    expect((await storedState()).activeSession.points[0]).toEqual(expect.objectContaining({
      speedMps: 11.176,
      courseDeg: 88,
    }));
  });

  it('persists one copy of a background batch while the live Explore store is hydrated', async () => {
    const startedAt = '2026-07-28T12:00:00.000Z';
    const state = beginExploreSession(createEmptyExploreData(), 'ambient-1', startedAt, 'ambient');
    await AsyncStorage.setItem('kwilt-explore-v1', JSON.stringify({ state, version: 10 }));
    jest.clearAllMocks();
    (useExploreStore.persist.hasHydrated as jest.Mock).mockReturnValue(true);
    (useExploreStore.setState as jest.Mock).mockImplementation(async (nextState) => {
      await AsyncStorage.setItem('kwilt-explore-v1', JSON.stringify({ state: nextState, version: 10 }));
    });

    await mockTasks[EXPLORE_BACKGROUND_TASK]({ data: { locations: [{
      coords: {
        latitude: 40.5,
        longitude: -105.1,
        altitude: 1500,
        accuracy: 8,
        altitudeAccuracy: 6,
        speed: 11.176,
        heading: 88,
      },
      timestamp: Date.parse(startedAt),
    }] } });

    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
    expect(useExploreStore.setState).toHaveBeenCalledWith(expect.objectContaining({
      lastPointDecision: 'background-location',
    }));
    expect((await storedState()).activeSession.points).toHaveLength(1);
  });
});
