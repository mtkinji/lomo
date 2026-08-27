import type {
  AgentRunPersistence,
  EnqueuedAgentRun,
} from './agentRunCoordinator.ts';
import type { ActionExecutionReceiptStore } from '../../../packages/kwilt-agent-runtime/src/actionExecution.ts';
import type { KwiltActionReceipt } from '../../../packages/kwilt-agent-runtime/src/types.ts';
import type { DeviceActionHandoff } from '../../../packages/kwilt-agent-runtime/src/deviceHandoffs.ts';
import { redactActionArguments } from '../../../packages/kwilt-agent-runtime/src/deviceHandoffs.ts';

type RpcResult = { data: unknown; error: unknown };
type HistoryResult = { data: unknown; error: unknown };
type HistoryQuery = {
  select: (...args: unknown[]) => HistoryQuery;
  eq: (...args: unknown[]) => HistoryQuery;
  order: (...args: unknown[]) => HistoryQuery;
  limit: (...args: unknown[]) => PromiseLike<HistoryResult>;
  insert: (values: Record<string, unknown>) => PromiseLike<{ error: unknown }>;
  upsert: (values: Record<string, unknown>, options?: Record<string, unknown>) => PromiseLike<{ error: unknown }>;
  maybeSingle: () => PromiseLike<HistoryResult>;
};
type ServiceClient = {
  rpc: (name: string, args: Record<string, unknown>) => PromiseLike<RpcResult>;
  from: (table: string) => unknown;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function actionReceiptFromRow(value: unknown): KwiltActionReceipt {
  const row = record(value);
  const source = row.source;
  const status = row.status;
  const provider = row.provider;
  const allowedSources = new Set(['native_ui', 'mobile_chat', 'voice', 'phone', 'mcp', 'scheduled']);
  const allowedStatuses = new Set([
    'completed', 'proposed', 'pending_client_action', 'needs_input', 'unavailable', 'refused', 'failed',
  ]);
  const allowedProviders = new Set(['server', 'device', 'channel', 'connector']);
  if (typeof row.id !== 'string' || typeof row.operation_id !== 'string' || typeof row.request_id !== 'string'
    || typeof row.actor_id !== 'string' || typeof row.household_id !== 'string'
    || typeof source !== 'string' || !allowedSources.has(source)
    || typeof status !== 'string' || !allowedStatuses.has(status)
    || (provider != null && (typeof provider !== 'string' || !allowedProviders.has(provider)))) {
    throw new Error('conversational_action_receipt_malformed');
  }
  const resultRefs = Array.isArray(row.result_refs) ? row.result_refs.flatMap((value) => {
    const item = record(value);
    return typeof item.kind === 'string' && typeof item.id === 'string'
      ? [{ kind: item.kind, id: item.id }]
      : [];
  }) : [];
  return {
    receiptId: row.id, operationId: row.operation_id, requestId: row.request_id,
    actorId: row.actor_id, householdId: row.household_id,
    source: source as KwiltActionReceipt['source'], status: status as KwiltActionReceipt['status'],
    resultRefs, reversible: row.reversible === true,
    targetVersion: typeof row.target_version === 'number' ? row.target_version : null,
    provider: provider as KwiltActionReceipt['provider'], retryable: row.retryable === true,
    reason: typeof row.reason === 'string' ? row.reason : null,
    candidateSummary: typeof row.candidate_summary === 'string' ? row.candidate_summary : null,
    replayed: row.replayed === true,
    createdAt: typeof row.created_at === 'string' ? row.created_at : new Date(0).toISOString(),
  };
}

export function createServiceActionExecutionReceiptStore({
  admin,
}: {
  admin: ServiceClient;
}): ActionExecutionReceiptStore {
  return {
    load: async (key) => {
      const { data, error } = await (admin.from('kwilt_conversational_action_receipts') as HistoryQuery)
        .select('*').eq('actor_id', key.actorId).eq('operation_id', key.operationId)
        .eq('request_id', key.requestId).maybeSingle();
      if (error) throw new Error('conversational_action_receipt_load_failed');
      return data ? actionReceiptFromRow(data) : null;
    },
    save: async (receipt) => {
      const { error } = await (admin.from('kwilt_conversational_action_receipts') as HistoryQuery).upsert({
        id: receipt.receiptId, actor_id: receipt.actorId, household_id: receipt.householdId,
        operation_id: receipt.operationId, request_id: receipt.requestId, source: receipt.source,
        status: receipt.status, target_version: receipt.targetVersion, provider: receipt.provider,
        retryable: receipt.retryable, reason: receipt.reason, candidate_summary: receipt.candidateSummary,
        result_refs: receipt.resultRefs, reversible: receipt.reversible,
        created_at: receipt.createdAt, updated_at: receipt.createdAt,
      }, { onConflict: 'actor_id,operation_id,request_id' });
      if (error) throw new Error('conversational_action_receipt_save_failed');
    },
  };
}

export function createServiceDeviceHandoffPersistence({ admin }: { admin: ServiceClient }) {
  return {
    save: async (handoff: DeviceActionHandoff) => {
      const { error } = await (admin.from('kwilt_conversational_action_handoffs') as HistoryQuery).upsert({
        id: handoff.id, actor_id: handoff.actorId, household_id: handoff.householdId,
        operation_id: handoff.operationId, request_id: handoff.requestId,
        target_version: handoff.targetVersion, state: handoff.state, version: handoff.version,
        redacted_arguments: redactActionArguments(handoff.redactedArguments), result_refs: handoff.resultRefs,
        claimed_at: handoff.claimedAt, completed_at: handoff.completedAt,
        cancelled_at: handoff.cancelledAt, expired_at: handoff.expiredAt,
        expires_at: handoff.expiresAt, created_at: handoff.createdAt, updated_at: handoff.createdAt,
      }, { onConflict: 'actor_id,operation_id,request_id', ignoreDuplicates: true });
      if (error) throw new Error('conversational_action_handoff_save_failed');
    },
    transition: async (input: {
      handoffId: string; from: DeviceActionHandoff['state']; to: DeviceActionHandoff['state'];
      expectedVersion: number; resultRefs?: DeviceActionHandoff['resultRefs']; occurredAt: string;
    }) => {
      const { data, error } = await admin.rpc('transition_kwilt_conversational_action_handoff', {
        p_handoff_id: input.handoffId, p_from_state: input.from, p_to_state: input.to,
        p_expected_version: input.expectedVersion, p_result_refs: input.resultRefs ?? [],
        p_occurred_at: input.occurredAt,
      });
      if (error || !data) throw new Error('conversational_action_handoff_transition_failed');
      return data;
    },
  };
}

function mapEnqueued(value: unknown): EnqueuedAgentRun {
  const row = record(value);
  const result = {
    threadId: typeof row.threadId === 'string' ? row.threadId : '',
    messageId: typeof row.messageId === 'string' ? row.messageId : '',
    runId: typeof row.runId === 'string' ? row.runId : '',
    status: typeof row.status === 'string' ? row.status : '',
    version: typeof row.version === 'number' ? row.version : 0,
    replayed: row.replayed === true,
  };
  if (!result.threadId || !result.messageId || !result.runId || !result.status || result.version < 1) {
    throw new Error('run_enqueue_malformed');
  }
  return result;
}

function mapProposal(value: unknown) {
  const row = record(value);
  const statuses = new Set(['pending', 'edited', 'rejected', 'deferred', 'approved', 'applying', 'applied', 'failed', 'undone']);
  const result = {
    id: typeof row.id === 'string' ? row.id : '',
    status: typeof row.status === 'string' && statuses.has(row.status) ? row.status : null,
    version: typeof row.version === 'number' ? row.version : 0,
    replayed: row.replayed === true,
  };
  if (!result.id || !result.status || result.version < 1) throw new Error('proposal_stage_malformed');
  return result as {
    id: string;
    status: 'pending' | 'edited' | 'rejected' | 'deferred' | 'approved' | 'applying' | 'applied' | 'failed' | 'undone';
    version: number;
    replayed: boolean;
  };
}

function mapProposals(value: unknown) {
  if (!Array.isArray(value) || value.length < 2 || value.length > 10) throw new Error('proposal_batch_stage_malformed');
  return value.map(mapProposal);
}

export function createServiceAgentRunPersistence({
  admin,
  userId,
}: {
  admin: ServiceClient;
  userId: string;
}): AgentRunPersistence {
  return {
    enqueue: async (request) => {
      const { data, error } = await admin.rpc('enqueue_kwilt_agent_run_with_provenance', {
        p_thread_id: request.threadId,
        p_prompt: request.prompt,
        p_client_request_id: `${request.channel}:${request.requestId}`,
        p_origin_channel: request.channel,
        p_channel_context: request.channelContext,
        p_request_class: 'general',
        p_participating_capabilities: [],
        p_context_policy: { usePrivateContext: false, reason: 'server-routing-pending' },
        p_initiator: request.initiator ?? 'user',
        p_trigger_kind: request.triggerKind ?? 'user_message',
        p_trigger_id: request.triggerId ?? request.requestId,
        p_parent_run_id: request.parentRunId ?? null,
        p_user_id: userId,
      });
      if (error) {
        const failure = record(error);
        console.warn('[agent-run] Enqueue RPC failed', {
          code: typeof failure.code === 'string' ? failure.code : 'unknown',
          message: typeof failure.message === 'string' ? failure.message : 'unknown',
          hint: typeof failure.hint === 'string' ? failure.hint : null,
        });
      }
      if (error || !data) throw new Error('run_enqueue_failed');
      return mapEnqueued(data);
    },
    loadReplay: async (run) => {
      const { data, error } = await admin.rpc('load_kwilt_agent_run_replay', {
        p_user_id: userId, p_run_id: run.runId,
      });
      const row = record(data);
      const answer = typeof row.answer === 'string' ? row.answer.trim() : '';
      const status = row.status === 'partial' ? 'partial' : row.status === 'complete' ? 'complete' : null;
      if (error || !answer || !status) throw new Error('run_replay_load_failed');
      return { answer, status };
    },
    start: async (run, request) => {
      const { data, error } = await admin.rpc('transition_kwilt_agent_channel_run', {
        p_user_id: userId, p_run_id: run.runId,
        p_from_status: 'queued', p_to_status: 'active', p_expected_version: run.version,
        p_origin_channel: request.channel, p_error_code: null, p_error_message: null,
      });
      const version = record(data).version;
      if (error || typeof version !== 'number') throw new Error('run_start_failed');
      return version;
    },
    loadHistory: async (threadId) => {
      const { data, error } = await (admin.from('kwilt_agent_messages') as HistoryQuery)
        .select('role,body,created_at').eq('user_id', userId).eq('thread_id', threadId)
        .order('created_at', { ascending: false }).limit(40);
      if (error) throw new Error('run_history_failed');
      return (Array.isArray(data) ? data : []).reverse().flatMap((value) => {
        const row = record(value);
        return row.role === 'user' || row.role === 'assistant'
          ? [{ role: row.role, content: String(row.body ?? '') }]
          : [];
      });
    },
    stageClientAction: async ({ run, callId, action }) => {
      const { error } = await (admin.from('kwilt_agent_client_actions') as HistoryQuery).insert({
        user_id: userId, thread_id: run.threadId, run_id: run.runId, message_id: run.messageId,
        capability_id: action.capabilityId, action_type: action.actionType,
        target_type: action.targetType, target_id: action.targetId, title: action.title,
        consequence_summary: action.consequenceSummary, payload: action.payload,
        idempotency_key: `server:${run.runId}:${callId}`, status: 'pending_client_action',
      });
      if (error) throw new Error('client_action_stage_failed');
    },
    stageProposal: async ({ run, callId, proposal }) => {
      const { data, error } = await admin.rpc('stage_kwilt_agent_proposal', {
        p_user_id: userId,
        p_thread_id: run.threadId,
        p_run_id: run.runId,
        p_message_id: run.messageId,
        p_call_id: callId,
        p_capability_id: proposal.capabilityId,
        p_title: proposal.title,
        p_body: proposal.body,
        p_operation_type: proposal.operation.type,
        p_target_type: proposal.operation.targetType,
        p_target_id: proposal.operation.targetId,
        p_summary: proposal.operation.summary,
        p_payload: proposal.operation.payload,
      });
      if (error || !data) throw new Error('proposal_stage_failed');
      return mapProposal(data);
    },
    stageProposals: async ({ run, callId, proposals }) => {
      const { data, error } = await admin.rpc('stage_kwilt_agent_proposal_batch', {
        p_user_id: userId,
        p_thread_id: run.threadId,
        p_run_id: run.runId,
        p_message_id: run.messageId,
        p_call_id: callId,
        p_proposals: proposals,
      });
      if (error || !data) throw new Error('proposal_batch_stage_failed');
      return mapProposals(data);
    },
    recordModelStep: async ({ run, round, metadata }) => {
      const { error } = await admin.rpc('append_kwilt_agent_model_step_event', {
        p_user_id: userId,
        p_run_id: run.runId,
        p_round: round,
        p_response_id: metadata.responseId,
        p_routed_model: metadata.routedModel,
        p_prompt_version: metadata.promptVersion,
        p_tool_catalog_hash: metadata.toolCatalogHash,
        p_latency_ms: metadata.latencyMs,
        p_input_tokens: metadata.usage.inputTokens,
        p_output_tokens: metadata.usage.outputTokens,
        p_total_tokens: metadata.usage.totalTokens,
      });
      if (error) throw new Error('model_step_event_write_failed');
    },
    recordTurnPlanning: async ({ run, plan }) => {
      const { error } = await admin.rpc('append_kwilt_agent_turn_planning_events', {
        p_user_id: userId,
        p_run_id: run.runId,
        p_selected_namespaces: plan.judgment.selectedNamespaces,
        p_planner_confidence: plan.judgment.confidence,
        p_planner_reason: plan.judgment.reason,
        p_authorization: plan.policy.authorization,
        p_allowed_effects: plan.policy.allowedEffects,
        p_allowed_tool_ids: plan.policy.allowedToolIds,
        p_unresolved_references: plan.policy.unresolvedReferences,
      });
      if (error) throw new Error('turn_planning_event_write_failed');
    },
    complete: async (input) => {
      const { data, error } = await admin.rpc('complete_kwilt_agent_run_with_message', {
        p_run_id: input.run.runId, p_expected_version: input.expectedVersion,
        p_body: input.body, p_status: input.status,
        p_participating_capabilities: input.participatingCapabilities,
        p_request_class: input.requestClass, p_user_id: userId,
      });
      if (error || !data) throw new Error('run_completion_failed');
      return record(data);
    },
    fail: async ({ run, expectedVersion, code, request }) => {
      await admin.rpc('transition_kwilt_agent_channel_run', {
        p_user_id: userId, p_run_id: run.runId,
        p_from_status: 'active', p_to_status: 'failed', p_expected_version: expectedVersion,
        p_origin_channel: request.channel, p_error_code: code,
        p_error_message: 'Kwilt could not finish this response.',
      });
    },
  };
}
