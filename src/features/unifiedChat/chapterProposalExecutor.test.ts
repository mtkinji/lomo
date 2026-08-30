import type { ChapterRow } from '../../services/chapters';
import type { UnifiedChatProposal } from './types';
import { applyApprovedChapterProposal, recoverReservedChapterProposal, undoAppliedChapterProposal } from './chapterProposalExecutor';

const before: ChapterRow = {
  id: 'chapter-1', user_id: 'user-1', template_id: 'template-1', period_start: '2026-07-13',
  period_end: '2026-07-20', period_key: '2026-W29', input_summary: {}, metrics: {}, output_json: {},
  status: 'ready', error: null, emailed_at: null, user_note: null, user_note_updated_at: null,
  created_at: 'before', updated_at: 'before',
};

test('updates a Chapter note through the authoritative service and restores it through undo', async () => {
  let chapter = before;
  const store = {
    getChapter: async () => chapter,
    updateNote: async (_id: string, note: string | null) => {
      chapter = { ...chapter, user_note: note, user_note_updated_at: note ? 'applied' : 'undone' };
      return chapter;
    },
  };
  const proposal = {
    id: 'proposal-chapter', threadId: 'thread-1', runId: 'run-1', messageId: null,
    capabilityId: 'chapters', title: 'Add a line to your Chapter', body: 'Reviews the note.',
    status: 'approved', version: 2, createdAt: 'now', updatedAt: 'now',
    operation: {
      id: 'operation-chapter', proposalId: 'proposal-chapter', capabilityId: 'chapters', type: 'update_chapter_note',
      targetId: before.id, summary: 'Update Chapter note', idempotencyKey: 'chapter-1', sequence: 1,
      payload: { note: 'Sleep mattered.', expectedUpdatedAt: before.updated_at },
    },
  } as UnifiedChatProposal;

  const receipt = await applyApprovedChapterProposal({ proposal, store });
  expect(chapter.user_note).toBe('Sleep mattered.');
  expect(receipt.undoOperation).toMatchObject({ type: 'restore_chapter_note', expectedUpdatedAt: 'applied' });
  await undoAppliedChapterProposal({ receipt, store });
  expect(chapter.user_note).toBeNull();
});

test('applies an exact Chapter alignment and restores prior Goal assignments through undo', async () => {
  const alignedChapter: ChapterRow = {
    ...before,
    output_json: { recommendations: [{
      id: 'align-1', kind: 'align', reason: 'These belong together.',
      payload: { goalId: 'goal-1', goalTitle: 'Launch', arcId: null, arcTitle: null, activityIds: ['activity-1'] },
    }] },
  };
  let activities: Array<{ id: string; title: string; goalId: string | null; updatedAt: string }> = [
    { id: 'activity-1', title: 'Polish onboarding', goalId: null, updatedAt: 'activity-v1' },
  ];
  let updateCount = 0;
  const store = {
    getChapter: async () => alignedChapter,
    updateNote: async () => alignedChapter,
    getActivities: () => activities as never,
    getGoals: () => [{ id: 'goal-1', title: 'Launch' }] as never,
    updateActivityGoal: (id: string, goalId: string | null) => {
      updateCount += 1;
      activities = activities.map((activity) => activity.id === id
        ? { ...activity, goalId, updatedAt: `${activity.updatedAt}-next` }
        : activity);
    },
  };
  const proposal = {
    id: 'proposal-align', threadId: 'thread-1', runId: 'run-1', messageId: null,
    capabilityId: 'chapters', title: 'Tag one To-do', body: 'Reviews the alignment.',
    status: 'approved', version: 2, createdAt: 'now', updatedAt: 'now',
    operation: {
      id: 'operation-align', proposalId: 'proposal-align', capabilityId: 'chapters', type: 'apply_chapter_alignment',
      targetId: before.id, summary: 'Align Chapter To-do', idempotencyKey: 'align-1', sequence: 1,
      payload: {
        recommendationId: 'align-1', expectedUpdatedAt: before.updated_at,
        activities: [{ activityId: 'activity-1', expectedUpdatedAt: 'activity-v1' }],
      },
    },
  } as UnifiedChatProposal;

  const receipt = await applyApprovedChapterProposal({ proposal, store });
  expect(activities[0]?.goalId).toBe('goal-1');
  const recovered = await recoverReservedChapterProposal({
    receipt: { ...receipt, status: 'reserved' } as never, proposal, store,
  });
  expect(recovered.resultState).toMatchObject({ goalId: 'goal-1', activityIds: ['activity-1'] });
  expect(updateCount).toBe(1);
  await undoAppliedChapterProposal({ receipt, store });
  expect(activities[0]?.goalId).toBeNull();
});
