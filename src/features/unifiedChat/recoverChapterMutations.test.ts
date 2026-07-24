import type { ChapterRow } from '../../services/chapters';
import type { UnifiedChatProposal, UnifiedChatThreadAggregate } from './types';
import { recoverChapterMutations } from './recoverChapterMutations';

test('finalizes an already-applied reserved Chapter note without writing twice', async () => {
  const chapter = {
    id: 'chapter-1', user_id: 'user-1', template_id: 'template-1', period_start: '2026-07-13',
    period_end: '2026-07-20', period_key: '2026-W29', input_summary: {}, metrics: {}, output_json: {},
    status: 'ready', error: null, emailed_at: null, user_note: 'Sleep mattered.', user_note_updated_at: 'applied',
    created_at: 'before', updated_at: 'before',
  } satisfies ChapterRow;
  const proposal = {
    id: 'proposal-chapter', threadId: 'thread-1', runId: 'run-1', messageId: null,
    capabilityId: 'chapters', title: 'Add a line', body: 'Reviews note.', status: 'applying',
    version: 3, createdAt: 'now', updatedAt: 'now',
    operation: {
      id: 'operation-chapter', proposalId: 'proposal-chapter', capabilityId: 'chapters', type: 'update_chapter_note',
      targetId: chapter.id, summary: 'Add a line', idempotencyKey: 'chapter-1', sequence: 1,
      payload: { note: chapter.user_note, expectedUpdatedAt: 'before' },
    },
  } as UnifiedChatProposal;
  const aggregate = {
    thread: { id: 'thread-1', title: 'Chat', titleSource: 'default', status: 'active', archivedAt: null, createdAt: 'now', updatedAt: 'now' },
    messages: [], runs: [], proposals: [proposal], receipts: [{
      id: 'receipt-chapter', proposalId: proposal.id, operationId: proposal.operation.id,
      capabilityId: 'chapters', idempotencyKey: 'chapter-1', status: 'reserved',
      resultingObjectType: 'chapter', resultingObjectId: chapter.id,
      resultState: { periodKey: chapter.period_key, note: chapter.user_note, updatedAt: 'before' }, returnTarget: {},
      undoOperation: {
        type: 'restore_chapter_note', note: null, previousUpdatedAt: 'before',
        desiredNote: chapter.user_note, expectedUpdatedAt: null,
      },
      canUndo: false, appliedAt: null, undoneAt: null,
    }],
  } as UnifiedChatThreadAggregate;
  const loaded = { ...aggregate, proposals: [{ ...proposal, status: 'applied' as const }] } as UnifiedChatThreadAggregate;
  const repository = {
    finalizeMutationReceipt: jest.fn(async () => ({})), failMutationReceipt: jest.fn(),
    transitionProposalStatus: jest.fn(async () => ({})), loadThread: jest.fn(async () => loaded),
  };
  const store = { getChapter: async () => chapter, updateNote: jest.fn() };

  await expect(recoverChapterMutations({ aggregate, repository: repository as never, store })).resolves.toBe(loaded);
  expect(store.updateNote).not.toHaveBeenCalled();
  expect(repository.finalizeMutationReceipt).toHaveBeenCalledWith(
    'receipt-chapter', expect.objectContaining({ appliedAt: 'applied' }),
  );
});

test('fails recovery instead of overwriting a Chapter note changed elsewhere', async () => {
  const current = {
    id: 'chapter-1', user_id: 'user-1', template_id: 'template-1', period_start: '2026-07-13',
    period_end: '2026-07-20', period_key: '2026-W29', input_summary: {}, metrics: {}, output_json: {},
    status: 'ready', error: null, emailed_at: null, user_note: 'A different reflection.', user_note_updated_at: 'other',
    created_at: 'before', updated_at: 'before',
  } satisfies ChapterRow;
  const proposal = {
    id: 'proposal-chapter', threadId: 'thread-1', runId: 'run-1', messageId: null,
    capabilityId: 'chapters', title: 'Add a line', body: 'Reviews note.', status: 'applying',
    version: 3, createdAt: 'now', updatedAt: 'now',
    operation: {
      id: 'operation-chapter', proposalId: 'proposal-chapter', capabilityId: 'chapters', type: 'update_chapter_note',
      targetId: current.id, summary: 'Add a line', idempotencyKey: 'chapter-1', sequence: 1,
      payload: { note: 'Sleep mattered.', expectedUpdatedAt: 'before' },
    },
  } as UnifiedChatProposal;
  const aggregate = {
    thread: { id: 'thread-1', title: 'Chat', titleSource: 'default', status: 'active', archivedAt: null, createdAt: 'now', updatedAt: 'now' },
    messages: [], runs: [], proposals: [proposal], receipts: [{
      id: 'receipt-chapter', proposalId: proposal.id, operationId: proposal.operation.id,
      capabilityId: 'chapters', idempotencyKey: 'chapter-1', status: 'reserved',
      resultingObjectType: 'chapter', resultingObjectId: current.id,
      resultState: { periodKey: current.period_key, note: 'Sleep mattered.', updatedAt: 'before' }, returnTarget: {},
      undoOperation: {
        type: 'restore_chapter_note', note: null, previousUpdatedAt: 'before',
        desiredNote: 'Sleep mattered.', expectedUpdatedAt: null,
      }, canUndo: false, appliedAt: null, undoneAt: null,
    }],
  } as UnifiedChatThreadAggregate;
  const loaded = { ...aggregate, proposals: [{ ...proposal, status: 'failed' as const }] } as UnifiedChatThreadAggregate;
  const repository = {
    finalizeMutationReceipt: jest.fn(), failMutationReceipt: jest.fn(async () => ({})),
    transitionProposalStatus: jest.fn(async () => ({})), loadThread: jest.fn(async () => loaded),
  };
  const store = { getChapter: async () => current, updateNote: jest.fn() };

  await expect(recoverChapterMutations({ aggregate, repository: repository as never, store })).resolves.toBe(loaded);
  expect(store.updateNote).not.toHaveBeenCalled();
  expect(repository.failMutationReceipt).toHaveBeenCalledWith(
    'receipt-chapter', 'chapter_recovery_conflict', 'The Chapter changed after this proposal was prepared.',
  );
});
