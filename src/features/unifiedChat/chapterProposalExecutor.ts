import type { ChapterRow } from '../../services/chapters';
import type { Activity, Goal } from '../../domain/types';
import { chapterUpdatedAt, updateChapterNote } from '../../capabilities/life-structure/actions/chapterActions';
import { applyChapterAlignment } from '../../capabilities/life-structure/actions/chapterAlignmentActions';
import {
  applyChapterDigestSettingsUpdate,
  type ChapterDigestSettingsPatch,
  type ChapterDigestSettingsSource,
} from '../../capabilities/life-structure/actions/chapterDigestSettingsActions';
import type { UnifiedChatMutationReceipt, UnifiedChatProposal } from './types';

type ChapterProposal = Extract<UnifiedChatProposal, { capabilityId: 'chapters' }>;

export type ChapterStoreBoundary = {
  getChapter: (id: string) => Promise<ChapterRow | null>;
  updateNote: (id: string, note: string | null) => Promise<ChapterRow | null>;
  getActivities?: () => readonly Activity[];
  getGoals?: () => readonly Goal[];
  updateActivityGoal?: (id: string, goalId: string | null) => void;
  getDigestSettings?: () => Promise<ChapterDigestSettingsSource | null>;
  updateDigestSettings?: (input: ChapterDigestSettingsPatch & { expectedUpdatedAt: string }) => Promise<ChapterDigestSettingsSource | null>;
};

export type ChapterMutationReceipt = {
  proposalId: string;
  operationId: string;
  idempotencyKey: string;
  resultingObjectId: string;
  resultState: Record<string, unknown> & { updatedAt: string };
  returnTarget: Record<string, unknown>;
  undoOperation: {
    type: 'restore_chapter_note'; note: string | null; previousUpdatedAt: string;
    desiredNote: string | null; expectedUpdatedAt: string | null;
  } | {
    type: 'restore_chapter_alignment';
    activities: Array<{ activityId: string; goalId: string | null; expectedUpdatedAt: string }>;
  } | {
    type: 'restore_chapter_digest_settings';
    fields: Required<Omit<ChapterDigestSettingsPatch, 'emailRecipient'>> & { emailRecipient: string | null };
  };
  appliedAt: string;
};

export class ChapterMutationConflictError extends Error {}

const chapterVersion = chapterUpdatedAt;

function validateProposal(proposal: UnifiedChatProposal): asserts proposal is ChapterProposal {
  if (proposal.capabilityId !== 'chapters' ||
      !['update_chapter_note', 'apply_chapter_alignment', 'update_chapter_digest_settings'].includes(proposal.operation.type) ||
      proposal.status !== 'approved') {
    throw new ChapterMutationConflictError('This Chapter proposal is not approved.');
  }
}

async function applyDigestProposal(proposal: ChapterProposal, store: ChapterStoreBoundary, mutate: boolean): Promise<ChapterMutationReceipt> {
  if (proposal.operation.type !== 'update_chapter_digest_settings' || !store.getDigestSettings || !store.updateDigestSettings) {
    throw new ChapterMutationConflictError('Chapter digest settings are unavailable on this device.');
  }
  const current = await store.getDigestSettings();
  if (!current || current.template.id !== proposal.operation.targetId) {
    throw new ChapterMutationConflictError('The weekly Chapter settings are no longer available.');
  }
  const fields = proposal.operation.payload.fields;
  const projected = await applyChapterDigestSettingsUpdate({
    input: { expectedUpdatedAt: proposal.operation.payload.expectedUpdatedAt, fields },
    load: async () => current,
    update: mutate
      ? store.updateDigestSettings
      : async () => ({
          ...current, ...fields,
          emailRecipient: Object.prototype.hasOwnProperty.call(fields, 'emailRecipient')
            ? fields.emailRecipient ?? null : current.emailRecipient,
        }),
  });
  return {
    proposalId: proposal.id, operationId: proposal.operation.id, idempotencyKey: proposal.operation.idempotencyKey,
    resultingObjectId: current.template.id,
    resultState: { ...projected, updatedAt: projected.expectedUpdatedAt },
    returnTarget: {
      capabilityId: 'chapters', object: { type: 'chapter_digest_settings', id: current.template.id },
      label: 'Weekly Chapter settings',
      route: { name: 'MainTabs', params: { screen: 'MoreTab', params: { screen: 'MoreChapterDigestSettings' } } },
    },
    undoOperation: { type: 'restore_chapter_digest_settings', fields: {
      enabled: current.enabled, deliveryWeekday: current.deliveryWeekday,
      emailEnabled: current.emailEnabled, emailRecipient: current.emailRecipient,
    } },
    appliedAt: projected.expectedUpdatedAt,
  };
}

