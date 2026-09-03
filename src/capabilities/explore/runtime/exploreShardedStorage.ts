import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PersistStorage, StorageValue } from 'zustand/middleware';
import type { ExploreData, ExploredCell, ExploreSession } from '../domain/types';

export const EXPLORE_LEGACY_STORAGE_KEY = 'kwilt-explore-v1';
export const EXPLORE_INDEX_STORAGE_KEY = 'kwilt-explore-index-v1';
const EXPLORE_SESSION_STORAGE_PREFIX = 'kwilt-explore-session-v1:';
const EXPLORE_SESSION_POINTS_STORAGE_PREFIX = 'kwilt-explore-session-points-v1:';
const EXPLORE_CELL_STORAGE_PREFIX = 'kwilt-explore-cells-v1:';
const EXPLORE_CELL_BUCKET_COUNT = 64;
const EXPLORE_POINT_CHUNK_SIZE = 512;
const DEFAULT_READ_BATCH_SIZE = 4;

type ExploreCoreData = Omit<ExploreData, 'activeSession' | 'sessions' | 'exploredCells'>;
type ExploreSessionIndexEntry = { id: string; key: string; pointKeys: string[] };

type ExploreStorageIndex = {
  formatVersion: 1;
  generation: number;
  persistVersion: number;
  state: ExploreCoreData;
  activeSession: ExploreSessionIndexEntry | null;
  sessions: ExploreSessionIndexEntry[];
  cellBuckets: Array<{ bucket: number; key: string }>;
};

type KeyValueStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  multiGet?: (keys: readonly string[]) => Promise<readonly (readonly [string, string | null])[]>;
  multiRemove: (keys: readonly string[]) => Promise<void>;
};

type ExploreShardedStorageOptions = {
  storage?: KeyValueStorage;
  batchSize?: number;
  yieldToRuntime?: () => Promise<void>;
};

export type ExploreShardedStorage = PersistStorage<ExploreData, Promise<void>> & {
  flushPendingWrites: () => Promise<void>;
};

export function exploreSessionStorageKey(sessionId: string, generation: number): string {
  return `${EXPLORE_SESSION_STORAGE_PREFIX}${encodeURIComponent(sessionId)}:${generation}`;
}

function exploreCellStorageKey(bucket: number, generation: number): string {
  return `${EXPLORE_CELL_STORAGE_PREFIX}${bucket}:${generation}`;
}

function exploreSessionPointsStorageKey(sessionId: string, generation: number, chunk: number): string {
  return `${EXPLORE_SESSION_POINTS_STORAGE_PREFIX}${encodeURIComponent(sessionId)}:${generation}:${chunk}`;
}

function cellBucket(cellId: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < cellId.length; index += 1) {
    hash ^= cellId.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0) % EXPLORE_CELL_BUCKET_COUNT;
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function coreData(state: ExploreData): ExploreCoreData {
  const {
    activeSession: _activeSession,
    sessions: _sessions,
    exploredCells: _exploredCells,
    ...core
  } = state;
  return core;
}

function chunksOf<T>(values: readonly T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let offset = 0; offset < values.length; offset += chunkSize) {
    chunks.push(values.slice(offset, offset + chunkSize));
  }
  return chunks;
}

