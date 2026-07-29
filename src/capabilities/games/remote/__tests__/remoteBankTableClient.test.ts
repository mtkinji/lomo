const mockRpc = jest.fn();
const mockGetSession = jest.fn();
const mockSignInAnonymously = jest.fn();
const mockSend = jest.fn();
const mockRemoveChannel = jest.fn();
const mockSubscribe = jest.fn((callback?: (status: string) => void) => {
  callback?.('SUBSCRIBED');
  return { send: mockSend };
});
const mockChannel = jest.fn(() => ({ subscribe: mockSubscribe, send: mockSend }));

jest.mock('@/src/capabilities/games/platform/supabase', () => ({
  getGamesSupabaseClient: () => ({
    auth: { getSession: mockGetSession, signInAnonymously: mockSignInAnonymously },
    rpc: mockRpc,
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  }),
}));

import {
  claimRemoteBankTableInvite,
  createRemoteBankTable,
  createRemoteBankTableInvite,
  removeRemoteBankTableParticipant,
  startRemoteBankTable,
} from '../remoteBankClient';

describe('open Bank table client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignInAnonymously.mockResolvedValue({ data: { session: { user: { id: 'anon-host' } } }, error: null });
    mockRpc.mockResolvedValue({ data: null, error: null });
    mockSend.mockResolvedValue('ok');
    mockRemoveChannel.mockResolvedValue(undefined);
  });

  it('creates one anonymous-hosted lobby from only the people staying on the host phone', async () => {
    mockRpc.mockResolvedValueOnce({ data: 'room-1', error: null });

    await expect(createRemoteBankTable(['Andrew'], 'anyone', 6)).resolves.toEqual({ sessionId: 'room-1', userId: 'anon-host' });

    expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith('create_open_bank_table', {
      p_names: ['Andrew'],
      p_banking_rule: 'anyone',
      p_capacity: 6,
    });
  });

  it('creates one reusable invitation for the remaining table capacity', async () => {
    mockRpc.mockResolvedValueOnce({ data: [{ token: 'private-token', short_code: 'W7K4JP', expires_at: '2099-01-01' }], error: null });

    await expect(createRemoteBankTableInvite('room-1')).resolves.toEqual({
      token: 'private-token', code: 'W7K4JP', expiresAt: '2099-01-01',
    });
    expect(mockRpc).toHaveBeenCalledWith('create_open_game_table_invite', { p_session_id: 'room-1' });
  });

  it('lets a joiner name themselves and claim the next seat', async () => {
    mockRpc.mockResolvedValueOnce({ data: [{ session_id: 'room-1', participant_id: 'seat-2', table_code: 'W7K4JP', game_key: 'bank' }], error: null });

    await expect(claimRemoteBankTableInvite({ token: 'private-token', displayName: 'Olive' })).resolves.toEqual({
      sessionId: 'room-1', participantId: 'seat-2', tableCode: 'W7K4JP', gameKey: 'bank',
    });
    expect(mockRpc).toHaveBeenCalledWith('claim_open_game_table', {
      p_token: 'private-token', p_short_code: null, p_display_name: 'Olive',
    });
    expect(mockSend).toHaveBeenCalledWith({ type: 'broadcast', event: 'state_changed', payload: { reason: 'participant_joined' } });
  });

  it('starts and removes participants through host-only RPCs', async () => {
    await startRemoteBankTable('room-1');
    await removeRemoteBankTableParticipant('room-1', 'seat-3');

    expect(mockRpc).toHaveBeenNthCalledWith(1, 'start_open_bank_table', { p_session_id: 'room-1' });
    expect(mockRpc).toHaveBeenNthCalledWith(2, 'remove_open_game_table_participant', { p_session_id: 'room-1', p_participant_id: 'seat-3' });
  });
});
