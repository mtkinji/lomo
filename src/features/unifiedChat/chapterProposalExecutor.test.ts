import type { ChapterRow } from '../../services/chapters';
import type { UnifiedChatProposal } from './types';
import { applyApprovedChapterProposal, undoAppliedChapterProposal } from './chapterProposalExecutor';

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
