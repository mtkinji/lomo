jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn(async () => undefined) },
}));

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useGamePlayerProfile, type GamePlayerProfileCloud, type GamePlayerProfileStorage } from '../useGamePlayerProfile';
import type { GamePlayerProfile } from '../gamePlayerProfile';

const profile: GamePlayerProfile = {
  userId: 'user-1', displayName: 'Olive',
  identity: { colorId: 'rose', successSoundId: 'sparkle', failureSoundId: 'bonk' },
  createdAt: '2026-07-12T10:00:00.000Z', updatedAt: '2026-07-12T10:00:00.000Z',
};

const storage = (): GamePlayerProfileStorage => ({
  load: jest.fn(async () => null),
  save: jest.fn(async () => undefined),
  remove: jest.fn(async () => undefined),
});

describe('useGamePlayerProfile', () => {
  test('shows a user-scoped cache immediately, then accepts newer cloud truth', async () => {
    const cached = { ...profile, displayName: 'Cached' };
    const local = storage();
    local.load = jest.fn(async () => cached);
    const cloud: GamePlayerProfileCloud = {
      load: jest.fn(async () => profile), save: jest.fn(async () => undefined),
    };
    const { result } = renderHook(() => useGamePlayerProfile({ userId: 'user-1', fallbackName: 'Olive', storage: local, cloud }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.profile?.displayName).toBe('Olive'));
    expect(local.save).toHaveBeenCalledWith('user-1', profile);
  });

  test('creates and saves the owner profile when no cloud row exists', async () => {
    const local = storage();
    const cloud: GamePlayerProfileCloud = {
      load: jest.fn(async () => null), save: jest.fn(async () => undefined),
    };
    const { result } = renderHook(() => useGamePlayerProfile({
      userId: 'user-1', fallbackName: 'Olive', storage: local, cloud,
      now: () => '2026-07-12T10:00:00.000Z',
    }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile?.displayName).toBe('Olive');
    act(() => result.current.save('Olive W', { colorId: 'sky', successSoundId: 'fanfare', failureSoundId: 'wobble' }));
    await waitFor(() => expect(cloud.save).toHaveBeenCalled());
    expect(cloud.save).toHaveBeenLastCalledWith(expect.objectContaining({ userId: 'user-1', displayName: 'Olive W' }));
  });

  test('clears the previous account before loading a different user', async () => {
    const local = storage();
    const cloud: GamePlayerProfileCloud = {
      load: jest.fn(async (userId) => userId === 'user-1' ? profile : { ...profile, userId, displayName: 'Andrew' }),
      save: jest.fn(async () => undefined),
    };
    const { result, rerender } = renderHook<ReturnType<typeof useGamePlayerProfile>, { userId: string | null }>(({ userId }) => useGamePlayerProfile({ userId, fallbackName: '', storage: local, cloud }), {
      initialProps: { userId: 'user-1' },
    });
    await waitFor(() => expect(result.current.profile?.displayName).toBe('Olive'));

    rerender({ userId: 'user-2' });
    expect(result.current.profile).toBeNull();
    await waitFor(() => expect(result.current.profile?.displayName).toBe('Andrew'));

    rerender({ userId: null });
    expect(result.current.profile).toBeNull();
  });

  test('keeps cached identity usable when cloud sync fails', async () => {
    const local = storage();
    local.load = jest.fn(async () => profile);
    const cloud: GamePlayerProfileCloud = {
      load: jest.fn(async () => { throw new Error('offline'); }), save: jest.fn(async () => undefined),
    };
    const { result } = renderHook(() => useGamePlayerProfile({ userId: 'user-1', fallbackName: '', storage: local, cloud }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toEqual(profile);
    expect(result.current.syncError).toMatch(/saved player is available on this device/i);
  });
});
