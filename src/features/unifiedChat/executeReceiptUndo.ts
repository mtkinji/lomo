import {
  hydrateActivityMutationReceipt,
  undoAppliedActivityProposal,
  type ActivityStoreBoundary,
} from './activityProposalExecutor';
import { transitionProposal } from './runStateMachine';
import type { UnifiedChatMutationReceipt, UnifiedChatProposal } from './types';

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
  now = () => new Date().toISOString(),
}: {
  receipt: UnifiedChatMutationReceipt;
  proposal: UnifiedChatProposal;
  repository: UndoRepository;
  store: ActivityStoreBoundary;
  now?: () => string;
}): Promise<void> {
  if (proposal.id !== receipt.proposalId || proposal.status !== 'applied') {
    throw new Error('This proposal is not available to undo.');
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