function requireAlignmentStore(store: ChapterStoreBoundary) {
  if (!store.getActivities || !store.getGoals || !store.updateActivityGoal) {
    throw new ChapterMutationConflictError('Chapter alignment is unavailable on this device.');
  }
  return {
    activities: store.getActivities(), goals: store.getGoals(), updateActivityGoal: store.updateActivityGoal,
  };
}

async function applyAlignmentProposal(proposal: ChapterProposal, store: ChapterStoreBoundary, mutate: boolean): Promise<ChapterMutationReceipt> {
  if (proposal.operation.type !== 'apply_chapter_alignment') throw new ChapterMutationConflictError('Invalid alignment proposal.');
  const current = await store.getChapter(proposal.operation.targetId);
  if (!current) throw new ChapterMutationConflictError('The Chapter is no longer available.');
  const boundary = requireAlignmentStore(store);
  const selectedIds = new Set(proposal.operation.payload.activities.map((item) => item.activityId));
  const prior = boundary.activities
    .filter((activity) => selectedIds.has(activity.id))
    .map((activity) => ({ activityId: activity.id, goalId: activity.goalId, expectedUpdatedAt: activity.updatedAt }));
  const appliedAt = new Date().toISOString();
  const result = await applyChapterAlignment({
    chapter: { id: current.id, updatedAt: current.updated_at, output: current.output_json },
    goals: boundary.goals,
    activities: boundary.activities,
    input: {
      chapterId: current.id,
      recommendationId: proposal.operation.payload.recommendationId,
      expectedUpdatedAt: proposal.operation.payload.expectedUpdatedAt,
      activities: proposal.operation.payload.activities,
    },
    updateActivityGoal: mutate
      ? (activityId, goalId) => boundary.updateActivityGoal(activityId, goalId)
      : () => undefined,
  });
  return {
    proposalId: proposal.id, operationId: proposal.operation.id,
    idempotencyKey: proposal.operation.idempotencyKey, resultingObjectId: current.id,
    resultState: { goalId: result.goalId, activityIds: result.activityIds, updatedAt: appliedAt },
    returnTarget: {
      capabilityId: 'chapters', object: { type: 'chapter', id: current.id }, label: `Chapter ${current.period_key}`,
      route: { name: 'MainTabs', params: { screen: 'MoreTab', params: { screen: 'MoreChapterDetail', params: { chapterId: current.id } } } },
    },
    undoOperation: { type: 'restore_chapter_alignment', activities: prior },
    appliedAt,
  };
}

function receiptFor(
  proposal: ChapterProposal,
  prior: ChapterRow,
  updated: ChapterRow,
  desiredNote: string | null,
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
      previousUpdatedAt: chapterVersion(prior), desiredNote,
      expectedUpdatedAt: updatedAt,
    },
    appliedAt: updatedAt,
  };
}

