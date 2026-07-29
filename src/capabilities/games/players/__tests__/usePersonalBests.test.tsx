jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined) },
}));
jest.mock('@/src/capabilities/games/platform/supabase', () => ({ getGamesSupabaseClient: jest.fn() }));

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { usePersonalBests, type PersonalBestCloud, type PersonalBestStorage } from '../usePersonalBests';
import type { PersonalBest } from '../personalBests';

const olderBest: PersonalBest = {
  playerKey: 'saved:charlie', gameKey: 'bank', score: 300,
  achievedAt: '2026-07-18T20:00:00.000Z', updatedAt: '2026-07-18T20:00:00.000Z',
};

describe('usePersonalBests', () => {
  test('records scores locally and only reports stable players', async () => {
    const storage: PersonalBestStorage = { load: jest.fn(async () => []), save: jest.fn(async () => undefined) };
    const { result } = renderHook(() => usePersonalBests({ storage, now: () => '2026-07-19T20:00:00.000Z' }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcomes: ReturnType<typeof result.current.recordGame> = [];
    act(() => {
      outcomes = result.current.recordGame('bank', [
        { savedPlayerId: 'charlie', displayName: 'Charlie', score: 420 },
        { displayName: 'Guest', score: 900 },
      ]);
    });

    expect(outcomes).toHaveLength(1);
    expect(result.current.bestFor('bank', { savedPlayerId: 'charlie', displayName: 'Charlie' })).toBe(420);
    await waitFor(() => expect(storage.save).toHaveBeenCalledWith([expect.objectContaining({ playerKey: 'saved:charlie', score: 420 })]));
  });

  test('merges cloud and device records without lowering either best', async () => {
    const local = [{ ...olderBest, score: 500 }];
    const storage: PersonalBestStorage = { load: jest.fn(async () => local), save: jest.fn(async () => undefined) };
    const cloud: PersonalBestCloud = { load: jest.fn(async () => [olderBest]), save: jest.fn(async () => undefined) };
    const { result } = renderHook(() => usePersonalBests({ storage, cloud, userId: 'owner-1' }));

    await waitFor(() => expect(result.current.syncing).toBe(false));
    expect(result.current.bestFor('bank', { savedPlayerId: 'charlie', displayName: 'Charlie' })).toBe(500);
    expect(cloud.save).toHaveBeenCalledWith('owner-1', local);
  });
});
