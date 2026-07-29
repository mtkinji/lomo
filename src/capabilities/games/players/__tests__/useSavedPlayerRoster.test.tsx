jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined) },
}));

jest.mock('expo-crypto', () => ({ randomUUID: () => 'generated-id' }));

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useSavedPlayerRoster, type SavedPlayerCloud, type SavedPlayerRosterStorage } from '../useSavedPlayerRoster';
import type { SavedPlayer } from '../savedPlayers';

const blair: SavedPlayer = {
  id: 'blair', displayName: 'Blair', linkedUserId: null, playCount: 1,
  lastPlayedAt: '2026-07-10T12:00:00.000Z', sortOrder: 0, archivedAt: null,
  createdAt: '2026-07-10T12:00:00.000Z', updatedAt: '2026-07-10T12:00:00.000Z',
};

const now = () => '2026-07-11T12:00:00.000Z';

describe('useSavedPlayerRoster', () => {
  test('loads, remembers, renames, and archives players', async () => {
    const storage: SavedPlayerRosterStorage = {
      load: jest.fn(async () => [blair]),
      save: jest.fn(async () => undefined),
    };
    const ids = ['charlie'];
    const { result } = renderHook(() => useSavedPlayerRoster({ storage, now, createId: () => ids.shift() ?? 'extra' }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.players.map((player) => player.displayName)).toEqual(['Blair']);

    act(() => result.current.remember([{ savedPlayerId: 'blair', displayName: 'Blair' }, { displayName: 'Charlie' }]));
    await waitFor(() => expect(storage.save).toHaveBeenCalled());
    expect(result.current.players.map((player) => player.displayName)).toEqual(['Blair', 'Charlie']);

    act(() => result.current.rename('charlie', 'Charles'));
    expect(result.current.players.find((player) => player.id === 'charlie')?.displayName).toBe('Charles');

    act(() => result.current.updateIdentity('charlie', {
      colorId: 'sky', successSoundId: 'fanfare', failureSoundId: 'wobble',
    }));
    expect(result.current.players.find((player) => player.id === 'charlie')?.identity).toEqual({
      colorId: 'sky', successSoundId: 'fanfare', failureSoundId: 'wobble',
    });

    act(() => result.current.archive('blair'));
    expect(result.current.players.map((player) => player.displayName)).toEqual(['Charles']);
  });

  test('keeps gameplay usable when loading or saving fails', async () => {
    const storage: SavedPlayerRosterStorage = {
      load: jest.fn(async () => { throw new Error('read failed'); }),
      save: jest.fn(async () => { throw new Error('write failed'); }),
    };
    const { result } = renderHook(() => useSavedPlayerRoster({ storage, now, createId: () => 'olive' }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.remember([{ displayName: 'Olive' }]));

    expect(result.current.players.map((player) => player.displayName)).toEqual(['Olive']);
    await waitFor(() => expect(storage.save).toHaveBeenCalled());
  });

  test('serializes writes so the newest roster is persisted last', async () => {
    let releaseFirst: (() => void) | undefined;
    const save = jest.fn()
      .mockImplementationOnce(() => new Promise<void>((resolve) => { releaseFirst = resolve; }))
      .mockImplementation(async () => undefined);
    const storage: SavedPlayerRosterStorage = { load: jest.fn(async () => []), save };
    const ids = ['blair', 'olive'];
    const { result } = renderHook(() => useSavedPlayerRoster({ storage, now, createId: () => ids.shift() ?? 'extra' }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.remember([{ displayName: 'Blair' }]));
    act(() => result.current.remember([{ displayName: 'Olive' }]));

    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    releaseFirst?.();
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect((save.mock.calls[1][0] as SavedPlayer[]).map((player) => player.displayName)).toEqual(['Blair', 'Olive']);
  });

  test('merges a signed-in roster and writes the merged result locally and to the owner cloud', async () => {
    const olive: SavedPlayer = { ...blair, id: 'olive', displayName: 'Olive' };
    const storage: SavedPlayerRosterStorage = {
      load: jest.fn(async () => [blair]),
      save: jest.fn(async () => undefined),
    };
    const cloud: SavedPlayerCloud = {
      load: jest.fn(async () => [olive]),
      save: jest.fn(async () => undefined),
    };

    const { result } = renderHook(() => useSavedPlayerRoster({ storage, cloud, userId: 'user-1', now }));

    await waitFor(() => expect(result.current.syncing).toBe(false));
    expect(result.current.players.map((player) => player.displayName)).toEqual(['Blair', 'Olive']);
    expect(storage.save).toHaveBeenCalledWith([blair, olive]);
    expect(cloud.save).toHaveBeenCalledWith('user-1', [blair, olive]);
  });

  test('keeps local play usable when cloud sync fails', async () => {
    const storage: SavedPlayerRosterStorage = {
      load: jest.fn(async () => [blair]),
      save: jest.fn(async () => undefined),
    };
    const cloud: SavedPlayerCloud = {
      load: jest.fn(async () => { throw new Error('offline'); }),
      save: jest.fn(async () => undefined),
    };
    const { result } = renderHook(() => useSavedPlayerRoster({
      storage,
      cloud,
      userId: 'user-1',
      now,
    }));

    await waitFor(() => expect(result.current.syncing).toBe(false));
    expect(result.current.players.map((player) => player.displayName)).toEqual(['Blair']);
    expect(result.current.syncError).toBe('Your players are still saved on this device. Cloud sync will retry next time.');
  });
});