export async function prepareApprovedChapterProposal({ proposal, store }: {
  proposal: UnifiedChatProposal; store: ChapterStoreBoundary;
}): Promise<ChapterMutationReceipt> {
  validateProposal(proposal);
  if (proposal.operation.type === 'apply_chapter_alignment') return applyAlignmentProposal(proposal, store, false);
  if (proposal.operation.type === 'update_chapter_digest_settings') return applyDigestProposal(proposal, store, false);
  const current = await store.getChapter(proposal.operation.targetId);
  if (!current || chapterVersion(current) !== proposal.operation.payload.expectedUpdatedAt) {
    throw new ChapterMutationConflictError('The Chapter changed after this proposal was prepared.');
  }
  return {
    ...receiptFor(proposal, current, { ...current, user_note: proposal.operation.payload.note }, proposal.operation.payload.note),
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
  if (proposal.operation.type === 'apply_chapter_alignment') return applyAlignmentProposal(proposal, store, true);
  if (proposal.operation.type === 'update_chapter_digest_settings') return applyDigestProposal(proposal, store, true);
  const current = await store.getChapter(proposal.operation.targetId);
  if (!current || chapterVersion(current) !== proposal.operation.payload.expectedUpdatedAt) {
    throw new ChapterMutationConflictError('The Chapter changed after this proposal was prepared.');
  }
  const updated = (await updateChapterNote({
    chapterId: current.id,
    note: proposal.operation.payload.note,
    expectedUpdatedAt: proposal.operation.payload.expectedUpdatedAt,
  }, store)).result;
  return receiptFor(proposal, current, updated, proposal.operation.payload.note);
}

export async function undoAppliedChapterProposal({ receipt, store }: {
  receipt: ChapterMutationReceipt; store: ChapterStoreBoundary;
}): Promise<{ undoneAt: string }> {
  if (receipt.undoOperation.type === 'restore_chapter_alignment') {
    const boundary = requireAlignmentStore(store);
    const currentById = new Map(boundary.activities.map((activity) => [activity.id, activity]));
    for (const prior of receipt.undoOperation.activities) {
      const current = currentById.get(prior.activityId);
      if (!current || current.goalId !== receipt.resultState.goalId) {
        throw new ChapterMutationConflictError('A tagged To-do changed after apply, so Kwilt will not overwrite it during undo.');
      }
    }
    for (const prior of receipt.undoOperation.activities) boundary.updateActivityGoal(prior.activityId, prior.goalId);
    return { undoneAt: new Date().toISOString() };
  }
  if (receipt.undoOperation.type === 'restore_chapter_digest_settings') {
    if (!store.getDigestSettings || !store.updateDigestSettings) {
      throw new ChapterMutationConflictError('Chapter digest settings are unavailable on this device.');
    }
    const current = await store.getDigestSettings();
    if (!current || current.template.id !== receipt.resultingObjectId) {
      throw new ChapterMutationConflictError('The weekly Chapter settings are no longer available.');
    }
    const restored = await store.updateDigestSettings({
      expectedUpdatedAt: current.template.updated_at, ...receipt.undoOperation.fields,
    });
    if (!restored) throw new ChapterMutationConflictError('The weekly Chapter settings changed before undo.');
    return { undoneAt: restored.template.updated_at };
  }
  const current = await store.getChapter(receipt.resultingObjectId);
  if (!current || !receipt.undoOperation.expectedUpdatedAt ||
      chapterVersion(current) !== receipt.undoOperation.expectedUpdatedAt) {
    throw new ChapterMutationConflictError('The Chapter changed after apply, so Kwilt will not overwrite it during undo.');
  }
  const restored = (await updateChapterNote({
    chapterId: current.id,
    note: receipt.undoOperation.note,
    expectedUpdatedAt: receipt.undoOperation.expectedUpdatedAt,
  }, store)).result;
  return { undoneAt: chapterVersion(restored) };
}

export function hydrateChapterMutationReceipt(stored: UnifiedChatMutationReceipt): ChapterMutationReceipt | null {
  const undo = stored.undoOperation;
  const state = stored.resultState;
  if (stored.capabilityId === 'chapters' && stored.status === 'applied' &&
      undo?.type === 'restore_chapter_alignment' && Array.isArray(undo.activities) &&
      typeof state.updatedAt === 'string' && typeof state.goalId === 'string' && Array.isArray(state.activityIds)) {
    return {
      proposalId: stored.proposalId, operationId: stored.operationId, idempotencyKey: stored.idempotencyKey,
      resultingObjectId: stored.resultingObjectId ?? '', resultState: state as Record<string, unknown> & { updatedAt: string },
      returnTarget: stored.returnTarget ?? {},
      undoOperation: { type: 'restore_chapter_alignment', activities: undo.activities as Array<{ activityId: string; goalId: string | null; expectedUpdatedAt: string }> },
      appliedAt: stored.appliedAt ?? state.updatedAt,
    };
  }
  if (stored.capabilityId === 'chapters' && stored.status === 'applied' &&
      undo?.type === 'restore_chapter_digest_settings' && undo.fields && typeof undo.fields === 'object' &&
      typeof state.updatedAt === 'string') {
    return {
      proposalId: stored.proposalId, operationId: stored.operationId, idempotencyKey: stored.idempotencyKey,
      resultingObjectId: stored.resultingObjectId ?? '', resultState: state as Record<string, unknown> & { updatedAt: string },
      returnTarget: stored.returnTarget ?? {},
      undoOperation: { type: 'restore_chapter_digest_settings', fields: undo.fields as Required<Omit<ChapterDigestSettingsPatch, 'emailRecipient'>> & { emailRecipient: string | null } },
      appliedAt: stored.appliedAt ?? state.updatedAt,
    };
  }
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
  if (approved.operation.type === 'apply_chapter_alignment') {
    const undo = receipt.undoOperation;
    const state = receipt.resultState;
    if (receipt.status !== 'reserved' || undo?.type !== 'restore_chapter_alignment'
        || !Array.isArray(undo.activities) || typeof state.goalId !== 'string'
        || typeof state.updatedAt !== 'string' || !Array.isArray(state.activityIds)) {
      throw new ChapterMutationConflictError('This Chapter receipt cannot be recovered safely.');
    }
    const boundary = requireAlignmentStore(store);
    const currentById = new Map(boundary.activities.map((activity) => [activity.id, activity]));
    const selectedIds = state.activityIds.filter((id): id is string => typeof id === 'string');
    if (selectedIds.length === state.activityIds.length
        && selectedIds.every((id) => currentById.get(id)?.goalId === state.goalId)) {
      return {
        proposalId: receipt.proposalId, operationId: receipt.operationId, idempotencyKey: receipt.idempotencyKey,
        resultingObjectId: receipt.resultingObjectId ?? approved.operation.targetId,
        resultState: state as Record<string, unknown> & { updatedAt: string },
        returnTarget: receipt.returnTarget ?? {},
        undoOperation: { type: 'restore_chapter_alignment', activities: undo.activities as Array<{ activityId: string; goalId: string | null; expectedUpdatedAt: string }> },
        appliedAt: receipt.appliedAt ?? new Date().toISOString(),
      };
    }
    return applyAlignmentProposal(approved, store, true);
  }
  if (approved.operation.type === 'update_chapter_digest_settings') {
    const undo = receipt.undoOperation;
    const state = receipt.resultState;
    if (receipt.status !== 'reserved' || undo?.type !== 'restore_chapter_digest_settings'
        || typeof state.updatedAt !== 'string') {
      throw new ChapterMutationConflictError('This Chapter receipt cannot be recovered safely.');
    }
    const current = await store.getDigestSettings?.();
    const desiredMatches = current && ['enabled', 'deliveryWeekday', 'emailEnabled', 'emailRecipient']
      .every((key) => (current as unknown as Record<string, unknown>)[key] === state[key]);
    if (desiredMatches) {
      return {
        proposalId: receipt.proposalId, operationId: receipt.operationId, idempotencyKey: receipt.idempotencyKey,
        resultingObjectId: receipt.resultingObjectId ?? approved.operation.targetId,
        resultState: state as Record<string, unknown> & { updatedAt: string }, returnTarget: receipt.returnTarget ?? {},
        undoOperation: { type: 'restore_chapter_digest_settings', fields: undo.fields as Required<Omit<ChapterDigestSettingsPatch, 'emailRecipient'>> & { emailRecipient: string | null } },
        appliedAt: receipt.appliedAt ?? current!.template.updated_at,
      };
    }
    return applyDigestProposal(approved, store, true);
  }
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
  return receiptFor(approved, prior, current, approved.operation.payload.note);
}
