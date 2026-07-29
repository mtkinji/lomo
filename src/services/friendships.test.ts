jest.mock('./backend/supabaseClient', () => ({
  getSupabaseClient: jest.fn(),
}));

jest.mock('./backend/auth', () => ({
  getAccessToken: jest.fn(),
}));

jest.mock('./installId', () => ({
  getInstallId: jest.fn().mockResolvedValue('install-1'),
}));

jest.mock('./edgeFunctions', () => ({
  getEdgeFunctionUrl: jest.fn(),
}));

jest.mock('../utils/getEnv', () => ({
  getSupabasePublishableKey: jest.fn(),
}));

import { getSupabaseClient } from './backend/supabaseClient';
import {
  acceptFriendRequest,
  blockFriendship,
  declineFriendRequest,
  endFriendship,
  getPendingFriendRequests,
  listFriends,
  type FriendshipStatus,
} from './friendships';

const getClient = getSupabaseClient as jest.MockedFunction<typeof getSupabaseClient>;

function clientWithRpc(data: unknown = { friendshipId: 'friendship-1', status: 'active' }) {
  const rpc = jest.fn().mockResolvedValue({ data, error: null });
  const from = jest.fn(() => {
    throw new Error('Friendship reads and writes must not use direct table access');
  });
  getClient.mockReturnValue({ rpc, from } as never);
  return { rpc, from };
}

describe('friendship server command boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['accept', acceptFriendRequest],
    ['decline', declineFriendRequest],
    ['end', endFriendship],
    ['block', blockFriendship],
  ] as const)('routes %s through the authenticated transition RPC', async (action, run) => {
    const { rpc, from } = clientWithRpc();

    await expect(run('friendship-1')).resolves.toBe(true);

    expect(rpc).toHaveBeenCalledWith('transition_kwilt_friendship', {
      p_friendship_id: 'friendship-1',
      p_action: action,
    });
    expect(from).not.toHaveBeenCalled();
  });

  it('returns false when the authoritative transition is rejected', async () => {
    const { rpc } = clientWithRpc();
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'friendship_transition_not_allowed' } });

    await expect(endFriendship('friendship-1')).resolves.toBe(false);
  });

  it('reads active Friends from the safe relationship projection', async () => {
    const { rpc, from } = clientWithRpc([
      {
        friendship_id: 'friendship-1',
        friend_user_id: 'user-2',
        relationship_status: 'active',
        initiated_by_me: true,
        incoming_request: false,
        created_at: '2026-07-28T10:00:00.000Z',
        accepted_at: '2026-07-28T10:05:00.000Z',
        display_name: 'Blaire',
        avatar_url: 'https://example.com/blaire.jpg',
      },
      {
        friendship_id: 'friendship-2',
        friend_user_id: 'user-3',
        relationship_status: 'pending',
        initiated_by_me: false,
        incoming_request: true,
        created_at: '2026-07-28T11:00:00.000Z',
        accepted_at: null,
        display_name: 'Ruth',
        avatar_url: null,
      },
    ]);

    await expect(listFriends()).resolves.toEqual([
      {
        id: 'friendship-1',
        friendUserId: 'user-2',
        status: 'active',
        initiatedByMe: true,
        createdAt: '2026-07-28T10:00:00.000Z',
        acceptedAt: '2026-07-28T10:05:00.000Z',
        name: 'Blaire',
        avatarUrl: 'https://example.com/blaire.jpg',
      },
    ]);
    expect(rpc).toHaveBeenCalledWith('get_kwilt_friendships');
    expect(from).not.toHaveBeenCalled();
  });

  it('returns only incoming pending requests from the safe projection', async () => {
    const { rpc } = clientWithRpc([
      {
        friendship_id: 'friendship-1',
        friend_user_id: 'user-2',
        relationship_status: 'pending',
        initiated_by_me: false,
        incoming_request: true,
        created_at: '2026-07-28T11:00:00.000Z',
        accepted_at: null,
        display_name: 'Blaire',
        avatar_url: null,
      },
      {
        friendship_id: 'friendship-2',
        friend_user_id: 'user-3',
        relationship_status: 'pending',
        initiated_by_me: true,
        incoming_request: false,
        created_at: '2026-07-28T12:00:00.000Z',
        accepted_at: null,
        display_name: 'Ruth',
        avatar_url: null,
      },
    ]);

    await expect(getPendingFriendRequests()).resolves.toEqual([
      {
        friendshipId: 'friendship-1',
        fromUserId: 'user-2',
        fromUserName: 'Blaire',
        fromUserAvatarUrl: null,
        createdAt: '2026-07-28T11:00:00.000Z',
      },
    ]);
    expect(rpc).toHaveBeenCalledWith('get_kwilt_friendships');
  });

  it('keeps ended as an explicit domain state', () => {
    const ended: FriendshipStatus = 'ended';
    expect(ended).toBe('ended');
  });
});
