import {
  hydrateActivityMutationReceipt,
  undoAppliedActivityProposal,
  type ActivityStoreBoundary,
} from './activityProposalExecutor';
import { transitionProposal } from './runStateMachine';
import type { UnifiedChatMutationReceipt, UnifiedChatProposal } from './types';
import {
  hydratePlanMutationReceipt,
  undoAppliedPlanProposal,
  type PlanStoreBoundary,
  type PlanCalendarBoundary,
} from './planProposalExecutor';
import {
  hydrateGoalMutationReceipt,
  undoAppliedGoalProposal,
  type GoalStoreBoundary,
} from './goalProposalExecutor';
import {
  hydrateArcMutationReceipt,
  undoAppliedArcProposal,
  type ArcStoreBoundary,
} from './arcProposalExecutor';
import {
  hydrateProfileMutationReceipt,
  undoAppliedProfileProposal,
  type ProfileStoreBoundary,
} from './profileProposalExecutor';
import {
  hydrateChapterMutationReceipt,
  undoAppliedChapterProposal,
  type ChapterStoreBoundary,
} from './chapterProposalExecutor';
import type { RelationshipReceiptUndoResult } from '../../services/relationshipMemoryToolProvider';

type UndoRepository = {
  markMutationReceiptUndone: (receiptId: string, undoneAt: string) => Promise<unknown>;
  transitionProposalStatus: (input: {
    proposalId: string;
    fromStatus: UnifiedChatProposal['status'];
    toStatus: UnifiedChatProposal['status'];
    expectedVersion: number;
  }) => Promise<unknown>;
};

export async function executeReceiptUndo({
  receipt,
  proposal,
  repository,
  store,
  planStore,
  planCalendar,
  goalStore,
  arcStore,
  profileStore,
  chapterStore,
  relationshipUndo,
  now = () => new Date().toISOString(),
}: {
  receipt: UnifiedChatMutationReceipt;
  proposal: UnifiedChatProposal;
  repository: UndoRepository;
  store: ActivityStoreBoundary;
  planStore?: PlanStoreBoundary;
  planCalendar?: PlanCalendarBoundary;
  goalStore?: GoalStoreBoundary;
  arcStore?: ArcStoreBoundary;
  profileStore?: ProfileStoreBoundary;
  chapterStore?: ChapterStoreBoundary;
  relationshipUndo?: (receiptId: string) => Promise<RelationshipReceiptUndoResult>;
  now?: () => string;
}): Promise<void> {
  if (proposal.id !== receipt.proposalId || proposal.status !== 'applied') {
    throw new Error('This proposal is not available to undo.');
  }
  if (proposal.capabilityId === 'relationships') {
    if (!relationshipUndo) throw new Error('Relationship undo is unavailable on this device.');
    if (receipt.undoOperation?.type !== 'restore_relationship_record') {
      throw new Error('This relationship receipt does not contain a safe undo operation.');
    }
    transitionProposal(proposal, 'undone', proposal.version);
    const undone = await relationshipUndo(receipt.id);
    if (undone.receiptId !== receipt.id || undone.proposalId !== proposal.id || !undone.undoneAt) {
      throw new Error('Relationship undo returned an invalid receipt.');
    }
    return;
  }
  if (proposal.capabilityId === 'plan') {
    if (!planStore) throw new Error('Plan undo is unavailable on this device.');
    const hydratedPlan = hydratePlanMutationReceipt(receipt);
    if (!hydratedPlan) throw new Error('This Plan receipt does not contain a safe undo operation.');
    transitionProposal(proposal, 'undone', proposal.version);
    const undone = await undoAppliedPlanProposal({
      receipt: hydratedPlan, store: planStore, ...(planCalendar ? { calendar: planCalendar } : {}), now,
    });
    await repository.markMutationReceiptUndone(receipt.id, undone.undoneAt);
    await repository.transitionProposalStatus({
      proposalId: proposal.id, fromStatus: 'applied', toStatus: 'undone', expectedVersion: proposal.version,
    });
    return;
  }
  if (proposal.capabilityId === 'arcs') {
    if (!arcStore) throw new Error('Arc undo is unavailable on this device.');
    const hydratedArc = hydrateArcMutationReceipt(receipt);
    if (!hydratedArc) throw new Error('This Arc receipt does not contain a safe undo operation.');
    transitionProposal(proposal, 'undone', proposal.version);
    const undone = undoAppliedArcProposal({ receipt: hydratedArc, store: arcStore, now });
    await repository.markMutationReceiptUndone(receipt.id, undone.undoneAt);
    await repository.transitionProposalStatus({
      proposalId: proposal.id, fromStatus: 'applied', toStatus: 'undone', expectedVersion: proposal.version,
    });
    return;
  }
  if (proposal.capabilityId === 'goals') {
    if (!goalStore) throw new Error('Goal undo is unavailable on this device.');
    const hydratedGoal = hydrateGoalMutationReceipt(receipt);
    if (!hydratedGoal) throw new Error('This Goal receipt does not contain a safe undo operation.');
    transitionProposal(proposal, 'undone', proposal.version);
    const undone = undoAppliedGoalProposal({ receipt: hydratedGoal, store: goalStore, now });
    await repository.markMutationReceiptUndone(receipt.id, undone.undoneAt);
    await repository.transitionProposalStatus({
      proposalId: proposal.id, fromStatus: 'applied', toStatus: 'undone', expectedVersion: proposal.version,
    });
    return;
  }
  if (proposal.capabilityId === 'profile') {
    if (!profileStore) throw new Error('Profile undo is unavailable on this device.');
    const hydratedProfile = hydrateProfileMutationReceipt(receipt);
    if (!hydratedProfile) throw new Error('This Profile receipt does not contain a safe undo operation.');
    transitionProposal(proposal, 'undone', proposal.version);
    const undone = undoAppliedProfileProposal({ receipt: hydratedProfile, store: profileStore, now });
    await repository.markMutationReceiptUndone(receipt.id, undone.undoneAt);
    await repository.transitionProposalStatus({
      proposalId: proposal.id, fromStatus: 'applied', toStatus: 'undone', expectedVersion: proposal.version,
    });
    return;
  }
  if (proposal.capabilityId === 'chapters') {
    if (!chapterStore) throw new Error('Chapter undo is unavailable on this device.');
    const hydratedChapter = hydrateChapterMutationReceipt(receipt);
    if (!hydratedChapter) throw new Error('This Chapter receipt does not contain a safe undo operation.');
    transitionProposal(proposal, 'undone', proposal.version);
    const undone = await undoAppliedChapterProposal({ receipt: hydratedChapter, store: chapterStore });
    await repository.markMutationReceiptUndone(receipt.id, undone.undoneAt);
    await repository.transitionProposalStatus({
      proposalId: proposal.id, fromStatus: 'applied', toStatus: 'undone', expectedVersion: proposal.version,
    });
    return;
  }
  const hydrated = hydrateActivityMutationReceipt(receipt);
  if (!hydrated) throw new Error('This receipt does not contain a safe undo operation.');
  transitionProposal(proposal, 'undone', proposal.version);
  const undone = undoAppliedActivityProposal({ receipt: hydrated, store, now });
  if (!undone.undoneAt) throw new Error('Undo did not produce a completion time.');
  await repository.markMutationReceiptUndone(receipt.id, undone.undoneAt);
  await repository.transitionProposalStatus({
    proposalId: proposal.id,
    fromStatus: 'applied',
    toStatus: 'undone',
    expectedVersion: proposal.version,
  });
}
