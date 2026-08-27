import { getTransactionPlanTreatment } from '../../capabilities/money/domain/transactionPlanTreatment';
import type { MoneySnapshot } from '../../capabilities/money/data/moneySnapshot';
import type { createMoneyControlActions } from '../../capabilities/money/actions/moneyControlActions';
import type { UnifiedChatRepository } from './threadRepository';
import type { UnifiedChatThreadAggregate } from './types';
import {
  applyMoneyControlOperation,
  moneyControlReturnTarget,
  moneyControlTargetType,
  type MoneyControlOperation,
} from './executeMoneyControlProposalDecision';

type Actions = ReturnType<typeof createMoneyControlActions>;
type Repository = Pick<
  UnifiedChatRepository,
  'finalizeMutationReceipt' | 'failMutationReceipt' | 'transitionProposalStatus' | 'loadThread'
>;

const TYPES = new Set([
  'update_money_budget', 'update_money_transaction_meaning',
  'update_money_transaction_plan_treatment', 'review_money_transfer',
  'disconnect_money_connection',
]);

export function isMoneyControlOperation(operation: { type: string }): operation is MoneyControlOperation {
  return TYPES.has(operation.type);
}

export function isMoneyControlOperationApplied(
  operation: MoneyControlOperation,
  snapshot: MoneySnapshot,
): boolean {
  if (operation.type === 'update_money_budget') {
    const category = snapshot.categories.find((item) => item.sourceId === operation.targetId);
    return snapshot.generatedAt.slice(0, 7) === operation.payload.month
      && category?.plannedCents === operation.payload.plannedCents;
  }
  if (operation.type === 'update_money_transaction_meaning') {
    const transaction = snapshot.transactions.find((item) => item.id === operation.targetId);
    if (transaction?.moneyMeaning !== operation.payload.meaning) return false;
    if (operation.payload.meaning !== 'category_credit' || !operation.payload.categoryId) return true;
    const category = snapshot.categories.find((item) => item.sourceId === operation.payload.categoryId);
    return transaction.categoryId === category?.id;
  }
  if (operation.type === 'update_money_transaction_plan_treatment') {
    const transaction = snapshot.transactions.find((item) => item.id === operation.targetId);
    if (operation.payload.treatment === 'default') {
      return transaction?.planRoleOverride == null;
    }
    return transaction
      ? getTransactionPlanTreatment(transaction, snapshot.categories).kind === operation.payload.treatment
      : false;
  }
  if (operation.type === 'review_money_transfer') {
    const ids = operation.targetId.split(':');
    if (ids.length !== 2) return false;
    const rows = ids.map((id) => snapshot.transactions.find((item) => item.id === id));
    if (rows.some((row) => !row)) return false;
    return operation.payload.decision === 'confirm_pair'
      ? rows.every((row) => row?.moneyMeaning === 'transfer' && row.transferPair)
      : rows.every((row) => row?.moneyMeaning == null || row.moneyMeaning === 'unknown');
  }
  const connection = (snapshot.connections ?? []).find((item) => item.id === operation.targetId);
  return connection?.status === 'disconnected';
}

export async function recoverMoneyControlMutations({ aggregate, repository, actions, loadSnapshot }: {
  aggregate: UnifiedChatThreadAggregate;
  repository: Repository;
  actions: Actions;
  loadSnapshot: () => Promise<MoneySnapshot>;
}): Promise<UnifiedChatThreadAggregate> {
  let changed = false;
  for (const proposal of aggregate.proposals ?? []) {
    if (proposal.capabilityId !== 'money' || proposal.status !== 'applying'
      || !isMoneyControlOperation(proposal.operation)) continue;
    const receipt = (aggregate.receipts ?? []).find((candidate) => (
      candidate.proposalId === proposal.id && (candidate.status === 'reserved' || candidate.status === 'applied')
    ));
    if (!receipt) continue;
    try {
      if (receipt.status === 'reserved') {
        const snapshot = await loadSnapshot();
        const resultState = isMoneyControlOperationApplied(proposal.operation, snapshot)
          ? { recovered: true, updatedAt: snapshot.generatedAt, ...proposal.operation.payload }
          : await applyMoneyControlOperation(proposal.operation, actions);
        await repository.finalizeMutationReceipt(receipt.id, {
          capabilityId: 'money', resultingObjectType: moneyControlTargetType(proposal.operation),
          resultingObjectId: proposal.operation.targetId, resultState,
          returnTarget: moneyControlReturnTarget(proposal.operation), undoOperation: null,
          appliedAt: receipt.appliedAt,
        });
      }
      await repository.transitionProposalStatus({
        proposalId: proposal.id, fromStatus: 'applying', toStatus: 'applied', expectedVersion: proposal.version,
      });
    } catch (error) {
      if (receipt.status === 'reserved') {
        await repository.failMutationReceipt(
          receipt.id, 'money_control_recovery_failed',
          error instanceof Error ? error.message : 'Kwilt could not recover the Money change.',
        );
      }
      await repository.transitionProposalStatus({
        proposalId: proposal.id, fromStatus: 'applying', toStatus: 'failed', expectedVersion: proposal.version,
      });
    }
    changed = true;
  }
  return changed ? repository.loadThread(aggregate.thread.id) : aggregate;
}
