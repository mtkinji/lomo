import type { ServerAgentToolCall, ServerAgentToolResult } from './agentRuntime.ts';
import type { ServerDeviceActionRequest } from './serverDeviceHandoffs.ts';

const MONEY_TOOL_IDS = new Set([
  'money.budget.read', 'money.budget.update', 'money.transaction.get',
  'money.transaction.meaning.update', 'money.transaction.plan_treatment.update',
  'money.connection.disconnect', 'money.connection.repair.open', 'money.transfer.list',
  'money.transfer.get', 'money.transfer.review',
]);

type MoneyTarget = {
  targetType: 'money' | 'money_category' | 'money_transaction' | 'money_connection' | 'money_transfer';
  targetId: string | null;
};

function nonEmptyText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function resolveTarget(call: ServerAgentToolCall): MoneyTarget | null {
  if (call.toolId.startsWith('money.transaction.')) {
    const targetId = nonEmptyText(call.arguments.transactionId);
    return targetId ? { targetType: 'money_transaction', targetId } : null;
  }
  if (call.toolId.startsWith('money.connection.')) {
    const targetId = nonEmptyText(call.arguments.connectionId);
    return targetId ? { targetType: 'money_connection', targetId } : null;
  }
  if (call.toolId === 'money.transfer.get' || call.toolId === 'money.transfer.review') {
    const targetId = nonEmptyText(call.arguments.transferId);
    return targetId ? { targetType: 'money_transfer', targetId } : null;
  }
  if (call.toolId === 'money.budget.update') {
    const month = nonEmptyText(call.arguments.month);
    return month && /^\d{4}-\d{2}$/.test(month)
      ? { targetType: 'money_category', targetId: month }
      : null;
  }
  return { targetType: 'money', targetId: null };
}

/** Persist an exact device request without reading or returning private Money data. */
export async function executeServerMoneyTool({ call, stageDeviceAction }: {
  client: unknown; userId: string; call: ServerAgentToolCall;
  stageDeviceAction: (request: ServerDeviceActionRequest) => Promise<void>;
}): Promise<ServerAgentToolResult | null> {
  if (!MONEY_TOOL_IDS.has(call.toolId)) return null;
  const target = resolveTarget(call);
  if (!target) {
    return {
      status: 'failed', code: 'invalid_money_target',
      message: 'Choose a valid Money item to review on your device.', retryable: false,
    };
  }
  const repair = call.toolId === 'money.connection.repair.open';
  const request: ServerDeviceActionRequest = {
    capabilityId: 'money',
    actionType: repair ? 'open_money_connection_repair' : 'open_money_control',
    targetType: target.targetType, targetId: target.targetId,
    title: repair ? 'Repair Money connection' : 'Review private Money action',
    consequenceSummary: repair
      ? 'Kwilt will open the provider-owned repair flow on your authenticated device. Credentials remain with the provider.'
      : 'Kwilt will open this request on your device. Private Money data stays hidden until native authentication, and no change occurs without the required review.',
    payload: { toolId: call.toolId, arguments: call.arguments },
  };
  await stageDeviceAction(request);
  return { status: 'pending_client_action', provider: 'device', request };
}
