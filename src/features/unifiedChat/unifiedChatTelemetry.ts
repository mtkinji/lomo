import type { AgentToolLoopEvent } from '@kwilt/agent-runtime';
import type { UnifiedChatRequestPolicy } from './requestPolicy';
import type { UnifiedChatThreadAggregate } from './types';

export type UnifiedChatTelemetryProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

export function buildUnifiedChatRouteTelemetry(
  policy: UnifiedChatRequestPolicy,
): UnifiedChatTelemetryProperties {
  return {
    request_class: policy.requestClass,
    capability_ids: policy.participatingCapabilities.join(','),
    capability_count: policy.participatingCapabilities.length,
    route_source: policy.policyReason.startsWith('semantic-route:') ? 'semantic' : 'deterministic',
    uses_private_context: policy.usePrivateContext,
  };
}

export function buildUnifiedChatToolTelemetry(
  events: readonly AgentToolLoopEvent[],
): UnifiedChatTelemetryProperties[] {
  return events.flatMap((event) => {
    if (!event.toolId || (event.type !== 'tool_completed' && event.type !== 'unknown_tool' && event.type !== 'repeated_tool_call')) {
      return [];
    }
    return [{
      tool_id: event.toolId,
      outcome: event.type === 'unknown_tool'
        ? 'unsupported'
        : event.type === 'repeated_tool_call'
          ? 'repeated_call_blocked'
          : event.resultStatus ?? 'unknown',
      loop_event: event.type,
      round: event.round,
    }];
  });
}

export function buildUnifiedChatReconciliationTelemetry(
  before: UnifiedChatThreadAggregate,
  after: UnifiedChatThreadAggregate,
): UnifiedChatTelemetryProperties[] {
  const priorById = new Map((before.receipts ?? []).map((receipt) => [receipt.id, receipt]));
  const counts = new Map<string, {
    capabilityId: string;
    outcome: 'applied' | 'failed';
    count: number;
  }>();
  for (const receipt of after.receipts ?? []) {
    const prior = priorById.get(receipt.id);
    if (prior?.status !== 'reserved' || (receipt.status !== 'applied' && receipt.status !== 'failed')) continue;
    const key = `${receipt.capabilityId}:${receipt.status}`;
    const current = counts.get(key);
    counts.set(key, {
      capabilityId: receipt.capabilityId,
      outcome: receipt.status,
      count: (current?.count ?? 0) + 1,
    });
  }
  return [...counts.values()].map((record) => ({
    capability_id: record.capabilityId,
    outcome: record.outcome,
    receipt_count: record.count,
    trigger: 'thread_load',
  }));
}
