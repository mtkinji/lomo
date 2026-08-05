import type { AgentToolLoopEvent } from '@kwilt/agent-runtime';
import type { BuiltRunContext } from './capabilityContracts';
import type { UnifiedChatTurnContract } from './turnContract';

export type UnifiedChatTurnInvariantCode =
  | 'incomplete_action_inventory'
  | 'unresolved_action_targets'
  | 'uncovered_action_targets'
  | 'loaded_records_access_contradiction'
  | 'success_without_authoritative_work';

export type UnifiedChatActionOutcomeTruth = {
  state: 'not_action' | 'prepared' | 'failed' | 'model_response';
  visibleBody: string | null;
  invariantCodes: UnifiedChatTurnInvariantCode[];
  loadedRecordCount: number;
  preparedChangeCount: number;
  failedToolCount: number;
};

const ACCESS_DENIAL_PATTERN =
  /(?:\b(?:can(?:not|'t)|unable to)\s+(?:access|see|read|view)\b|\bno visibility\b|\bdon't have (?:access|visibility)\b)/i;
const COMPLETED_ACTION_PATTERN =
  /\b(?:i|kwilt)\s+(?:have\s+|successfully\s+)?(?:renamed|updated|created|changed|applied|scheduled|completed|deleted|removed)\b/i;

export function collectCoveredActionTargetIds(
  value: unknown,
  expectedTargetIds: ReadonlySet<string>,
): string[] {
  const covered = new Set<string>();
  const visit = (candidate: unknown): void => {
    if (typeof candidate === 'string') {
      if (expectedTargetIds.has(candidate)) covered.add(candidate);
      return;
    }
    if (Array.isArray(candidate)) {
      for (const item of candidate) visit(item);
      return;
    }
    if (typeof candidate === 'object' && candidate !== null) {
      for (const item of Object.values(candidate)) visit(item);
    }
  };
  visit(value);
  return [...covered];
}

export function evaluateTurnContextInvariants(
  turnContract: UnifiedChatTurnContract,
  context: BuiltRunContext,
): UnifiedChatTurnInvariantCode[] {
  if (turnContract.requestClass !== 'capability_action' || !turnContract.action) return [];
  const codes: UnifiedChatTurnInvariantCode[] = [];
  if (
    turnContract.action.targetScope === 'all_matching' &&
    context.coverage.omittedCount > 0
  ) codes.push('incomplete_action_inventory');
  if (
    turnContract.action.targetScope === 'all_matching' &&
    context.coverage.consideredCount > 0 &&
    context.coverage.includedCount === 0
  ) codes.push('unresolved_action_targets');
  return codes;
}

export function preflightActionBoundary(
  turnContract: UnifiedChatTurnContract,
  context: BuiltRunContext,
): string | null {
  const codes = evaluateTurnContextInvariants(turnContract, context);
  if (codes.includes('incomplete_action_inventory')) {
    return 'I found more matching Kwilt records than I can safely prepare in one review. Nothing was changed.';
  }
  if (codes.includes('unresolved_action_targets')) {
    return 'I found the capability data, but I couldn\'t resolve the exact records required for that change. Nothing was changed.';
  }
  if (codes.includes('uncovered_action_targets')) {
    return 'I could not prepare the requested change for every matching record, so I discarded the partial batch. Nothing was changed.';
  }
  return null;
}

export function projectActionOutcomeTruth({
  turnContract,
  context,
  runtimeToolEvents,
  preparedChangeCount,
  preparedChangeTitles = [],
  coveredTargetIds = [],
  modelResponse,
}: {
  turnContract: UnifiedChatTurnContract;
  context: BuiltRunContext;
  runtimeToolEvents: readonly AgentToolLoopEvent[];
  preparedChangeCount: number;
  preparedChangeTitles?: readonly string[];
  coveredTargetIds?: readonly string[];
  modelResponse: string;
}): UnifiedChatActionOutcomeTruth {
  const failedToolCount = runtimeToolEvents.filter((event) =>
    event.type === 'tool_completed' &&
    (event.resultStatus === 'failed' || event.resultStatus === 'unavailable')).length;
  const invariantCodes = evaluateTurnContextInvariants(turnContract, context);
  if (turnContract.requestClass !== 'capability_action') {
    return {
      state: 'not_action', visibleBody: null, invariantCodes,
      loadedRecordCount: context.evidence.length, preparedChangeCount, failedToolCount,
    };
  }

  if (turnContract.action?.targetScope === 'all_matching' && preparedChangeCount > 0) {
    const covered = new Set(coveredTargetIds);
    if (context.evidence.some((item) => !covered.has(item.object.id))) {
      invariantCodes.push('uncovered_action_targets');
    }
  }

  if (preparedChangeCount > 0 && !invariantCodes.includes('uncovered_action_targets')) {
    return {
      state: 'prepared',
      visibleBody: preparedChangeCount === 1 && preparedChangeTitles[0]
        ? `I prepared “${preparedChangeTitles[0]}” for review.`
        : preparedChangeCount === 1
          ? 'I prepared 1 change for review.'
        : `I prepared ${preparedChangeCount} changes for review.`,
      invariantCodes,
      loadedRecordCount: context.evidence.length,
      preparedChangeCount,
      failedToolCount,
    };
  }

  if (context.evidence.length > 0 && ACCESS_DENIAL_PATTERN.test(modelResponse)) {
    invariantCodes.push('loaded_records_access_contradiction');
  }
  if (COMPLETED_ACTION_PATTERN.test(modelResponse)) {
    invariantCodes.push('success_without_authoritative_work');
  }

  if (invariantCodes.includes('incomplete_action_inventory') ||
      invariantCodes.includes('unresolved_action_targets') ||
      invariantCodes.includes('uncovered_action_targets')) {
    return {
      state: 'failed',
      visibleBody: invariantCodes.includes('uncovered_action_targets')
        ? 'I could not prepare the requested change for every matching record, so I discarded the partial batch. Nothing was changed.'
        : preflightActionBoundary(turnContract, context),
      invariantCodes,
      loadedRecordCount: context.evidence.length, preparedChangeCount, failedToolCount,
    };
  }
  if (invariantCodes.includes('success_without_authoritative_work')) {
    return {
      state: 'failed',
      visibleBody: 'I couldn\'t verify or prepare those changes. Nothing was changed.',
      invariantCodes,
      loadedRecordCount: context.evidence.length, preparedChangeCount, failedToolCount,
    };
  }
  if (failedToolCount > 0 || invariantCodes.includes('loaded_records_access_contradiction')) {
    return {
      state: 'failed',
      visibleBody: context.evidence.length > 0
        ? 'I found the current Kwilt records, but I couldn\'t prepare those changes safely. Nothing was changed. Please try again.'
        : 'I couldn\'t prepare those changes safely. Nothing was changed. Please try again.',
      invariantCodes,
      loadedRecordCount: context.evidence.length, preparedChangeCount, failedToolCount,
    };
  }
  return {
    state: 'model_response', visibleBody: null, invariantCodes,
    loadedRecordCount: context.evidence.length, preparedChangeCount, failedToolCount,
  };
}
