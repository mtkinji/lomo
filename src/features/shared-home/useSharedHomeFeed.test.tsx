import { act, renderHook, waitFor } from '@testing-library/react-native';

import type { SharedHomeDelivery } from './sharedHomeTypes';
import { useSharedHomeFeed } from './useSharedHomeFeed';

const item: SharedHomeDelivery = {
  id: 'delivery-1', eventKind: 'game_turn', sourceCapability: 'games',
  sourceEntityType: 'game_session', sourceEntityId: 'room-1', actorDisplayName: 'Mina',
  actorUserId: '10000000-0000-0000-0000-000000000002',
  title: 'Your turn', body: 'Mina passed the pattern to you.',
  destination: { kind: 'game_room', sessionId: 'room-1' }, state: 'pending',
  settledReason: null, createdAt: '2026-08-05T10:00:00.000Z',
  updatedAt: '2026-08-05T10:00:00.000Z', settledAt: null,
  expiresAt: null, retainUntil: '2026-09-04T10:00:00.000Z',
};

function dependencies(options?: { cacheItems?: SharedHomeDelivery[]; networkError?: boolean }) {
  let invalidate: (() => void) | null = null;
  const repository = {
    list: jest.fn(async () => {
      if (options?.networkError) throw new Error('offline');
      return [item];
    }),
    subscribe: jest.fn((_userId: string, callback: () => void) => {
      invalidate = callback;
      return async () => undefined;
    }),
  };
  const cache = {
    load: jest.fn(async () => options?.cacheItems
      ? { savedAt: '2026-08-05T09:00:00.000Z', items: options.cacheItems }
      : null),
    save: jest.fn(async () => undefined),
    remove: jest.fn(async () => undefined),
  };
  return { repository, cache, invalidate: () => invalidate?.() };
}

describe('useSharedHomeFeed', () => {
  it('shows an account cache immediately and replaces it with a fresh result', async () => {
    const deps = dependencies({ cacheItems: [{ ...item, id: 'cached' }] });
    const { result } = renderHook(() => useSharedHomeFeed('user-1', deps));
    await waitFor(() => expect(result.current.items[0]?.id).toBe('delivery-1'));
    expect(result.current.loading).toBe(false);
    expect(result.current.stale).toBe(false);
    expect(deps.cache.save).toHaveBeenCalledWith('user-1', [item]);
  });

  it('keeps cached items and identifies them as stale when refresh fails', async () => {
    const deps = dependencies({ cacheItems: [item], networkError: true });
    const { result } = renderHook(() => useSharedHomeFeed('user-1', deps));
    await waitFor(() => expect(result.current.stale).toBe(true));
    expect(result.current.items).toEqual([item]);
    expect(result.current.error).toBe('Shared activity could not be refreshed.');
  });

  it('refreshes when a recipient-scoped realtime event arrives', async () => {
    const deps = dependencies();
    const { result } = renderHook(() => useSharedHomeFeed('user-1', deps));
    await waitFor(() => expect(deps.repository.list).toHaveBeenCalledTimes(1));
    await act(async () => { deps.invalidate(); });
    await waitFor(() => expect(deps.repository.list).toHaveBeenCalledTimes(2));
    expect(result.current.items).toEqual([item]);
  });

  it('removes the prior account snapshot when the active account changes', async () => {
    const deps = dependencies({ cacheItems: [item] });
    const { rerender } = renderHook<ReturnType<typeof useSharedHomeFeed>, { userId: string | null }>(
      ({ userId }) => useSharedHomeFeed(userId, deps),
      { initialProps: { userId: 'user-1' as string | null } },
    );
    await waitFor(() => expect(deps.repository.list).toHaveBeenCalled());
    rerender({ userId: 'user-2' });
    await waitFor(() => expect(deps.cache.remove).toHaveBeenCalledWith('user-1'));
  });
});