function defaultYieldToRuntime(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export function createExploreShardedStorage(
  options: ExploreShardedStorageOptions = {},
): ExploreShardedStorage {
  const storage = options.storage ?? AsyncStorage;
  const batchSize = Math.max(1, Math.floor(options.batchSize ?? DEFAULT_READ_BATCH_SIZE));
  const yieldToRuntime = options.yieldToRuntime ?? defaultYieldToRuntime;
  let pendingWrite: Promise<void> = Promise.resolve();
  let lastActiveSession: ExploreSession | null = null;
  let lastSessions = new Map<string, ExploreSession>();
  let lastCells = new Map<string, ExploredCell>();
  let lastIndex: ExploreStorageIndex | null = null;

  const readLegacy = async (): Promise<StorageValue<ExploreData> | null> =>
    parseJson<StorageValue<ExploreData>>(await storage.getItem(EXPLORE_LEGACY_STORAGE_KEY));

  const writeValue = async (value: StorageValue<ExploreData>): Promise<void> => {
    const state = value.state;
    const generation = (lastIndex?.generation ?? 0) + 1;
    const lastCellKeys = new Map(lastIndex?.cellBuckets.map((entry) => [entry.bucket, entry.key]) ?? []);
    const nextSessions = new Map(state.sessions.map((session) => [session.id, session]));
    const lastSessionEntries = new Map(lastIndex?.sessions.map((session) => [session.id, session]) ?? []);
    const sessionWrites: Array<{ key: string; value: string }> = [];
    const buildSessionEntry = (
      session: ExploreSession,
      previousSession: ExploreSession | null,
      previousEntry: ExploreSessionIndexEntry | null,
    ): ExploreSessionIndexEntry => {
      if (previousSession === session && previousEntry) return previousEntry;
      const pointChunks = chunksOf(session.points, EXPLORE_POINT_CHUNK_SIZE);
      const pointKeys = pointChunks.map((points, chunk) => {
        const start = chunk * EXPLORE_POINT_CHUNK_SIZE;
        const previousChunkIsIdentical = Boolean(
          previousEntry?.pointKeys[chunk] &&
          previousSession &&
          previousSession.points.length >= start + points.length &&
          (chunk < pointChunks.length - 1 || previousSession.points.length === session.points.length) &&
          points.every((point, pointOffset) => previousSession.points[start + pointOffset] === point),
        );
        if (previousChunkIsIdentical) return previousEntry!.pointKeys[chunk];
        const key = exploreSessionPointsStorageKey(session.id, generation, chunk);
        sessionWrites.push({ key, value: JSON.stringify(points) });
        return key;
      });
      const key = exploreSessionStorageKey(session.id, generation);
      const { points: _points, ...sessionHeader } = session;
      sessionWrites.push({ key, value: JSON.stringify(sessionHeader) });
      return { id: session.id, key, pointKeys };
    };
    const activeSessionEntry = state.activeSession
      ? buildSessionEntry(
        state.activeSession,
        lastActiveSession?.id === state.activeSession.id ? lastActiveSession : null,
        lastIndex?.activeSession?.id === state.activeSession.id ? lastIndex.activeSession : null,
      )
      : null;
    const sessionEntries = state.sessions.map((session) => buildSessionEntry(
      session,
      lastSessions.get(session.id) ?? (lastActiveSession?.id === session.id ? lastActiveSession : null),
      lastSessionEntries.get(session.id) ?? (
        lastIndex?.activeSession?.id === session.id ? lastIndex.activeSession : null
      ),
    ));

    const nextCells = new Map(Object.values(state.exploredCells).map((cell) => [cell.id, cell]));
    const changedCellBuckets = new Set<number>();
    nextCells.forEach((cell, id) => {
      if (lastCells.get(id) !== cell) changedCellBuckets.add(cellBucket(id));
    });
    lastCells.forEach((_cell, id) => {
      if (!nextCells.has(id)) changedCellBuckets.add(cellBucket(id));
    });
    const cellsByChangedBucket = new Map<number, Record<string, ExploredCell>>();
    changedCellBuckets.forEach((bucket) => cellsByChangedBucket.set(bucket, {}));
    nextCells.forEach((cell, id) => {
      const bucket = cellBucket(id);
      const cells = cellsByChangedBucket.get(bucket);
      if (cells) cells[id] = cell;
    });
    const nextCellBuckets = [...new Set([...nextCells.keys()].map(cellBucket))].sort((left, right) => left - right);
    const cellBucketEntries = nextCellBuckets.map((bucket) => ({
      bucket,
      key: changedCellBuckets.has(bucket) || !lastCellKeys.has(bucket)
        ? exploreCellStorageKey(bucket, generation)
        : lastCellKeys.get(bucket)!,
    }));
    const cellEntryByBucket = new Map(cellBucketEntries.map((entry) => [entry.bucket, entry]));

    await Promise.all([
      ...sessionWrites.map((record) => storage.setItem(record.key, record.value)),
      ...[...cellsByChangedBucket.entries()]
        .filter(([, cells]) => Object.keys(cells).length > 0)
        .map(([bucket, cells]) => storage.setItem(cellEntryByBucket.get(bucket)!.key, JSON.stringify(cells))),
    ]);

    const index: ExploreStorageIndex = {
      formatVersion: 1,
      generation,
      persistVersion: value.version ?? state.version,
      state: coreData(state),
      activeSession: activeSessionEntry,
      sessions: sessionEntries,
      cellBuckets: cellBucketEntries,
    };
    await storage.setItem(EXPLORE_INDEX_STORAGE_KEY, JSON.stringify(index));

    const liveKeys = new Set([
      ...(index.activeSession
        ? [index.activeSession.key, ...index.activeSession.pointKeys]
        : []),
      ...index.sessions.map((entry) => entry.key),
      ...index.sessions.flatMap((entry) => entry.pointKeys),
      ...index.cellBuckets.map((entry) => entry.key),
    ]);
    const staleKeys = [
      ...(lastIndex?.activeSession
        ? [lastIndex.activeSession.key, ...lastIndex.activeSession.pointKeys]
        : []),
      ...(lastIndex?.sessions.map((entry) => entry.key) ?? []),
      ...(lastIndex?.sessions.flatMap((entry) => entry.pointKeys) ?? []),
      ...(lastIndex?.cellBuckets.map((entry) => entry.key) ?? []),
    ].filter((key) => !liveKeys.has(key));
    lastActiveSession = state.activeSession;
    lastSessions = nextSessions;
    lastCells = nextCells;
    lastIndex = index;
    if (staleKeys.length) await storage.multiRemove(staleKeys).catch(() => undefined);
    await storage.removeItem(EXPLORE_LEGACY_STORAGE_KEY).catch(() => undefined);
  };

  const enqueueWrite = (value: StorageValue<ExploreData>): Promise<void> => {
    const write = pendingWrite.then(() => writeValue(value));
    pendingWrite = write.catch(() => undefined);
    return write;
  };

  const readShards = async <T>(keys: string[]): Promise<T[] | null> => {
    const values: T[] = [];
    for (let offset = 0; offset < keys.length; offset += batchSize) {
      const batch = keys.slice(offset, offset + batchSize);
      const records = storage.multiGet
        ? await storage.multiGet(batch)
        : await Promise.all(batch.map(async (key) => [key, await storage.getItem(key)] as const));
      for (const key of batch) {
        const raw = records.find(([recordKey]) => recordKey === key)?.[1] ?? null;
        const value = parseJson<T>(raw);
        if (!value) return null;
        values.push(value);
      }
      if (offset + batchSize < keys.length) await yieldToRuntime();
    }
    return values;
  };

  return {
    getItem: async () => {
      await pendingWrite;
      const index = parseJson<ExploreStorageIndex>(await storage.getItem(EXPLORE_INDEX_STORAGE_KEY));
      if (
        !index ||
        index.formatVersion !== 1 ||
        !('activeSession' in index) ||
        !Array.isArray(index.sessions) ||
        !Array.isArray(index.cellBuckets)
      ) {
        const legacy = await readLegacy();
        if (legacy) void enqueueWrite(legacy).catch(() => undefined);
        return legacy;
      }

      const indexedSessions = [
        ...(index.activeSession ? [index.activeSession] : []),
        ...index.sessions,
      ];
      const sessionHeaders = await readShards<Omit<ExploreSession, 'points'>>(
        indexedSessions.map((entry) => entry.key),
      );
      const restoredSessions: ExploreSession[] = [];
      if (sessionHeaders) {
        for (let indexOffset = 0; indexOffset < indexedSessions.length; indexOffset += 1) {
          const points = await readShards<ExploreSession['points']>(indexedSessions[indexOffset].pointKeys);
          if (!points) return readLegacy();
          restoredSessions.push({ ...sessionHeaders[indexOffset], points: points.flat() });
          if (indexOffset + 1 < indexedSessions.length) await yieldToRuntime();
        }
      }
      const cellGroups = await readShards<Record<string, ExploredCell>>(
        index.cellBuckets.map((entry) => entry.key),
      );
      if (!sessionHeaders || !cellGroups) return readLegacy();
      const exploredCells: Record<string, ExploredCell> = Object.assign({}, ...cellGroups);
      const activeSession = index.activeSession ? restoredSessions[0] ?? null : null;
      const sessions = index.activeSession ? restoredSessions.slice(1) : restoredSessions;
      const state: ExploreData = { ...index.state, activeSession, sessions, exploredCells };
      lastActiveSession = activeSession;
      lastSessions = new Map(sessions.map((session) => [session.id, session]));
      lastCells = new Map(Object.values(exploredCells).map((cell) => [cell.id, cell]));
      lastIndex = index;
      return { state, version: index.persistVersion };
    },
    setItem: (_name, value) => enqueueWrite(value),
    removeItem: async () => {
      await pendingWrite;
      const storedIndex = lastIndex ?? parseJson<ExploreStorageIndex>(
        await storage.getItem(EXPLORE_INDEX_STORAGE_KEY),
      );
      const keys = [
        EXPLORE_INDEX_STORAGE_KEY,
        EXPLORE_LEGACY_STORAGE_KEY,
        ...(storedIndex?.activeSession
          ? [storedIndex.activeSession.key, ...storedIndex.activeSession.pointKeys]
          : []),
        ...(storedIndex?.sessions.map((entry) => entry.key) ?? []),
        ...(storedIndex?.sessions.flatMap((entry) => entry.pointKeys) ?? []),
        ...(storedIndex?.cellBuckets.map((entry) => entry.key) ?? []),
      ];
      await storage.multiRemove(keys);
      lastActiveSession = null;
      lastSessions = new Map();
      lastCells = new Map();
      lastIndex = null;
    },
    flushPendingWrites: () => pendingWrite,
  };
}

export const exploreShardedStorage = createExploreShardedStorage();
