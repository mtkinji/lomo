const mockRpc = jest.fn();
const mockInvoke = jest.fn();
const mockGetSession = jest.fn();
const mockSignInAnonymously = jest.fn();
const mockTrack = jest.fn();
const channel: { on?: jest.Mock; subscribe?: jest.Mock; track: jest.Mock } = { track: mockTrack };
const mockOn = jest.fn(() => channel);
const mockSubscribe = jest.fn((callback?: (status: string) => void) => { callback?.('SUBSCRIBED'); return channel; });
channel.on = mockOn;
channel.subscribe = mockSubscribe;
const mockChannel = jest.fn(() => channel);

jest.mock('@/src/capabilities/games/platform/supabase', () => ({
  getGamesSupabaseClient: () => ({
    auth: { getSession: mockGetSession, signInAnonymously: mockSignInAnonymously },
    rpc: mockRpc,
    functions: { invoke: mockInvoke },
    channel: mockChannel,
  }),
}));

import {
  createOpenGameTableInvite,
  createOpenSlanguageTable,
  loadRemoteSlanguageRoom,
  submitRemoteSlanguageCommand,
  subscribeToSlanguageRoom,
} from '../remoteSlanguageClient';

describe('Slanguage room client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockSignInAnonymously.mockResolvedValue({ data: { session: { user: { id: 'anon-host' } } }, error: null });
  });

  test('creates an anonymous open table and generic invite', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: 'room-1', error: null })
      .mockResolvedValueOnce({ data: [{ token: 'secret', short_code: 'ABC123', expires_at: '2099-01-01' }], error: null });

    await expect(createOpenSlanguageTable('Andrew')).resolves.toEqual({ sessionId: 'room-1', userId: 'anon-host' });
    await expect(createOpenGameTableInvite('room-1')).resolves.toEqual({ token: 'secret', code: 'ABC123', expiresAt: '2099-01-01' });
    expect(mockRpc).toHaveBeenNthCalledWith(1, 'create_open_slanguage_table', { p_host_name: 'Andrew', p_capacity: 8 });
    expect(mockRpc).toHaveBeenNthCalledWith(2, 'create_open_game_table_invite', { p_session_id: 'room-1' });
  });

  test('loads a private view and sends versioned commands', async () => {
    const room = { id: 'room-1', stateVersion: 3 };
    mockInvoke.mockResolvedValueOnce({ data: { room }, error: null }).mockResolvedValueOnce({ data: { room: { ...room, stateVersion: 4 } }, error: null });

    await expect(loadRemoteSlanguageRoom('room-1')).resolves.toEqual(room);
    await expect(submitRemoteSlanguageCommand({
      sessionId: 'room-1', action: { type: 'submit_translation', placements: { energy: 'energy-hyped' } }, expectedStateVersion: 3, idempotencyKey: 'move-1',
    })).resolves.toEqual({ ...room, stateVersion: 4 });
    expect(mockInvoke).toHaveBeenNthCalledWith(1, 'remote-slanguage-command', { body: { sessionId: 'room-1', actionType: 'view' } });
    expect(mockInvoke).toHaveBeenNthCalledWith(2, 'remote-slanguage-command', { body: {
      sessionId: 'room-1', actionType: 'submit_translation', placements: { energy: 'energy-hyped' }, expectedStateVersion: 3, idempotencyKey: 'move-1',
    } });
  });

  test('subscribes to the private room channel', () => {
    const invalidate = jest.fn();
    subscribeToSlanguageRoom('room-1', invalidate);
    expect(mockChannel).toHaveBeenCalledWith('game:room-1', { config: { private: true, presence: { key: 'room-1' } } });
    expect(mockOn).toHaveBeenCalledWith('broadcast', { event: 'state_changed' }, invalidate);
    expect(mockTrack).toHaveBeenCalled();
  });
});
