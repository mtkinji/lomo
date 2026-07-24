import type { ChapterRow } from '../../services/chapters';
import type { UnifiedChatMutationReceipt, UnifiedChatProposal } from './types';

type ChapterProposal = Extract<UnifiedChatProposal, { capabilityId: 'chapters' }>;

export type ChapterStoreBoundary = {
  getChapter: (id: string) => Promise<ChapterRow | null>;
  updateNote: (id: string, note: string | null) => Promise<ChapterRow | null>;
};

export type ChapterMutationReceipt = {
  proposalId: string;
  operationId: string;
  idempotencyKey: string;
  resultingObjectId: string;
  resultState: { periodKey: string; note: string | null; updatedAt: string };
  returnTarget: Record<string, unknown>;
  undoOperation: {
    type: 'restore_chapter_note'; note: string | null; previousUpdatedAt: string;
    desiredNote: string | null; expectedUpdatedAt: string | null;
  };
  appliedAt: string;
};

export class ChapterMutationConflictError extends Error {}

const chapterVersion = (chapter: ChapterRow): string => chapter.user_note_updated_at ?? chapter.updated_at;

function validateProposal(proposal: UnifiedChatProposal): asserts proposal is ChapterProposal {
  if (proposal.capabilityId !== 'chapters' || proposal.operation.type !== 'update_chapter_note' ||
      proposal.status !== 'approved') {
    throw new ChapterMutationConflictError('This Chapter proposal is not approved.');
  }
}

function receiptFor(
  proposal: ChapterProposal,
  prior: ChapterRow,
  updated: ChapterRow,
): ChapterMutationReceipt {
  const updatedAt = chapterVersion(updated);
  return {
    proposalId: proposal.id, operationId: proposal.operation.id,
    idempotencyKey: proposal.operation.idempotencyKey, resultingObjectId: updated.id,
    resultState: { periodKey: updated.period_key, note: updated.user_note, updatedAt },
    returnTarget: {
      capabilityId: 'chapters', object: { type: 'chapter', id: updated.id }, label: `Chapter ${updated.period_key}`,
      route: {
        name: 'MainTabs',
        params: { screen: 'MoreTab', params: { screen: 'MoreChapterDetail', params: { chapterId: updated.id } } },
      },
    },
    undoOperation: {
      type: 'restore_chapter_note', note: prior.user_note,
      previousUpdatedAt: chapterVersion(prior), desiredNote: proposal.operation.payload.note,
      expectedUpdatedAt: updatedAt,
    },
    appliedAt: updatedAt,
  };
}

export async function prepareApprovedChapterProposal({ proposal, store }: {
  proposal: UnifiedChatProposal; store: ChapterStoreBoundary;
}): Promise<ChapterMutationReceipt> {
  validateProposal(proposal);
  const current = await store.getChapter(proposal.operation.targetId);
  if (!current || chapterVersion(current) !== proposal.operation.payload.expectedUpdatedAt) {
    throw new ChapterMutationConflictError('The Chapter changed after this proposal was prepared.');
  }
  return {
    ...receiptFor(proposal, current, { ...current, user_note: proposal.operation.payload.note }),
    resultState: {
      periodKey: current.period_key, note: proposal.operation.payload.note,
      updatedAt: proposal.operation.payload.expectedUpdatedAt,
    },
    undoOperation: {
      type: 'restore_chapter_note', note: current.user_note,
      previousUpdatedAt: chapterVersion(current), desiredNote: proposal.operation.payload.note,
      expectedUpdatedAt: null,
    },
    appliedAt: proposal.operation.payload.expectedUpdatedAt,
  };
}

