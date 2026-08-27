import type {
  AgentToolCall,
  AgentToolDefinition,
  AgentToolExecutionResult,
} from '@kwilt/agent-runtime';
import type { MoneySnapshot } from '../../capabilities/money/data/moneySnapshot';
import type { createMoneyControlActions } from '../../capabilities/money/actions/moneyControlActions';
import type { StagedUnifiedChatClientAction } from './deviceToolProvider';

type MoneyActions = ReturnType<typeof createMoneyControlActions>;

export type MoneyProposalOperation =
  | {
      type: 'update_money_budget'; targetId: string; expectedUpdatedAt: string;
      payload: { month: string; plannedCents: number };
    }
  | {
      type: 'update_money_transaction_meaning'; targetId: string; expectedUpdatedAt: string;
      payload: { meaning: 'income' | 'transfer' | 'not_counted' | 'category_credit'; categoryId?: string };
    }
  | {
      type: 'update_money_transaction_plan_treatment'; targetId: string; expectedUpdatedAt: string;
      payload: { treatment: 'protected' | 'flexible' | 'default' };
    }
  | {
      type: 'review_money_transfer'; targetId: string; expectedUpdatedAt: string;
      payload: { decision: 'confirm_pair' | 'unpair' };
    }
  | {
      type: 'disconnect_money_connection'; targetId: string; expectedUpdatedAt: string;
      payload: Record<string, never>;
    };

export type StagedMoneyToolProposal = {
  capabilityId: 'money';
  title: string;
  body: string;
  operation: MoneyProposalOperation;
};

const MONEY_TOOL_IDS = new Set([
  'money.budget.read', 'money.budget.update',
  'money.transaction.get', 'money.transaction.meaning.update',
  'money.transaction.plan_treatment.update', 'money.connection.disconnect',
  'money.connection.repair.open', 'money.transfer.list', 'money.transfer.get',
  'money.transfer.review',
]);

