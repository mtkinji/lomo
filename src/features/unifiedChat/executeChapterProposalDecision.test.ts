import type { ChapterRow } from '../../services/chapters';
import type { UnifiedChatMutationReceipt, UnifiedChatProposal } from './types';
import { executeChapterProposalDecision } from './executeChapterProposalDecision';

test('reserves Chapter undo before calling the authoritative update service', async () => {
  let chapter: ChapterRow = {
    id: 'chapter-1', user_id: 'user-1', template_id: 'template-1', period_start: '2026-07-13',
    period_end: '2026-07-20', period_key: '2026-W29', input_summary: {}, metrics: {}, output_json: {},
    status: 'ready', error: null, emailed_at: null, user_note: null, user_note_updated_at: null,
    created_at: 'before', updated_at: 'before',
  };
  const proposal = {
    id: 'proposal-chapter', threadId: 'thread-1', runId: 'run-1', messageId: 'message-1',
    capabilityId: 'chapters', title: 'Add a line', body: 'Reviews note.', status: 'pending',
    version: 1, createdAt: 'now', updatedAt: 'now',
    operation: {
      id: 'operation-chapter', proposalId: 'proposal-chapter', capabilityId: 'chapters', type: 'update_chapter_note',
      targetId: chapter.id, summary: 'Add a line', idempotencyKey: 'chapter-1', sequence: 1,
      payload: { note: 'Sleep mattered.', expectedUpdatedAt: 'before' },
    },
  } as Extract<UnifiedChatProposal, { capabilityId: 'chapters' }>;
  const receipt = (status: UnifiedChatMutationReceipt['status']): UnifiedChatMutationReceipt => ({
    id: 'receipt-chapter', proposalId: proposal.id, operationId: proposal.operation.id,
    capabilityId: 'chapters', idempotencyKey: 'chapter-1', status,
    resultingObjectType: 'chapter', resultingObjectId: chapter.id, resultState: {}, returnTarget: null,
    undoOperation: null, canUndo: false, appliedAt: null, undoneAt: null,
  });
  const repository = {
    decideProposal: jest.fn(async () => ({ id: proposal.id, status: 'approved' as const, version: 2 })),
    transitionProposalStatus: jest.fn(async ({ toStatus, expectedVersion }: { toStatus: UnifiedChatProposal['status']; expectedVersion: number }) => ({ status: toStatus, version: expectedVersion + 1 })),
    persistMutationReceipt: jest.fn(async () => receipt('reserved')),
    finalizeMutationReceipt: jest.fn(async () => receipt('applied')),
  };
  const store = {
    getChapter: async () => chapter,
    updateNote: jest.fn(async (_id: string, note: string | null) => {
      chapter = { ...chapter, user_note: note, user_note_updated_at: 'applied' };
      return chapter;
    }),
  };

  await executeChapterProposalDecision({ proposal, action: 'approve', repository, store });
  expect(repository.persistMutationReceipt).toHaveBeenCalledWith(expect.objectContaining({
    status: 'reserved', undoOperation: expect.objectContaining({
      type: 'restore_chapter_note', note: null, previousUpdatedAt: 'before', expectedUpdatedAt: null,
    }),
  }));
  expect(repository.persistMutationReceipt.mock.invocationCallOrder[0])
    .toBeLessThan(store.updateNote.mock.invocationCallOrder[0]);
  expect(repository.finalizeMutationReceipt).toHaveBeenCalledWith(
    'receipt-chapter', expect.objectContaining({ appliedAt: 'applied' }),
  );
});
