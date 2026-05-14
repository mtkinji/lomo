import { renderWithProviders } from '../../test/renderWithProviders';
import { GoalFeedSection } from './GoalFeedSection';

const mockFetchGoalFeed = jest.fn();

jest.mock('../../services/goalFeed', () => ({
  fetchGoalFeed: (...args: unknown[]) => mockFetchGoalFeed(...args),
  subscribeToGoalFeed: jest.fn(() => jest.fn()),
}));

jest.mock('../../services/reactions', () => ({
  addReaction: jest.fn(),
  removeReaction: jest.fn(),
  REACTION_TYPES: [
    { id: 'cheer', emoji: '👏', label: 'Cheer' },
  ],
}));

describe('GoalFeedSection', () => {
  beforeEach(() => {
    mockFetchGoalFeed.mockReset();
  });

  it('shows concrete check-in text as the primary feed content instead of the empty state', async () => {
    mockFetchGoalFeed.mockResolvedValue({
      items: [
        {
          id: 'event-1',
          type: 'checkin_submitted',
          actorId: 'owner-1',
          actorName: 'Andrew Watanabe',
          actorAvatarUrl: null,
          createdAt: new Date().toISOString(),
          payload: {
            checkinId: 'checkin-1',
            preset: 'just_checking_in',
            text: 'I finished the workshop outline.',
            hasText: true,
          },
          reactions: { feedEventId: 'event-1', counts: {}, myReaction: null, total: 0 },
        },
      ],
      members: new Map(),
      hasMore: false,
    });

    const { findByText, queryByText } = renderWithProviders(
      <GoalFeedSection goalId="goal-1" />,
    );

    expect(await findByText('I finished the workshop outline.')).toBeTruthy();
    expect(queryByText('Nothing to check in yet')).toBeNull();
    expect(queryByText(/Just checking in/)).toBeNull();
  });
});
