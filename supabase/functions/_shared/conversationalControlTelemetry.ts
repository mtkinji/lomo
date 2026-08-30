import { redactActionArguments } from '../../../packages/kwilt-agent-runtime/src/deviceHandoffs.ts';

type RpcResult = { data: unknown; error: unknown };
type AuditQuery = { insert(value: Record<string, unknown>): PromiseLike<{ error: unknown }> };
type TelemetryClient = {
  from(table: string): unknown;
  rpc(name: string, args: Record<string, unknown>): PromiseLike<RpcResult>;
};

export type ConversationalControlChannel = 'mobile' | 'voice' | 'phone' | 'mcp' | 'scheduled';
export type ConversationalControlEvent =
  | 'requested' | 'authorization_refused' | 'proposed' | 'handoff' | 'completed'
  | 'failed' | 'replayed' | 'stale_version_conflict';

export function conversationalControlRateClass(consequence: 'low' | 'consequential') {
  return consequence === 'consequential' ? 'high' as const : 'low' as const;
}

export function conversationalControlHouseholdId(value: unknown): string | null {
  const householdId = record(value).householdId;
  return typeof householdId === 'string' && householdId.trim() ? householdId.trim() : null;
}

export function conversationalControlEventForResult(result: { status: string; code?: string }): ConversationalControlEvent {
  if (result.status === 'completed') return 'completed';
  if (result.status === 'proposed') return 'proposed';
  if (result.status === 'pending_client_action') return 'handoff';
  if (result.status === 'failed' && /stale|version_conflict/.test(result.code ?? '')) return 'stale_version_conflict';
  return 'failed';
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => [key, stableValue(item)]));
}

export async function digestConversationalControlArguments(value: unknown): Promise<string> {
  const redacted = redactActionArguments(record(value));
  const bytes = new TextEncoder().encode(JSON.stringify(stableValue(redacted)));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function createConversationalControlTelemetry({ admin, now = () => new Date().toISOString() }: {
  admin: TelemetryClient;
  now?: () => string;
}) {
  return {
    authorize: async (input: {
      operationId: string; actorId: string; oauthClientId: string | null;
      channel: ConversationalControlChannel; provider: string; requestId: string;
      consequence: 'low' | 'medium' | 'high';
    }) => {
      const { data, error } = await admin.rpc('authorize_kwilt_conversational_control', {
        p_operation_id: input.operationId, p_actor_id: input.actorId,
        p_oauth_client_id: input.oauthClientId, p_channel: input.channel,
        p_provider: input.provider, p_request_id: input.requestId, p_consequence: input.consequence,
      });
      const decision = record(data);
      if (error || typeof decision.allowed !== 'boolean' || typeof decision.replayed !== 'boolean'
        || (decision.reason !== null && typeof decision.reason !== 'string')) {
        throw new Error('conversational_control_authorization_failed');
      }
      return { allowed: decision.allowed, replayed: decision.replayed, reason: decision.reason as string | null };
    },
    record: async (input: {
      event: ConversationalControlEvent; operationId: string; toolVersion: number; catalogHash: string;
      actorId: string; householdId: string | null; oauthClientId: string | null;
      channel: ConversationalControlChannel; provider: string | null; requestId: string;
      arguments: unknown; resultStatus: string | null; receiptId: string | null;
      errorCode?: string | null; latencyMs?: number | null;
    }) => {
      const { error } = await (admin.from('kwilt_conversational_control_audit') as AuditQuery).insert({
        event: input.event, operation_id: input.operationId, tool_version: input.toolVersion,
        catalog_hash: input.catalogHash, actor_id: input.actorId, household_id: input.householdId,
        oauth_client_id: input.oauthClientId, channel: input.channel, provider: input.provider,
        request_id: input.requestId,
        argument_digest: await digestConversationalControlArguments(input.arguments),
        result_status: input.resultStatus, receipt_id: input.receiptId,
        error_code: input.errorCode ?? null, latency_ms: input.latencyMs ?? null, occurred_at: now(),
      });
      if (error) throw new Error('conversational_control_audit_failed');
      if (input.provider && (input.event === 'completed' || (input.event === 'failed' && input.errorCode))) {
        const outcome = await admin.rpc('record_kwilt_conversational_provider_outcome', {
          p_provider: input.provider, p_succeeded: input.event === 'completed',
          p_error_code: input.errorCode ?? null,
        });
        if (outcome.error) throw new Error('conversational_control_provider_outcome_failed');
      }
    },
    reconcile: async ({ staleAfterMinutes, limit }: { staleAfterMinutes: number; limit: number }) => {
      const { data, error } = await admin.rpc('reconcile_kwilt_conversational_control', {
        p_stale_after_minutes: staleAfterMinutes, p_limit: limit,
      });
      const result = record(data);
      if (error || !Number.isInteger(result.expiredHandoffs) || !Number.isInteger(result.deadLetters)) {
        throw new Error('conversational_control_reconciliation_failed');
      }
      return { expiredHandoffs: Number(result.expiredHandoffs), deadLetters: Number(result.deadLetters) };
    },
  };
}
