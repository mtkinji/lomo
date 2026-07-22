import type { Activity } from '../../domain/types';
import {
  enrichCreatedActivityLikeQuickAdd,
  resolveChatQuickAddAiActions,
} from './enrichCreatedActivityLikeQuickAdd';

const activity: Activity = {
  id: 'activity-1', goalId: null, title: 'Call school Friday', type: 'task', tags: [], steps: [],
  status: 'planned', forceActual: {}, createdAt: '2026-07-22T12:00:00.000Z',
  updatedAt: '2026-07-22T12:00:00.000Z',
};

describe('Chat Quick Add enrichment', () => {
  test('silently selects every Quick Add AI action available to the user', () => {
    expect(resolveChatQuickAddAiActions(false)).toEqual(['steps', 'triggers', 'details']);
    expect(resolveChatQuickAddAiActions(true)).toEqual(['steps', 'triggers', 'details', 'cover_image']);
  });

  test('uses Quick Add semantics for details, steps, triggers, and an entitled cover', async () => {
    const result = await enrichCreatedActivityLikeQuickAdd({
      activity,
      goals: [],
      arcs: [],
      canUseCoverImage: true,
      locationTriggersEnabled: false,
      dependencies: {
        enrich: jest.fn(async () => ({
          notes: 'Ask about next term.', tags: ['school'], estimateMinutes: 15,
          steps: [{ title: 'Find the office number' }], scheduledDate: '2026-07-24',
          reminderAt: '2026-07-24T15:00:00.000Z', repeatRule: null,
        })),
        findCover: jest.fn(async () => ({ thumbnailUrl: 'https://example.com/school.jpg' })),
        getCurrentLocation: jest.fn(async () => null),
        now: () => '2026-07-22T13:00:00.000Z',
      },
    });

    expect(result).toMatchObject({
      notes: 'Ask about next term.', tags: ['school'], estimateMinutes: 15,
      scheduledDate: '2026-07-24', reminderAt: '2026-07-24T15:00:00.000Z',
      thumbnailUrl: 'https://example.com/school.jpg', updatedAt: '2026-07-22T13:00:00.000Z',
    });
    expect(result.steps).toEqual([expect.objectContaining({ title: 'Find the office number' })]);
  });
});
