import type {
  AgentRunPersistence,
  EnqueuedAgentRun,
} from './agentRunCoordinator.ts';

type RpcResult = { data: unknown; error: unknown };
type HistoryResult = { data: unknown; error: unknown };
type HistoryQuery = {
  select: (...args: unknown[]) => HistoryQuery;
  eq: (...args: unknown[]) => HistoryQuery;
  order: (...args: unknown[]) => HistoryQuery;
  limit: (...args: unknown[]) => PromiseLike<HistoryResult>;
  insert: (values: Record<string, unknown>) => PromiseLike<{ error: unknown }>;
};
type ServiceClient = {
  rpc: (name: string, args: Record<string, unknown>) => PromiseLike<RpcResult>;
  from: (table: string) => unknown;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
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
      const { data, error } = await admin.rpc('enqueue_kwilt_agent_run', {
        p_thread_id: request.threadId,
        p_prompt: request.prompt,
        p_client_request_id: `${request.channel}:${request.requestId}`,
        p_origin_channel: request.channel,
        p_channel_context: request.channelContext,
        p_request_class: 'general',
        p_participating_capabilities: [],
        p_context_policy: { usePrivateContext: false, reason: 'server-routing-pending' },
        p_user_id: userId,
      });
      if (error || !data) throw new Error('run_enqueue_failed');
      return mapEnqueued(data);
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
