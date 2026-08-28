import type { createMoneyControlActions } from '../../capabilities/money/actions/moneyControlActions';
import type {
  DecideUnifiedChatProposalInput,
  FinalizeUnifiedChatMutationReceiptInput,
  PersistUnifiedChatMutationReceiptInput,
  TransitionUnifiedChatProposalInput,
  UnifiedChatMutationReceipt,
  UnifiedChatProposal,
  UnifiedChatProposalDecisionResult,
  UnifiedChatProposalOperation,
} from './types';

export type MoneyControlOperation = Extract<UnifiedChatProposalOperation, {
  capabilityId: 'money';
  type: 'update_money_budget' | 'update_money_transaction_meaning' |
    'update_money_transaction_plan_treatment' | 'review_money_transfer' |
    'disconnect_money_connection';
}>;
export type MoneyControlProposal = Omit<Extract<UnifiedChatProposal, { capabilityId: 'money' }>, 'operation'> & {
  operation: MoneyControlOperation;
};
type Actions = ReturnType<typeof createMoneyControlActions>;
type Repository = {
  decideProposal(input: DecideUnifiedChatProposalInput): Promise<UnifiedChatProposalDecisionResult>;
  transitionProposalStatus(input: TransitionUnifiedChatProposalInput): Promise<{ status: UnifiedChatProposal['status']; version: number }>;
  persistMutationReceipt(input: PersistUnifiedChatMutationReceiptInput): Promise<UnifiedChatMutationReceipt>;
  finalizeMutationReceipt(id: string, input: FinalizeUnifiedChatMutationReceiptInput): Promise<UnifiedChatMutationReceipt>;
  failMutationReceipt(id: string, code: string, message: string): Promise<UnifiedChatMutationReceipt>;
};

export function moneyControlTargetType(operation: MoneyControlOperation): string {
  if (operation.type === 'update_money_budget') return 'money_category';
  if (operation.type === 'review_money_transfer') return 'money_transfer';
  if (operation.type === 'disconnect_money_connection') return 'money_connection';
  return 'money_transaction';
}

export function moneyControlReturnTarget(operation: MoneyControlOperation) {
  if (operation.type === 'update_money_budget') {
    return {
      capabilityId: 'money', object: { type: 'money_category', id: operation.targetId },
      label: 'Updated budget',
      route: { name: 'Money', params: { screen: 'MoneyCategoryDetail', params: { categoryId: operation.targetId } } },
    };
  }
  if (operation.type === 'update_money_transaction_meaning'
    || operation.type === 'update_money_transaction_plan_treatment') {
    return {
      capabilityId: 'money', object: { type: 'money_transaction', id: operation.targetId },
      label: 'Updated transaction',
      route: { name: 'Money', params: { screen: 'MoneyTransactionDetail', params: { transactionId: operation.targetId } } },
    };
  }
  return {
    capabilityId: 'money', object: { type: moneyControlTargetType(operation), id: operation.targetId },
    label: operation.type === 'disconnect_money_connection' ? 'Money accounts' : 'Reviewed transfer',
    route: { name: 'Money', params: { screen: operation.type === 'disconnect_money_connection' ? 'MoneyAccounts' : 'MoneyTransactions' } },
  };
}

export async function applyMoneyControlOperation(operation: MoneyControlOperation, actions: Actions): Promise<Record<string, unknown>> {
  const common = {
    requestId: operation.idempotencyKey,
    confirmed: true,
    expectedUpdatedAt: operation.expectedUpdatedAt,
  };
  if (operation.type === 'update_money_budget') {
    return (await actions.updateBudget({
      ...common, categoryId: operation.targetId,
      month: operation.payload.month, plannedCents: operation.payload.plannedCents,
    })).result;
  }
  if (operation.type === 'update_money_transaction_meaning') {
    return (await actions.updateTransactionMeaning({
      ...common, transactionId: operation.targetId, meaning: operation.payload.meaning,
      ...(operation.payload.categoryId ? { categoryId: operation.payload.categoryId } : {}),
    })).result;
  }
  if (operation.type === 'update_money_transaction_plan_treatment') {
    return (await actions.updateTransactionPlanTreatment({
      ...common, transactionId: operation.targetId, treatment: operation.payload.treatment,
    })).result;
  }
  if (operation.type === 'review_money_transfer') {
    return (await actions.reviewTransfer({
      ...common, transferId: operation.targetId, decision: operation.payload.decision,
    })).result;
  }
  return (await actions.disconnectConnection({
    ...common, connectionId: operation.targetId,
  })).result;
}

export async function executeMoneyControlProposalDecision({
  proposal, action, repository, actions, now = () => new Date().toISOString(),
}: {
  proposal: MoneyControlProposal;
  action: DecideUnifiedChatProposalInput['action'];
  repository: Repository;
  actions: Actions;
  now?: () => string;
}): Promise<void> {
  const decision = await repository.decideProposal({
    proposalId: proposal.id, action, expectedVersion: proposal.version,
  });
  if (action !== 'approve') return;
  const applying = await repository.transitionProposalStatus({
    proposalId: proposal.id, fromStatus: 'approved', toStatus: 'applying', expectedVersion: decision.version,
  });
  const operation = proposal.operation;
  let receipt: UnifiedChatMutationReceipt | null = null;
  try {
    const appliedAt = now();
    receipt = await repository.persistMutationReceipt({
      capabilityId: 'money', threadId: proposal.threadId, proposalId: proposal.id,
      operationId: operation.id, idempotencyKey: operation.idempotencyKey, status: 'reserved',
      resultingObjectType: moneyControlTargetType(operation), resultingObjectId: operation.targetId,
      resultState: { expectedUpdatedAt: operation.expectedUpdatedAt, ...operation.payload },
      returnTarget: moneyControlReturnTarget(operation), undoOperation: null, appliedAt,
    });
    const resultState = await applyMoneyControlOperation(operation, actions);
    await repository.finalizeMutationReceipt(receipt.id, {
      capabilityId: 'money', resultingObjectType: moneyControlTargetType(operation),
      resultingObjectId: operation.targetId, resultState,
      returnTarget: moneyControlReturnTarget(operation), undoOperation: null, appliedAt,
    });
    await repository.transitionProposalStatus({
      proposalId: proposal.id, fromStatus: 'applying', toStatus: 'applied', expectedVersion: applying.version,
    });
  } catch (error) {
    if (receipt) {
      await repository.failMutationReceipt(
        receipt.id,
        error instanceof Error ? error.message : 'money_control_failed',
        'Kwilt could not confirm the Money change.',
      ).catch(() => undefined);
    }
    await repository.transitionProposalStatus({
      proposalId: proposal.id, fromStatus: 'applying', toStatus: 'failed', expectedVersion: applying.version,
    }).catch(() => undefined);
    throw error;
  }
}
