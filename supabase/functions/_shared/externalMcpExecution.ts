import type { ServerAgentProposalRecord, ServerAgentProposalRequest, ServerAgentToolCall, ServerAgentToolResult } from './agentRuntime.ts';

export const EXTERNAL_DIRECT_LIFE_TOOLS = new Set([
  'arcs.create', 'arcs.update', 'arcs.delete',
  'goals.create', 'goals.update', 'goals.delete',
  'activities.capture', 'activities.update', 'activities.delete', 'activities.repeat.update',
  'activities.reminder.update', 'activities.focus_today', 'activities.steps.create',
  'activities.steps.update', 'activities.steps.complete', 'activities.steps.delete',
  'activities.steps.reorder', 'chapters.note.update',
]);

type RpcResult = { data: unknown; error: unknown };
type ReceiptQuery = {
  select(columns: string): ReceiptQuery;
  eq(column: string, value: string): ReceiptQuery;
  maybeSingle(): PromiseLike<RpcResult>;
};
export type ExternalExecutionClient = {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<RpcResult>;
  from(table: string): unknown;
};
export type ExternalExecutionContext = {
  client: ExternalExecutionClient; userId: string; clientId: string; call: ServerAgentToolCall;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function stable(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entry]) => JSON.stringify(key) + ':' + stable(entry)).join(',') + '}';
  return JSON.stringify(value) ?? 'null';
}
function completed(value: unknown, call: ServerAgentToolCall, replayed = false): ServerAgentToolResult {
  const receipt = record(value);
  if (receipt.status !== 'completed' || typeof receipt.receiptId !== 'string' ||
      receipt.operationId !== call.toolId || receipt.requestId !== call.id ||
      !Array.isArray(receipt.resultRefs) || !receipt.resultRefs.length ||
      receipt.resultRefs.some((ref) => typeof record(ref).kind !== 'string' || typeof record(ref).id !== 'string')) {
    return { status: 'failed', code: 'external_receipt_invalid', message: 'Kwilt could not verify the execution receipt.', retryable: true };
  }
  return { status: 'completed', receipt: { ...receipt, replayed: replayed || receipt.replayed === true }, output: {} };
}

/** Consult the transaction receipt before target validation: a deleted target may be a successful retry. */
export async function readExternalExecutionReceipt(context: ExternalExecutionContext): Promise<ServerAgentToolResult | null> {
  const { client, userId, clientId, call } = context;
  const { data, error } = await (client.from('kwilt_external_execution_receipts') as ReceiptQuery)
    .select('operation_id,arguments,result').eq('user_id', userId).eq('oauth_client_id', clientId)
    .eq('request_id', call.id).maybeSingle();
  if (error) throw new Error('external_receipt_lookup_failed');
  if (!data) return null;
  const row = record(data);
  if (row.operation_id !== call.toolId || stable(row.arguments) !== stable(call.arguments)) {
    return { status: 'refused', reason: 'This request ID was already used with different arguments. Use a new idempotency key for a changed request.' };
  }
  return completed(row.result, call, true);
}

export async function applyExternalLifeOperations(
  context: ExternalExecutionContext, proposals: ServerAgentProposalRequest[],
): Promise<ServerAgentToolResult> {
  if (!EXTERNAL_DIRECT_LIFE_TOOLS.has(context.call.toolId)) {
    return { status: 'unavailable', reason: 'This operation does not yet have a server executor. No change or in-app review task was created.', retryable: false };
  }
  const { data, error } = await context.client.rpc('execute_kwilt_external_life_operations', {
    p_user_id: context.userId, p_oauth_client_id: context.clientId,
    p_request_id: context.call.id, p_operation_id: context.call.toolId,
    p_arguments: context.call.arguments, p_operations: proposals.map((proposal) => proposal.operation),
  });
  if (error) return {
    status: 'failed', code: 'external_execution_failed',
    message: 'Kwilt could not apply this request. Refresh the target before changing it; retry an uncertain outcome with the same request ID.',
    retryable: true,
  };
  return completed(data, context.call);
}

export type ExternalProposalPlanning = {
  stageProposal(request: ServerAgentProposalRequest): Promise<ServerAgentProposalRecord>;
  stageProposals(requests: ServerAgentProposalRequest[]): Promise<ServerAgentProposalRecord[]>;
};

/** MCP's caller owns conversational authorization; a mobile review queue is not a provider. */
export async function executeExternalAuthorizedTool(input: {
  execute(planning: ExternalProposalPlanning): Promise<ServerAgentToolResult>;
  apply(requests: ServerAgentProposalRequest[]): Promise<ServerAgentToolResult>;
}): Promise<ServerAgentToolResult> {
  const proposals: ServerAgentProposalRequest[] = [];
  const stageProposal = async (request: ServerAgentProposalRequest): Promise<ServerAgentProposalRecord> => {
    proposals.push(request);
    return { id: `external-plan-${proposals.length}`, status: 'pending', version: 1, replayed: false };
  };
  const result = await input.execute({ stageProposal, stageProposals: (requests) => Promise.all(requests.map(stageProposal)) });
  if (result.status === 'pending_client_action') {
    return { status: 'unavailable', reason: 'This operation requires a device or provider interaction that this MCP connection cannot perform. No in-app review task was created.', retryable: false };
  }
  if (result.status !== 'proposed') return result;
  if (!proposals.length) {
    return { status: 'unavailable', reason: 'This operation has no external execution provider. No change was made.', retryable: false };
  }
  return input.apply(proposals);
}
