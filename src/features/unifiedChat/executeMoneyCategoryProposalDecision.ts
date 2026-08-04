import type { MoneyRepository } from '../../capabilities/money/data/moneyRepository';
import type {
  DecideUnifiedChatProposalInput,
  FinalizeUnifiedChatMutationReceiptInput,
  PersistUnifiedChatMutationReceiptInput,
  TransitionUnifiedChatProposalInput,
  UnifiedChatMutationReceipt,
  UnifiedChatProposal,
  UnifiedChatProposalDecisionResult,
} from './types';

type MoneyProposal = Extract<UnifiedChatProposal, { capabilityId: 'money' }>;
type Repository = {
  decideProposal: (input: DecideUnifiedChatProposalInput) => Promise<UnifiedChatProposalDecisionResult>;
  transitionProposalStatus: (input: TransitionUnifiedChatProposalInput) => Promise<{ status: UnifiedChatProposal['status']; version: number }>;
  persistMutationReceipt: (input: PersistUnifiedChatMutationReceiptInput) => Promise<UnifiedChatMutationReceipt>;
  finalizeMutationReceipt: (id: string, input: FinalizeUnifiedChatMutationReceiptInput) => Promise<UnifiedChatMutationReceipt>;
};

export class MoneyCategoryMutationConflictError extends Error {}

export async function executeMoneyCategoryProposalDecision({
  proposal, action, repository, moneyRepository, now = () => new Date().toISOString(),
}: {
  proposal: MoneyProposal;
  action: DecideUnifiedChatProposalInput['action'];
  repository: Repository;
  moneyRepository: Pick<MoneyRepository, 'loadSnapshot' | 'createCategory' | 'renameCategory'>;
  now?: () => string;
}): Promise<void> {
  const decision = await repository.decideProposal({ proposalId: proposal.id, action, expectedVersion: proposal.version });
  if (action !== 'approve') return;
  const applying = await repository.transitionProposalStatus({
    proposalId: proposal.id, fromStatus: 'approved', toStatus: 'applying', expectedVersion: decision.version,
  });
  let reservationPersisted = false;
  try {
    const appliedAt = now();
    const snapshot = await moneyRepository.loadSnapshot();
    const operation = proposal.operation;
    const current = operation.type === 'rename_money_category'
      ? snapshot.categories.find((category) => category.sourceId === operation.targetId || category.id === operation.targetId)
      : null;
    if (operation.type === 'rename_money_category' && (!current || current.name !== operation.payload.expectedName)) {
      throw new MoneyCategoryMutationConflictError('That Money category changed after this proposal was prepared.');
    }
    const initialId = operation.type === 'rename_money_category' ? operation.targetId : null;
    const undoOperation = operation.type === 'rename_money_category'
      ? {
          type: 'restore_money_category_name', categoryId: operation.targetId,
          name: operation.payload.expectedName, expectedName: operation.payload.name,
        }
      : null;
    const reserved = await repository.persistMutationReceipt({
      capabilityId: 'money', threadId: proposal.threadId, proposalId: proposal.id,
      operationId: operation.id, idempotencyKey: operation.idempotencyKey, status: 'reserved',
      resultingObjectType: 'money_category', resultingObjectId: initialId,
      resultState: operation.type === 'rename_money_category'
        ? { name: operation.payload.name, previousName: operation.payload.expectedName }
        : {
            name: operation.payload.name, budgetCents: operation.payload.budgetCents,
            beforeCategoryIds: snapshot.categories.map((category) => category.sourceId),
          },
      returnTarget: initialId ? {
        capabilityId: 'money', object: { type: 'money_category', id: initialId }, label: operation.payload.name,
        route: { name: 'Money', params: { screen: 'MoneyCategoryDetail', params: { categoryId: initialId } } },
      } : null,
      undoOperation, appliedAt,
    });
    reservationPersisted = true;

    const categoryId = operation.type === 'rename_money_category'
      ? (await moneyRepository.renameCategory(operation.targetId, operation.payload.name)).categoryId
      : (await moneyRepository.createCategory(operation.payload)).categoryId;
    const resultState = operation.type === 'rename_money_category'
      ? { name: operation.payload.name, previousName: operation.payload.expectedName }
      : { name: operation.payload.name, budgetCents: operation.payload.budgetCents };
    const returnTarget = {
      capabilityId: 'money', object: { type: 'money_category', id: categoryId }, label: operation.payload.name,
      route: { name: 'Money', params: { screen: 'MoneyCategoryDetail', params: { categoryId } } },
    };
    await repository.finalizeMutationReceipt(reserved.id, {
      capabilityId: 'money', resultingObjectType: 'money_category', resultingObjectId: categoryId,
      resultState, returnTarget, undoOperation, appliedAt,
    });
    await repository.transitionProposalStatus({
      proposalId: proposal.id, fromStatus: 'applying', toStatus: 'applied', expectedVersion: applying.version,
    });
  } catch (error) {
    if (!reservationPersisted) {
      await repository.transitionProposalStatus({
        proposalId: proposal.id, fromStatus: 'applying', toStatus: 'failed', expectedVersion: applying.version,
      }).catch(() => undefined);
    }
    throw error;
  }
}

export async function undoMoneyCategoryRename({
  receipt, moneyRepository, now = () => new Date().toISOString(),
}: {
  receipt: UnifiedChatMutationReceipt;
  moneyRepository: Pick<MoneyRepository, 'loadSnapshot' | 'renameCategory'>;
  now?: () => string;
}): Promise<{ undoneAt: string }> {
  const undo = receipt.undoOperation;
  if (receipt.capabilityId !== 'money' || undo?.type !== 'restore_money_category_name' ||
      typeof undo.categoryId !== 'string' || typeof undo.name !== 'string' || typeof undo.expectedName !== 'string') {
    throw new MoneyCategoryMutationConflictError('This Money change cannot be undone safely.');
  }
  const snapshot = await moneyRepository.loadSnapshot();
  const current = snapshot.categories.find((category) => category.sourceId === undo.categoryId || category.id === undo.categoryId);
  if (!current || current.name !== undo.expectedName) {
    throw new MoneyCategoryMutationConflictError('That Money category changed after apply, so Kwilt will not overwrite it during undo.');
  }
  await moneyRepository.renameCategory(undo.categoryId, undo.name);
  return { undoneAt: now() };
}
