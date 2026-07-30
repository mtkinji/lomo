jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined) },
}));

import { createSavedPlayerStorage, SAVED_PLAYER_STORAGE_KEY } from '../savedPlayerStorage';
import type { SavedPlayer } from '../savedPlayers';

const blair: SavedPlayer = {
  id: 'blair',
  displayName: 'Blair',
  linkedUserId: null,
  playCount: 2,
  lastPlayedAt: '2026-07-11T12:00:00.000Z',
  sortOrder: 0,
  archivedAt: null,
  createdAt: '2026-07-10T12:00:00.000Z',
  updatedAt: '2026-07-11T12:00:00.000Z',
};

function memoryAdapter(initial: string | null = null) {
  let value = initial;
  return {
    getItem: jest.fn(async () => value),
    setItem: jest.fn(async (_key: string, next: string) => { value = next; }),
  };
}

describe('saved player storage', () => {
  test('loads an empty roster when the document is missing or corrupt', async () => {
    expect(await createSavedPlayerStorage(memoryAdapter()).load()).toEqual([]);
    expect(await createSavedPlayerStorage(memoryAdapter('{bad json')).load()).toEqual([]);
    expect(await createSavedPlayerStorage(memoryAdapter(JSON.stringify({ schemaVersion: 2, players: [blair] }))).load()).toEqual([]);
  });

  test('saves and loads a versioned roster document', async () => {
    const adapter = memoryAdapter();
    const storage = createSavedPlayerStorage(adapter);

    await storage.save([blair]);

    expect(adapter.setItem).toHaveBeenCalledWith(SAVED_PLAYER_STORAGE_KEY, expect.stringContaining('"schemaVersion":1'));
    expect(await storage.load()).toEqual([{ ...blair, identity: {
      colorId: 'turmeric', successSoundId: 'chime', failureSoundId: 'trombone',
    } }]);
  });

  test('adds safe identity defaults when loading a legacy roster', async () => {
    const storage = createSavedPlayerStorage(memoryAdapter(JSON.stringify({ schemaVersion: 1, players: [blair] })));

    expect((await storage.load())[0].identity).toEqual({
      colorId: 'turmeric', successSoundId: 'chime', failureSoundId: 'trombone',
    });
  });

  test('returns an empty roster if the device read fails', async () => {
    const storage = createSavedPlayerStorage({
      getItem: jest.fn(async () => { throw new Error('device unavailable'); }),
      setItem: jest.fn(async () => undefined),
    });

    expect(await storage.load()).toEqual([]);
  });

  test('reports a failed save so the hook can keep local state and retry later', async () => {
    const storage = createSavedPlayerStorage({
      getItem: jest.fn(async () => null),
      setItem: jest.fn(async () => { throw new Error('disk full'); }),
    });

    await expect(storage.save([blair])).rejects.toThrow('disk full');
  });
});
