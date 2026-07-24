import type { UnifiedChatClientAction } from './types';
import { prepareClientActionNativeReview } from './prepareClientActionNativeReview';

const checkinAction = (text: unknown): UnifiedChatClientAction => ({
  id: 'action-1', threadId: 'thread-1', runId: 'run-1', messageId: null,
  capabilityId: 'goals', actionType: 'open_goal_checkin', targetType: 'goal', targetId: 'goal-1',
  title: 'Review check-in', consequenceSummary: 'Nothing is sent until review.', payload: { text },
  idempotencyKey: 'one', status: 'pending_client_action', result: null, errorCode: null,
  errorMessage: null, version: 1, presentedAt: null, completedAt: null,
  createdAt: 'before', updatedAt: 'before',
});

test('creates a local Goal check-in draft without publishing it', () => {
  const ensureDraft = jest.fn(() => ({ partnerCircleKey: 'solo', draftText: '' }));
  const setDraftText = jest.fn();
  prepareClientActionNativeReview(checkinAction('  We made progress.  '), {
    getDraft: jest.fn(() => null), ensureDraft, setDraftText,
  });
  expect(ensureDraft).toHaveBeenCalledWith({ goalId: 'goal-1', partnerCircleKey: 'solo' });
  expect(setDraftText).toHaveBeenCalledWith({ goalId: 'goal-1', draftText: 'We made progress.' });
});

test('preserves existing draft content while adding new Chat-authored text', () => {
  const setDraftText = jest.fn();
  prepareClientActionNativeReview(checkinAction('We also finished the forms.'), {
    getDraft: jest.fn(() => ({ partnerCircleKey: 'partner-1', draftText: 'We made progress.' })),
    ensureDraft: jest.fn(() => ({ partnerCircleKey: 'partner-1', draftText: 'We made progress.' })),
    setDraftText,
  });
  expect(setDraftText).toHaveBeenCalledWith({
    goalId: 'goal-1', draftText: 'We made progress.\n\nWe also finished the forms.',
  });
});

test('rejects malformed check-in actions before native navigation', () => {
  expect(() => prepareClientActionNativeReview(checkinAction('   '), {
    getDraft: jest.fn(), ensureDraft: jest.fn(), setDraftText: jest.fn(),
  })).toThrow('valid check-in draft');
});
