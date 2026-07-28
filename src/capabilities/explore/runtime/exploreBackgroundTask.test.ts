import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { beginExploreSession, createEmptyExploreData } from '../domain/exploreState';
import {
  enterExploreDeepSleep,
  startExploreBackgroundUpdates,
} from './exploreLocationUpdates';
import {
  EXPLORE_BACKGROUND_TASK,
  EXPLORE_WAKE_REGION_ID,
  EXPLORE_WAKE_TASK,
} from './exploreLocationTaskNames';

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
});