const failed = (code: string, message: string, retryable = false): AgentToolExecutionResult => ({
  status: 'failed', code, message, retryable,
});

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function createMoneyToolProvider({
  snapshot,
  actions,
  privacyLocked = false,
}: {
  snapshot: MoneySnapshot | null;
  actions: MoneyActions;
  privacyLocked?: boolean;
}) {
  const staged: StagedMoneyToolProposal[] = [];
  const clientActions: StagedUnifiedChatClientAction[] = [];

  const stageProposal = (proposal: StagedMoneyToolProposal): AgentToolExecutionResult => {
    staged.push(proposal);
    return { status: 'proposed', proposal: proposal as unknown as Record<string, unknown> };
  };

  const stageNative = (
    actionType: 'open_money_control' | 'open_money_connection_repair',
    call: AgentToolCall,
    targetId: string | null,
    title: string,
    consequenceSummary: string,
  ): AgentToolExecutionResult => {
    const request: StagedUnifiedChatClientAction = {
      capabilityId: 'money', actionType, targetType: targetId ? 'money_connection' : 'money',
      targetId, title, consequenceSummary,
      payload: { toolId: call.toolId, arguments: call.arguments },
    };
    clientActions.push(request);
    return { status: 'pending_client_action', provider: 'device', request };
  };

  const execute = async (
    call: AgentToolCall,
    tool: AgentToolDefinition,
  ): Promise<AgentToolExecutionResult | null> => {
    if (!MONEY_TOOL_IDS.has(call.toolId)) return null;
    if (call.toolId !== tool.id) return failed('tool_mismatch', 'The discovered Money tool does not match this call.');
    if (privacyLocked || !snapshot) {
      return stageNative(
        'open_money_control', call, null, 'Unlock Kwilt Money',
        'Kwilt will open Money on this device. Face ID, Touch ID, or the device passcode remains native and no financial detail is exposed in Chat.',
      );
    }

    try {
      if (call.toolId === 'money.budget.read') {
        const receipt = await actions.readBudget();
        return { status: 'completed', receipt: receipt as unknown as Record<string, unknown>, output: receipt.result };
      }
      if (call.toolId === 'money.transaction.get') {
        const transactionId = text(call.arguments.transactionId);
        if (!transactionId) return failed('invalid_money_transaction', 'Choose one exact transaction.');
        const receipt = await actions.getTransaction({ transactionId });
        return { status: 'completed', receipt: receipt as unknown as Record<string, unknown>, output: receipt.result };
      }
      if (call.toolId === 'money.transfer.list') {
        const receipt = await actions.listTransfers();
        return { status: 'completed', receipt: receipt as unknown as Record<string, unknown>, output: { transfers: receipt.result } };
      }
      if (call.toolId === 'money.transfer.get') {
        const transferId = text(call.arguments.transferId);
        if (!transferId) return failed('invalid_money_transfer', 'Choose one exact transfer.');
        const receipt = await actions.getTransfer({ transferId });
        return { status: 'completed', receipt: receipt as unknown as Record<string, unknown>, output: receipt.result };
      }
      if (call.toolId === 'money.connection.repair.open') {
        const connectionId = text(call.arguments.connectionId);
        const connection = (snapshot.connections ?? []).find((candidate) => candidate.id === connectionId);
        if (!connection) return failed('money_target_not_found', 'That financial connection is no longer available.', true);
        return stageNative(
          'open_money_connection_repair', call, connection.id,
          `Repair ${connection.institutionName}`,
          'Kwilt will open the provider-owned repair flow. Credentials and institution consent stay with the provider and native device.',
        );
      }
      if (call.toolId === 'money.budget.update') {
        const categoryId = text(call.arguments.categoryId);
        const month = text(call.arguments.month);
        const expectedUpdatedAt = text(call.arguments.expectedUpdatedAt);
        const plannedCents = Number(call.arguments.plannedCents);
        const category = snapshot.categories.find((candidate) => candidate.sourceId === categoryId);
        if (!category || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)
          || !Number.isSafeInteger(plannedCents) || plannedCents < 0) {
          return failed('invalid_money_budget_diff', 'Choose one current budget and a non-negative monthly amount.');
        }
        if (category.updatedAt !== expectedUpdatedAt) {
          return failed('money_target_stale', 'That budget changed. Refresh before continuing.', true);
        }
        return stageProposal({
          capabilityId: 'money', title: `Update ${category.name}`,
          body: `${category.name} will change from $${(category.plannedCents / 100).toFixed(2)} to $${(plannedCents / 100).toFixed(2)} for ${month}.`,
          operation: {
            type: 'update_money_budget', targetId: category.sourceId, expectedUpdatedAt,
            payload: { month, plannedCents },
          },
        });
      }
      if (call.toolId === 'money.transaction.meaning.update') {
        const transactionId = text(call.arguments.transactionId);
        const expectedUpdatedAt = text(call.arguments.expectedUpdatedAt);
        const meaning = call.arguments.meaning;
        const categoryId = text(call.arguments.categoryId);
        const transaction = snapshot.transactions.find((candidate) => candidate.id === transactionId);
        if (!transaction || !['income', 'transfer', 'not_counted', 'category_credit'].includes(String(meaning))
          || (meaning === 'category_credit' && !categoryId)) {
          return failed('invalid_money_transaction_meaning', 'Choose one current transaction and a supported explicit meaning.');
        }
        if (transaction.updatedAt !== expectedUpdatedAt) {
          return failed('money_target_stale', 'That transaction changed. Refresh before continuing.', true);
        }
        return stageProposal({
          capabilityId: 'money', title: `Change meaning for ${transaction.merchantName}`,
          body: `This transaction will be explicitly treated as ${String(meaning).replace(/_/g, ' ')}. Provider classification remains separate.`,
          operation: {
            type: 'update_money_transaction_meaning', targetId: transaction.id, expectedUpdatedAt,
            payload: {
              meaning: meaning as 'income' | 'transfer' | 'not_counted' | 'category_credit',
              ...(categoryId ? { categoryId } : {}),
            },
          },
        });
      }
      if (call.toolId === 'money.transaction.plan_treatment.update') {
        const transactionId = text(call.arguments.transactionId);
        const expectedUpdatedAt = text(call.arguments.expectedUpdatedAt);
        const treatment = call.arguments.treatment;
        const transaction = snapshot.transactions.find((candidate) => candidate.id === transactionId);
        if (!transaction || !['protected', 'flexible', 'default'].includes(String(treatment))) {
          return failed('invalid_money_plan_treatment', 'Choose one current transaction and how it should affect the plan.');
        }
        if (transaction.updatedAt !== expectedUpdatedAt) {
          return failed('money_target_stale', 'That transaction changed. Refresh before continuing.', true);
        }
        return stageProposal({
          capabilityId: 'money', title: `Change plan treatment for ${transaction.merchantName}`,
          body: `This changes only how the transaction affects the plan to ${String(treatment)}; its source classification and explicit meaning stay unchanged.`,
          operation: {
            type: 'update_money_transaction_plan_treatment', targetId: transaction.id, expectedUpdatedAt,
            payload: { treatment: treatment as 'protected' | 'flexible' | 'default' },
          },
        });
      }
      if (call.toolId === 'money.transfer.review') {
        const transferId = text(call.arguments.transferId);
        const expectedUpdatedAt = text(call.arguments.expectedUpdatedAt);
        const decision = call.arguments.decision;
        const receipt = await actions.getTransfer({ transferId });
        if (!['confirm_pair', 'unpair'].includes(String(decision))) {
          return failed('invalid_money_transfer_review', 'Choose whether to confirm or separate this transfer pair.');
        }
        if (receipt.result.updatedAt !== expectedUpdatedAt) {
          return failed('money_target_stale', 'That transfer changed. Refresh before continuing.', true);
        }
        return stageProposal({
          capabilityId: 'money', title: decision === 'confirm_pair' ? 'Confirm transfer pair' : 'Separate transfer pair',
          body: decision === 'confirm_pair'
            ? 'Both sides stay outside spending and income totals as one internal transfer.'
            : 'The pair will be separated for individual transaction review; neither side is silently converted to spending or income.',
          operation: {
            type: 'review_money_transfer', targetId: transferId, expectedUpdatedAt,
            payload: { decision: decision as 'confirm_pair' | 'unpair' },
          },
        });
      }
      if (call.toolId === 'money.connection.disconnect') {
        const connectionId = text(call.arguments.connectionId);
        const expectedUpdatedAt = text(call.arguments.expectedUpdatedAt);
        const connection = (snapshot.connections ?? []).find((candidate) => candidate.id === connectionId);
        if (!connection) return failed('money_target_not_found', 'That financial connection is no longer available.', true);
        if (connection.updatedAt !== expectedUpdatedAt) {
          return failed('money_target_stale', 'That financial connection changed. Refresh before continuing.', true);
        }
        return stageProposal({
          capabilityId: 'money', title: `Disconnect ${connection.institutionName}`,
          body: `${connection.accountCount} linked account${connection.accountCount === 1 ? '' : 's'} will stop syncing. Existing transaction history remains governed by Kwilt's Money retention policy.`,
          operation: {
            type: 'disconnect_money_connection', targetId: connection.id, expectedUpdatedAt,
            payload: {},
          },
        });
      }
      return null;
    } catch (error) {
      const code = error instanceof Error ? error.message : 'money_action_failed';
      if (code === 'money_native_authentication_required') {
        return stageNative(
          'open_money_control', call, null, 'Unlock Kwilt Money',
          'Kwilt will open Money for native authentication before showing or changing financial detail.',
        );
      }
      return failed(code, 'Kwilt could not complete that Money request. Refresh Money and try again.', code.includes('stale'));
    }
  };

  return { execute, proposals: () => staged.slice(), actions: () => clientActions.slice() };
}
