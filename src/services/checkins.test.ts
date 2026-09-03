import { getCheckinAudienceForGoal, submitCheckin } from './checkins';

const mockGetUser = jest.fn();
const mockInvoke = jest.fn();
const mockGoalCheckinSingle = jest.fn();
const mockFeedInsert = jest.fn();
let mockMembersData: Array<{ user_id: string }> | null = null;
let mockMembersError: Error | null = null;

jest.mock('./backend/supabaseClient', () => ({
  getSupabaseClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: jest.fn((table: string) => {
      if (table === 'goal_checkins') {
        const query = {
          insert: jest.fn(),
          select: jest.fn(),
          single: mockGoalCheckinSingle,
        };
        query.insert.mockReturnValue(query);
        query.select.mockReturnValue(query);
        return query;
      }
      if (table === 'kwilt_feed_events') {
        return { insert: mockFeedInsert };
      }
      const query = {
        select: jest.fn(),
        eq: jest.fn(),
        then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
          Promise.resolve({ data: mockMembersData, error: mockMembersError }).then(resolve, reject),
      };
      query.select.mockReturnValue(query);
      query.eq.mockReturnValue(query);
      return query;
    }),
    functions: { invoke: mockInvoke },
  }),
}));

describe('getCheckinAudienceForGoal', () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockMembersData = null;
    mockMembersError = null;
    mockInvoke.mockReset();
    mockGoalCheckinSingle.mockReset();
    mockFeedInsert.mockReset();
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

describe('submitCheckin Shared Home publishing', () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockInvoke.mockReset();
    mockGoalCheckinSingle.mockReset();
    mockFeedInsert.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockGoalCheckinSingle.mockResolvedValue({
      data: {
        id: 'checkin-1', goal_id: 'goal-1', user_id: 'user-1',
        preset: 'made_progress', text: 'We made a shortlist.',
        created_at: '2026-08-05T12:00:00.000Z',
      },
      error: null,
    });
    mockFeedInsert.mockResolvedValue({ error: null });
    mockInvoke.mockResolvedValue({ data: { created: 1 }, error: null });
  });

  it('asks the server to project a successful check-in into Shared Home', async () => {
    await submitCheckin({ goalId: 'goal-1', preset: 'made_progress', text: 'We made a shortlist.' });

    expect(mockInvoke).toHaveBeenCalledWith('shared-home-publish-goal-checkin', {
      body: { checkinId: 'checkin-1' },
    });
  });

  it('keeps the authoritative check-in successful when Home publishing fails', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error('publisher unavailable') });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(submitCheckin({ goalId: 'goal-1', preset: 'made_progress' })).resolves.toMatchObject({
      id: 'checkin-1',
      goalId: 'goal-1',
    });
    expect(warn).toHaveBeenCalledWith(
      '[checkins] Failed to publish Shared Home item:',
      'publisher unavailable',
    );
    warn.mockRestore();
  });

  it('returns calm actionable copy when shared text is filtered', async () => {
    mockGoalCheckinSingle.mockResolvedValue({ data: null, error: { code: '22023', message: 'shared_text_not_allowed' } });
    await expect(submitCheckin({ goalId: 'goal-1', text: 'blocked text' })).rejects.toThrow(
      'That wording can’t be shared. Change it and try again.',
    );
  });
});
