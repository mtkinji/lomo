import type { AgentToolLoopEvent } from '@kwilt/agent-runtime';
import type { UnifiedChatRequestPolicy } from './requestPolicy';
import type { UnifiedChatThreadAggregate } from './types';
import type { UnifiedChatProposal } from './types';
import type { AgentJudgment } from './agentJudgment';
import type { UnifiedChatCapabilityId, UnifiedChatRequestClass } from './requestPolicy';
import type { BuiltRunContext } from './capabilityContracts';
import type { UnifiedChatTurnContract } from './turnContract';
import type { UnifiedChatActionOutcomeTruth } from './turnOutcomeTruth';

export type UnifiedChatTelemetryProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

export type UnifiedChatJudgmentSource = 'model' | 'semantic_fallback' | 'deterministic_fallback';

export type UnifiedChatLatencyBucket =
  | 'under_1s'
  | '1_2s'
  | '2_3s'
  | '3_6s'
  | '6_10s'
  | 'over_10s';

function latencyBucket(milliseconds: number): UnifiedChatLatencyBucket {
  if (milliseconds < 1_000) return 'under_1s';
  if (milliseconds < 2_000) return '1_2s';
  if (milliseconds < 3_000) return '2_3s';
  if (milliseconds < 6_000) return '3_6s';
  if (milliseconds < 10_000) return '6_10s';
  return 'over_10s';
}

export function buildUnifiedChatConversationLatencyTelemetry(input: {
  outcome: 'completed' | 'interrupted' | 'failed';
  planningStrategy: 'fast_direct' | 'full';
  requestClass: UnifiedChatRequestClass;
  timings: Readonly<Record<string, number>>;
  interrupted: boolean;
  fallbackUsed: boolean;
}): UnifiedChatTelemetryProperties {
  const timingKeys = [
    ['transcript_final_ms', 'transcript_final_bucket'],
    ['planning_complete_ms', 'planning_complete_bucket'],
    ['context_ready_ms', 'context_ready_bucket'],
    ['answer_ready_ms', 'answer_ready_bucket'],
    ['first_progress_audio_ms', 'first_progress_audio_bucket'],
    ['first_audio_ms', 'first_audio_bucket'],
  ] as const;
  return timingKeys.reduce<UnifiedChatTelemetryProperties>((result, [inputKey, outputKey]) => {
    const value = input.timings[inputKey];
    if (typeof value === 'number' && Number.isFinite(value)) {
      result[outputKey] = latencyBucket(Math.max(0, value));
    }
    return result;
  }, {
    outcome: input.outcome,
    planning_strategy: input.planningStrategy,
    request_class: input.requestClass,
    interrupted: input.interrupted,
    fallback_used: input.fallbackUsed,
  });
}

function confidenceBucket(confidence: number): 'low' | 'medium' | 'high' {
  if (confidence < 0.5) return 'low';
  if (confidence < 0.8) return 'medium';
  return 'high';
}

export function buildUnifiedChatFreshEntryTelemetry(
  source: string | undefined,
  outcome: 'first_send' | 'abandoned' | 'thread_creation_failed',
): UnifiedChatTelemetryProperties {
  return {
    entry_source: source === 'widget' ? 'widget' : 'other',
    outcome,
  };
}

export function buildUnifiedChatAgentJudgmentTelemetry(
  judgment: AgentJudgment | null,
  source: UnifiedChatJudgmentSource,
  fallback?: {
    requestClass: UnifiedChatRequestClass;
    participatingCapabilities: readonly UnifiedChatCapabilityId[];
  },
): UnifiedChatTelemetryProperties {
  const capabilityIds = judgment?.participatingCapabilities ?? fallback?.participatingCapabilities ?? [];
  const toolIds = judgment
    ? [...new Set(judgment.steps.flatMap((step) => step.toolId ? [step.toolId] : []))]
    : [];
  const constraintKinds = judgment
    ? [...new Set(judgment.constraints.map((constraint) => constraint.kind))]
    : [];
  return {
    judgment_source: source,
    request_class: judgment?.requestClass ?? fallback?.requestClass ?? 'general',
    execution_mode: judgment?.executionMode ?? null,
    capability_ids: capabilityIds.join(','),
    tool_ids: toolIds.join(','),
    step_count: judgment?.steps.length ?? 0,
    constraint_kinds: constraintKinds.join(','),
    confidence_bucket: judgment ? confidenceBucket(judgment.confidence) : null,
  };
}

export function buildUnifiedChatAgentPlanOutcomeTelemetry(
  judgment: AgentJudgment | null,
  source: UnifiedChatJudgmentSource,
  outcome: string,
  failureCode: string | null,
  fallback?: {
    requestClass: UnifiedChatRequestClass;
    participatingCapabilities: readonly UnifiedChatCapabilityId[];
  },
  reliability?: {
    attemptNumber: number;
    recoveryAttempted: boolean;
    terminalFailure: boolean;
  },
): UnifiedChatTelemetryProperties {
  return {
    ...buildUnifiedChatAgentJudgmentTelemetry(judgment, source, fallback),
    outcome,
    failure_code: failureCode,
    ...(reliability
      ? {
          attempt_number: reliability.attemptNumber,
          recovery_attempted: reliability.recoveryAttempted,
          terminal_failure: reliability.terminalFailure,
        }
      : {}),
  };
}

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

export function buildUnifiedChatOperationalTelemetry({
  turnContract,
  context,
  actionOutcomeTruth,
}: {
  turnContract: UnifiedChatTurnContract;
  context: BuiltRunContext;
  actionOutcomeTruth: UnifiedChatActionOutcomeTruth;
}): UnifiedChatTelemetryProperties {
  return {
    turn_contract_version: turnContract.schemaVersion,
    request_class: turnContract.requestClass,
    capability_ids: turnContract.participatingCapabilities.join(','),
    target_scope: turnContract.action?.targetScope ?? null,
    referent_kind: turnContract.referent?.kind ?? null,
    considered_count: context.coverage.consideredCount,
    included_count: context.coverage.includedCount,
    omitted_count: context.coverage.omittedCount,
    prepared_change_count: actionOutcomeTruth.preparedChangeCount,
    failed_tool_count: actionOutcomeTruth.failedToolCount,
    invariant_codes: actionOutcomeTruth.invariantCodes.join(','),
    outcome_state: actionOutcomeTruth.state,
  };
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

export function buildFamilyScreenTimeDecisionTelemetry(
  proposal: Extract<UnifiedChatProposal, { capabilityId: 'screenTime' }>,
  action: 'edit' | 'reject' | 'defer' | 'approve',
  outcome?: 'saved' | 'failed' | 'not_applied',
): UnifiedChatTelemetryProperties {
  return {
    capability_id: 'screenTime',
    operation_type: proposal.operation.type,
    decision: action,
    target_count: proposal.operation.type === 'create_family_screen_time_prerequisite_agreement'
      ? 1
      : proposal.operation.payload.targets.length,
    time_basis: proposal.operation.type === 'create_family_screen_time_prerequisite_agreement'
      ? 'foreground_usage_prerequisite'
      : proposal.operation.payload.timeBasis,
    ...(proposal.operation.type === 'create_family_screen_time_prerequisite_agreement'
      ? {
          threshold_minutes_bucket: proposal.operation.payload.rule.prerequisiteActivity.thresholdMinutes <= 5
            ? '1_5'
            : proposal.operation.payload.rule.prerequisiteActivity.thresholdMinutes <= 15 ? '6_15' : '16_plus',
        }
      : {}),
    ...(outcome ? { outcome } : {}),
  };
}
