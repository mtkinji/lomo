import AsyncStorage from '@react-native-async-storage/async-storage';
import { beginExploreSession, completeExploreSession, createEmptyExploreData } from '../domain/exploreState';
import type { ExploreData, ExploreSession } from '../domain/types';
import {
  EXPLORE_INDEX_STORAGE_KEY,
  EXPLORE_LEGACY_STORAGE_KEY,
  createExploreShardedStorage,
  exploreSessionStorageKey,
} from './exploreShardedStorage';

function completedSession(id: string, minute: number): ExploreSession {
  return completeExploreSession(
    beginExploreSession(
      createEmptyExploreData(),
      id,
      new Date(Date.UTC(2026, 7, 1, 12, minute)).toISOString(),
      'adventure',
    ),
    new Date(Date.UTC(2026, 7, 1, 12, minute + 1)).toISOString(),
  ).sessions[0];
}

function history(sessionCount = 3): ExploreData {
  return {
    ...createEmptyExploreData(),
    sessions: Array.from({ length: sessionCount }, (_, index) => completedSession(`trip-${index}`, index)),
  };
}

describe('Explore sharded persistence', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('migrates the whole-history record into an index and independently addressable trips', async () => {
    const state = history();
    await AsyncStorage.setItem(EXPLORE_LEGACY_STORAGE_KEY, JSON.stringify({ state, version: 10 }));
    const storage = createExploreShardedStorage();

    const restored = await storage.getItem(EXPLORE_LEGACY_STORAGE_KEY);
    await storage.flushPendingWrites();

    expect(restored).toEqual({ state, version: 10 });
    expect(await AsyncStorage.getItem(EXPLORE_INDEX_STORAGE_KEY)).not.toBeNull();
    await Promise.all(state.sessions.map(async (session) => {
      expect(await AsyncStorage.getItem(exploreSessionStorageKey(session.id, 1))).not.toBeNull();
    }));
  });

  it('yields between archive batches while restoring a long history', async () => {
    const state = history(5);
    const writer = createExploreShardedStorage();
    await writer.setItem(EXPLORE_LEGACY_STORAGE_KEY, { state, version: 10 });
    const yieldToRuntime = jest.fn(async () => undefined);
    const reader = createExploreShardedStorage({ batchSize: 2, yieldToRuntime });

    const restored = await reader.getItem(EXPLORE_LEGACY_STORAGE_KEY);

    expect(restored?.state.sessions).toEqual(state.sessions);
    expect(yieldToRuntime.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('chunks and yields within one unusually long trip', async () => {
    const session = {
      ...completedSession('long-trip', 0),
      points: Array.from({ length: 1_200 }, (_, index) => ({
        id: `point-${index}`,
        latitude: 40 + index * 0.00001,
        longitude: -105,
        altitudeM: null,
        horizontalAccuracyM: 5,
        altitudeAccuracyM: null,
        speedMps: 12,
        courseDeg: 0,
        recordedAt: new Date(1_750_000_000_000 + index * 1_000).toISOString(),
      })),
    };
    const state = { ...createEmptyExploreData(), sessions: [session] };
    const writer = createExploreShardedStorage();
    await writer.setItem(EXPLORE_LEGACY_STORAGE_KEY, { state, version: 10 });
    const yieldToRuntime = jest.fn(async () => undefined);
    const reader = createExploreShardedStorage({ batchSize: 2, yieldToRuntime });

    const restored = await reader.getItem(EXPLORE_LEGACY_STORAGE_KEY);

    expect(restored?.state.sessions[0].points).toEqual(session.points);
    expect(yieldToRuntime).toHaveBeenCalled();
  });

  it('appends to a long active trip by rewriting only its final point chunk', async () => {
    const basePoint = (index: number) => ({
      id: `active-point-${index}`,
      latitude: 40 + index * 0.00001,
      longitude: -105,
      altitudeM: null,
      horizontalAccuracyM: 5,
      altitudeAccuracyM: null,
      speedMps: 12,
      courseDeg: 0,
      recordedAt: new Date(1_750_000_000_000 + index * 1_000).toISOString(),
    });
    const activeSession = {
      ...completedSession('active-trip', 0),
      endedAt: null,
      completedReason: null,
      recapStatus: 'none' as const,
      points: Array.from({ length: 1_024 }, (_, index) => basePoint(index)),
    };
    const state = { ...createEmptyExploreData(), activeSession };
    const storage = createExploreShardedStorage();
    await storage.setItem(EXPLORE_LEGACY_STORAGE_KEY, { state, version: 10 });
    const setItem = jest.spyOn(AsyncStorage, 'setItem');
    setItem.mockClear();
    const nextState = {
      ...state,
      activeSession: {
        ...activeSession,
        points: [...activeSession.points, basePoint(1_024)],
      },
    };

    await storage.setItem(EXPLORE_LEGACY_STORAGE_KEY, { state: nextState, version: 10 });

    const pointWrites = setItem.mock.calls.filter(([key]) => key.startsWith('kwilt-explore-session-points-v1:'));
    expect(pointWrites).toHaveLength(1);
    expect((await storage.getItem(EXPLORE_LEGACY_STORAGE_KEY))?.state.activeSession?.points).toEqual(
      nextState.activeSession.points,
    );
  });

  it('rewrites only changed trips instead of serializing every completed trip again', async () => {
    const state = history();
    const storage = createExploreShardedStorage();
    await storage.setItem(EXPLORE_LEGACY_STORAGE_KEY, { state, version: 10 });
    const setItem = jest.spyOn(AsyncStorage, 'setItem');
    setItem.mockClear();
    const changedSession = { ...state.sessions[1], recapStatus: 'seen' as const };

    await storage.setItem(EXPLORE_LEGACY_STORAGE_KEY, {
      state: { ...state, sessions: [state.sessions[0], changedSession, state.sessions[2]] },
      version: 10,
    });

    const writtenKeys = setItem.mock.calls.map(([key]) => key);
    expect(writtenKeys).toContain(EXPLORE_INDEX_STORAGE_KEY);
    expect(writtenKeys).toContain(exploreSessionStorageKey(changedSession.id, 2));
    expect(writtenKeys).not.toContain(exploreSessionStorageKey(state.sessions[0].id, 2));
    expect(writtenKeys).not.toContain(exploreSessionStorageKey(state.sessions[2].id, 2));
    expect(writtenKeys).not.toContain(EXPLORE_LEGACY_STORAGE_KEY);
  });

  it('publishes the new index only after every migration shard is durable', async () => {
    const state = history();
    await AsyncStorage.setItem(EXPLORE_LEGACY_STORAGE_KEY, JSON.stringify({ state, version: 10 }));
    const setItem = jest.spyOn(AsyncStorage, 'setItem');
    setItem.mockClear();
    const writer = createExploreShardedStorage();
    await writer.getItem(EXPLORE_LEGACY_STORAGE_KEY);
    await writer.flushPendingWrites();

    const writtenKeys = setItem.mock.calls.map(([key]) => key);
    expect(writtenKeys.at(-1)).toBe(EXPLORE_INDEX_STORAGE_KEY);
    expect(writtenKeys.slice(0, -1)).toEqual(expect.arrayContaining(
      state.sessions.map((session) => exploreSessionStorageKey(session.id, 1)),
    ));
  });

  it('keeps the legacy history authoritative when migration is interrupted before index commit', async () => {
    const state = history();
    await AsyncStorage.setItem(EXPLORE_LEGACY_STORAGE_KEY, JSON.stringify({ state, version: 10 }));
    const interruptedStorage = {
      getItem: AsyncStorage.getItem,
      removeItem: AsyncStorage.removeItem,
      multiRemove: AsyncStorage.multiRemove,
      setItem: async (key: string, value: string) => {
        if (key === EXPLORE_INDEX_STORAGE_KEY) throw new Error('simulated suspension');
        await AsyncStorage.setItem(key, value);
      },
    };
    const writer = createExploreShardedStorage({ storage: interruptedStorage });

    expect(await writer.getItem(EXPLORE_LEGACY_STORAGE_KEY)).toEqual({ state, version: 10 });
    await writer.flushPendingWrites();

    expect(await AsyncStorage.getItem(EXPLORE_INDEX_STORAGE_KEY)).toBeNull();
    const recoveryReader = createExploreShardedStorage();
    expect(await recoveryReader.getItem(EXPLORE_LEGACY_STORAGE_KEY)).toEqual({
      state,
      version: 10,
    });
    await recoveryReader.flushPendingWrites();
  });

  it('removes a completed trip shard only after the replacement index is written', async () => {
    const state = history();
    const storage = createExploreShardedStorage();
    await storage.setItem(EXPLORE_LEGACY_STORAGE_KEY, { state, version: 10 });
    const removedSession = state.sessions[2];

    await storage.setItem(EXPLORE_LEGACY_STORAGE_KEY, {
      state: { ...state, sessions: state.sessions.slice(0, 2) },
      version: 10,
    });

    expect(await AsyncStorage.getItem(exploreSessionStorageKey(removedSession.id, 1))).toBeNull();
    expect((await storage.getItem(EXPLORE_LEGACY_STORAGE_KEY))?.state.sessions).toEqual(
      state.sessions.slice(0, 2),
    );
  });
});