export async function applyApprovedChapterProposal({ proposal, store }: {
  proposal: UnifiedChatProposal; store: ChapterStoreBoundary;
}): Promise<ChapterMutationReceipt> {
  validateProposal(proposal);
  const current = await store.getChapter(proposal.operation.targetId);
  if (!current || chapterVersion(current) !== proposal.operation.payload.expectedUpdatedAt) {
    throw new ChapterMutationConflictError('The Chapter changed after this proposal was prepared.');
  }
  const updated = await store.updateNote(current.id, proposal.operation.payload.note);
  if (!updated) throw new Error('Kwilt could not save that Chapter note.');
  return receiptFor(proposal, current, updated);
}

export async function undoAppliedChapterProposal({ receipt, store }: {
  receipt: ChapterMutationReceipt; store: ChapterStoreBoundary;
}): Promise<{ undoneAt: string }> {
  const current = await store.getChapter(receipt.resultingObjectId);
  if (!current || !receipt.undoOperation.expectedUpdatedAt ||
      chapterVersion(current) !== receipt.undoOperation.expectedUpdatedAt) {
    throw new ChapterMutationConflictError('The Chapter changed after apply, so Kwilt will not overwrite it during undo.');
  }
  const restored = await store.updateNote(current.id, receipt.undoOperation.note);
  if (!restored) throw new Error('Kwilt could not restore that Chapter note.');
  return { undoneAt: chapterVersion(restored) };
}

export function hydrateChapterMutationReceipt(stored: UnifiedChatMutationReceipt): ChapterMutationReceipt | null {
  const undo = stored.undoOperation;
  const state = stored.resultState;
  if (stored.capabilityId !== 'chapters' || stored.status !== 'applied' ||
      undo?.type !== 'restore_chapter_note' ||
      (undo.note !== null && typeof undo.note !== 'string') ||
      (undo.desiredNote !== null && typeof undo.desiredNote !== 'string') ||
      typeof undo.previousUpdatedAt !== 'string' || typeof undo.expectedUpdatedAt !== 'string' ||
      typeof state.periodKey !== 'string' || typeof state.updatedAt !== 'string') return null;
  return {
    proposalId: stored.proposalId, operationId: stored.operationId,
    idempotencyKey: stored.idempotencyKey, resultingObjectId: stored.resultingObjectId ?? '',
    resultState: {
      periodKey: state.periodKey, note: typeof state.note === 'string' ? state.note : null, updatedAt: state.updatedAt,
    },
    returnTarget: stored.returnTarget ?? {},
    undoOperation: {
      type: 'restore_chapter_note', note: undo.note as string | null,
      previousUpdatedAt: undo.previousUpdatedAt, desiredNote: undo.desiredNote as string | null,
      expectedUpdatedAt: undo.expectedUpdatedAt,
    },
    appliedAt: stored.appliedAt ?? state.updatedAt,
  };
}

export async function recoverReservedChapterProposal({ receipt, proposal, store }: {
  receipt: UnifiedChatMutationReceipt; proposal: UnifiedChatProposal; store: ChapterStoreBoundary;
}): Promise<ChapterMutationReceipt> {
  const approved = { ...proposal, status: 'approved' as const };
  validateProposal(approved);
  const undo = receipt.undoOperation;
  if (receipt.status !== 'reserved' || undo?.type !== 'restore_chapter_note' ||
      typeof undo.previousUpdatedAt !== 'string' ||
      (undo.note !== null && typeof undo.note !== 'string') ||
      (undo.desiredNote !== null && typeof undo.desiredNote !== 'string')) {
    throw new ChapterMutationConflictError('This Chapter receipt cannot be recovered safely.');
  }
  const current = await store.getChapter(approved.operation.targetId);
  if (!current) throw new ChapterMutationConflictError('The Chapter is no longer available.');
  const version = chapterVersion(current);
  if (version === undo.previousUpdatedAt) {
    return applyApprovedChapterProposal({ proposal: approved, store });
  }
  if (current.user_note !== undo.desiredNote) {
    throw new ChapterMutationConflictError('The Chapter changed after this proposal was prepared.');
  }
  const prior = { ...current, user_note: undo.note as string | null, user_note_updated_at: undo.previousUpdatedAt };
  return receiptFor(approved, prior, current);
}
