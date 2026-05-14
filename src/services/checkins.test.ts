import { getCheckinAudienceForGoal } from './checkins';

const mockGetUser = jest.fn();
let mockMembersData: Array<{ user_id: string }> | null = null;
let mockMembersError: Error | null = null;

jest.mock('./backend/supabaseClient', () => ({
  getSupabaseClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: jest.fn(() => {
      const query: any = {
        select: jest.fn(() => query),
        eq: jest.fn(() => query),
        then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
          Promise.resolve({ data: mockMembersData, error: mockMembersError }).then(resolve, reject),
      };
      return query;
    }),
  }),
}));

describe('getCheckinAudienceForGoal', () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockMembersData = null;
    mockMembersError = null;
  });

  it('rejects owner-only goals so completion progress does not prompt a check-in to nobody', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'owner-1' } }, error: null });
    mockMembersData = [{ user_id: 'owner-1' }];

    const result = await getCheckinAudienceForGoal('goal-1');

    expect(result).toMatchObject({
      eligible: false,
      reason: 'no_partners',
      currentUserId: 'owner-1',
      memberUserIds: ['owner-1'],
      partnerUserIds: [],
    });
  });

  it('allows a nudge when the current user has at least one partner on the goal', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'owner-1' } }, error: null });
    mockMembersData = [{ user_id: 'owner-1' }, { user_id: 'partner-1' }];

    const result = await getCheckinAudienceForGoal('goal-1');

    expect(result).toMatchObject({
      eligible: true,
      currentUserId: 'owner-1',
      memberUserIds: ['owner-1', 'partner-1'],
      partnerUserIds: ['partner-1'],
      partnerCircleKey: 'owner-1|partner-1',
    });
  });

  it('rejects users who are not active members of the goal', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'owner-1' } }, error: null });
    mockMembersData = [{ user_id: 'partner-1' }];

    const result = await getCheckinAudienceForGoal('goal-1');

    expect(result).toMatchObject({
      eligible: false,
      reason: 'not_a_member',
      currentUserId: 'owner-1',
      partnerUserIds: ['partner-1'],
    });
  });
});
