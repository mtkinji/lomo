import type { MoneyRepository } from '../../capabilities/money/data/moneyRepository';
import type { UnifiedChatRepository } from './threadRepository';
import type { UnifiedChatThreadAggregate } from './types';
import { MoneyCategoryMutationConflictError } from './executeMoneyCategoryProposalDecision';

type Repository = Pick<
  UnifiedChatRepository,
  'finalizeMutationReceipt' | 'failMutationReceipt' | 'transitionProposalStatus' | 'loadThread'
>;

export async function recoverMoneyCategoryMutations({ aggregate, repository, moneyRepository }: {
  aggregate: UnifiedChatThreadAggregate;
  repository: Repository;
  moneyRepository: Pick<MoneyRepository, 'loadSnapshot' | 'createCategory' | 'renameCategory'>;
}): Promise<UnifiedChatThreadAggregate> {
  let changed = false;
  for (const proposal of aggregate.proposals ?? []) {
    if (proposal.capabilityId !== 'money' || proposal.status !== 'applying') continue;
    const receipt = (aggregate.receipts ?? []).find(
      (candidate) => candidate.proposalId === proposal.id &&
        (candidate.status === 'reserved' || candidate.status === 'applied'),
    );
    if (!receipt) continue;
    try {
      if (receipt.status === 'reserved') {
        const operation = proposal.operation;
        const snapshot = await moneyRepository.loadSnapshot();
        let categoryId: string;
        if (operation.type === 'rename_money_category') {
          const category = snapshot.categories.find((item) => item.sourceId === operation.targetId || item.id === operation.targetId);
          if (!category) throw new MoneyCategoryMutationConflictError('That Money category no longer exists.');
          if (category.name === operation.payload.expectedName) {
            await moneyRepository.renameCategory(operation.targetId, operation.payload.name);
          } else if (category.name !== operation.payload.name) {
            throw new MoneyCategoryMutationConflictError('That Money category changed while Kwilt was applying the rename.');
          }
          categoryId = operation.targetId;
        } else {
          const beforeIds = new Set(Array.isArray(receipt.resultState.beforeCategoryIds)
            ? receipt.resultState.beforeCategoryIds.filter((id): id is string => typeof id === 'string')
            : []);
          const matches = snapshot.categories.filter((category) =>
            !beforeIds.has(category.sourceId) && category.name === operation.payload.name &&
            category.plannedCents === operation.payload.budgetCents);
          if (matches.length > 1) {
            throw new MoneyCategoryMutationConflictError('Kwilt found more than one matching new Money category and will not guess.');
          }
          categoryId = matches[0]?.sourceId ?? (await moneyRepository.createCategory(operation.payload)).categoryId;
        }
        const returnTarget = {
          capabilityId: 'money', object: { type: 'money_category', id: categoryId }, label: operation.payload.name,
          route: { name: 'Money', params: { screen: 'MoneyCategoryDetail', params: { categoryId } } },
        };
        await repository.finalizeMutationReceipt(receipt.id, {
          capabilityId: 'money', resultingObjectType: 'money_category', resultingObjectId: categoryId,
          resultState: receipt.resultState, returnTarget, undoOperation: receipt.undoOperation,
          appliedAt: receipt.appliedAt,
        });
      }
      await repository.transitionProposalStatus({
        proposalId: proposal.id, fromStatus: 'applying', toStatus: 'applied', expectedVersion: proposal.version,
      });
    } catch (error) {
      if (!(error instanceof MoneyCategoryMutationConflictError) || receipt.status !== 'reserved') throw error;
      await repository.failMutationReceipt(receipt.id, 'money_category_recovery_conflict', error.message);
      await repository.transitionProposalStatus({
        proposalId: proposal.id, fromStatus: 'applying', toStatus: 'failed', expectedVersion: proposal.version,
      });
    }
    changed = true;
  }
  return changed ? repository.loadThread(aggregate.thread.id) : aggregate;
}
