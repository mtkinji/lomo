const mockRoom = {
  id: 'room-1', hostUserId: 'u1', status: 'active', stateVersion: 1, expiresAt: '2099-01-01',
  state: { difficulty: 'gentle', playerCount: 2, playerIndex: 0, phase: 'handoff', pattern: ['coral', 'pine'], answer: [], success: null, watchSequence: 0 },
  participants: [{ id: 'p1', seatIndex: 0, displayName: 'Ada', userId: 'u1', controllerUserId: 'u1', joinStatus: 'joined' }],
};
const mockLoad = jest.fn(async (_sessionId?: string) => mockRoom);
const mockSubmit = jest.fn(async (_input?: unknown) => ({ state: { ...mockRoom.state, phase: 'watch', watchSequence: 1 }, stateVersion: 2, duplicate: false }));
const mockRemoveChannel = jest.fn();
const mockChannel = {};

jest.mock('../remotePassPatternClient', () => ({
  loadRemotePassPatternRoom: (sessionId: string) => mockLoad(sessionId),
  submitRemotePassPatternCommand: (input: unknown) => mockSubmit(input),
  subscribeToRemotePassPatternRoom: () => mockChannel,
}));
jest.mock('@/src/capabilities/games/platform/supabase', () => ({ getGamesSupabaseClient: () => ({ removeChannel: mockRemoveChannel }) }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'command-1' }));

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useRemotePassPatternRoom } from '../useRemotePassPatternRoom';

describe('useRemotePassPatternRoom', () => {
  beforeEach(() => { mockLoad.mockClear(); mockSubmit.mockClear(); mockRemoveChannel.mockClear(); });

  it('loads canonical room state and submits versioned actions', async () => {
    const { result } = renderHook(() => useRemotePassPatternRoom('room-1'));
    await waitFor(() => expect(result.current.room?.id).toBe('room-1'));

    await act(async () => { await result.current.command('p1', { type: 'ready' }); });
    expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 'room-1', participantId: 'p1', expectedStateVersion: 1, idempotencyKey: 'command-1', action: { type: 'ready' } }));
    expect(result.current.room?.state).toMatchObject({ phase: 'watch', watchSequence: 1 });
  });
});
