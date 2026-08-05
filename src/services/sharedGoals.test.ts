jest.mock('./backend/supabaseClient', () => ({
  getSupabaseClient: jest.fn(),
}));

import { getSupabaseClient } from './backend/supabaseClient';
import { listGoalSharing, revokeTargetedGoalInvite } from './sharedGoals';

const getClient = getSupabaseClient as jest.MockedFunction<typeof getSupabaseClient>;

describe('Goal sharing lifecycle projection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('parses only actionable Goal sharing rows in both directions', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [
        {
          direction: 'by_you',
          goal_id: 'goal-1',
          goal_title: 'Walk together',
          access_state: 'pending',
          counterpart_name: 'Blaire',
          counterpart_avatar_url: null,
          invite_id: 'invite-1',
          invite_code: 'private-code',
          counterpart_user_id: 'user-2',
          changed_at: '2026-08-05T01:00:00.000Z',
        },
        {
          direction: 'with_you',
          goal_id: 'goal-2',
          goal_title: 'Run a 5K',
          access_state: 'active',
          counterpart_name: 'Ruth',
          counterpart_avatar_url: 'https://example.test/ruth.jpg',
          invite_id: null,
          invite_code: null,
          counterpart_user_id: 'user-3',
          changed_at: '2026-08-05T02:00:00.000Z',
        },
      ],
      error: null,
    });
    getClient.mockReturnValue({ rpc } as never);

    await expect(listGoalSharing()).resolves.toEqual([
      {
        direction: 'by_you',
        goalId: 'goal-1',
        goalTitle: 'Walk together',
        accessState: 'pending',
        counterpartName: 'Blaire',
        counterpartAvatarUrl: null,
        inviteId: 'invite-1',
        inviteCode: 'private-code',
        counterpartUserId: 'user-2',
        changedAt: '2026-08-05T01:00:00.000Z',
      },
      {
        direction: 'with_you',
        goalId: 'goal-2',
        goalTitle: 'Run a 5K',
        accessState: 'active',
        counterpartName: 'Ruth',
        counterpartAvatarUrl: 'https://example.test/ruth.jpg',
        inviteId: null,
        inviteCode: null,
        counterpartUserId: 'user-3',
        changedAt: '2026-08-05T02:00:00.000Z',
      },
    ]);
    expect(rpc).toHaveBeenCalledWith('get_kwilt_goal_sharing');
  });

  it('revokes a pending invitation through its creator-authorized command', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: { state: 'revoked' }, error: null });
    getClient.mockReturnValue({ rpc } as never);

    await expect(revokeTargetedGoalInvite('invite-1')).resolves.toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith('revoke_kwilt_targeted_goal_invite', {
      p_invite_id: 'invite-1',
    });
  });
});
