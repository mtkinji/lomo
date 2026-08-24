import type { UnifiedChatContextRef, UnifiedChatThreadAggregate } from './types';
import {
  classifyCurrentInformationNeed,
  classifyUnifiedChatRequest,
  type UnifiedChatRequestPolicy,
} from './requestPolicy';
import {
  resolveHybridRequestPolicy,
  shouldAttemptAgentJudgment,
  shouldAttemptSemanticRouting,
} from './hybridRequestPolicy';
import type { RouteUnifiedChatRequestInput } from './routeUnifiedChatRequest';
import type { SemanticRequestRoute } from './semanticRequestRouter';
import {
  recurringReminderClarification,
} from './activityProposal';
import {
  resolvePlanPlacementReferent,
  type PlanPlacementConversationReferent,
} from './planConversationReferent';
import type { AgentJudgment } from './agentJudgment';
import { buildAgentJudgmentPrompt } from './agentJudgmentPrompt';
import type {
  RequestAgentJudgmentInput,
} from './requestAgentJudgment';
import { UNIFIED_CHAT_TOOL_CATALOG } from './toolCatalog';
import { resolveConversationReferent } from './conversationReferent';
import {
  buildUnifiedChatTurnContract,
  resolveLatestTurnContract,
  type UnifiedChatTurnContract,
} from './turnContract';
import {
  resolveConversationPlanningStrategy,
  type ConversationPlanningStrategy,
} from '../liveConversation/conversationTurnProfile';
import {
  chooseConversationProgressCue,
  resolveConversationProgressFamily,
  type ConversationProgressCueId,
} from '../liveConversation/conversationProgressCue';
import { runWithPlanningBudget } from './planningBudget';

const DEFAULT_PLANNING_BUDGET_MS = 5_000;

export type PlanUnifiedChatTurnPhaseInput = {
  prompt: string;
  interactionMode: 'text' | 'conversation';
  attachmentCount: number;
  turnId?: string;
  recentProgressCueIds?: readonly ConversationProgressCueId[];
  onProgressCue?: (cueId: ConversationProgressCueId) => void;
  aggregate: UnifiedChatThreadAggregate;
  activeContext: UnifiedChatContextRef[];
  routeRequest: (
    input: RouteUnifiedChatRequestInput,
  ) => Promise<SemanticRequestRoute | null>;
  requestJudgment: (
    input: RequestAgentJudgmentInput,
  ) => Promise<AgentJudgment | null>;
  now: Date;
  timeZone: string;
  signal?: AbortSignal;
  planningBudgetMs?: number;
};

export type PlannedUnifiedChatTurn = {
  planningStrategy: ConversationPlanningStrategy;
  requestPolicy: UnifiedChatRequestPolicy;
  agentJudgment: AgentJudgment | null;
  judgmentSource: 'model' | 'semantic_fallback' | 'deterministic_fallback';
  requiresWebSearch: boolean;
  planConversationReferent: PlanPlacementConversationReferent | null;
  activityClarification: string | null;
  turnContract: UnifiedChatTurnContract;
};

function pendingWorkSummary(aggregate: UnifiedChatThreadAggregate): string | null {
  const referent = resolveConversationReferent(aggregate);
  if (!referent) return null;
  if (referent.kind === 'pending_work') {
    return referent.items
      .map((item) => `${item.sequence}. ${item.label} [${item.capabilityId}; ${item.operationType}]`)
      .join('\n');
  }
  return `Awaiting Plan placement: ${referent.title} on ${referent.targetDate}.`;
}

function routeFromJudgment(judgment: AgentJudgment): SemanticRequestRoute {
  return {
    requestClass: judgment.requestClass,
    participatingCapabilities: judgment.participatingCapabilities,
    usePrivateContext: judgment.usePrivateContext,
    informationNeed: judgment.informationNeed,
    confidence: judgment.confidence,
    reason: judgment.reason,
  };
}

function hasCoherentExecutionPlan(judgment: AgentJudgment): boolean {
  const toolsById = new Map(UNIFIED_CHAT_TOOL_CATALOG.map((tool) => [tool.id, tool]));
  const selectedTools = judgment.steps.flatMap((step) => {
    if (!step.toolId) return [];
    const tool = toolsById.get(step.toolId);
    return tool ? [tool] : [];
  });
  if (selectedTools.length !== judgment.steps.filter((step) => step.toolId).length) return false;
  if (selectedTools.some((tool) => !judgment.participatingCapabilities.includes(
    tool.capabilityId as UnifiedChatRequestPolicy['participatingCapabilities'][number],
  ))) return false;
  if (judgment.usePrivateContext !== (judgment.evidenceScope !== 'none')) return false;
  if (judgment.usePrivateContext && judgment.responseContract !== 'evidence_linked') return false;
  if (judgment.requestClass !== 'capability_action' && judgment.authorization !== 'none') return false;
  if (judgment.requestClass === 'capability_action') {
    return judgment.authorization !== 'none' && selectedTools.some((tool) => tool.effect === 'write');
  }
  if (judgment.requestClass === 'capability_question') {
    return judgment.authorization === 'none' && selectedTools.every((tool) => tool.effect === 'read');
  }
  return judgment.authorization === 'none' && selectedTools.every((tool) => tool.effect === 'read');
}

function alignJudgmentToResolvedPolicy(
  judgment: AgentJudgment,
  policy: UnifiedChatRequestPolicy,
): AgentJudgment | null {
  if (judgment.requestClass !== policy.requestClass) return null;
  const judgmentCapabilities = [...new Set(judgment.participatingCapabilities)].sort();
  const policyCapabilities = [...new Set(policy.participatingCapabilities)].sort();
  if (judgmentCapabilities.length !== policyCapabilities.length ||
      !judgmentCapabilities.every((capability, index) => capability === policyCapabilities[index])) {
    return null;
  }
  if (judgment.usePrivateContext === policy.usePrivateContext) return judgment;
  return {
    ...judgment,
    usePrivateContext: policy.usePrivateContext,
    evidenceScope: policy.usePrivateContext
      ? judgment.evidenceScope === 'none' ? 'focused' : judgment.evidenceScope
      : 'none',
    responseContract: policy.usePrivateContext ? 'evidence_linked' : 'direct',
  };
}

export async function planUnifiedChatTurnPhase(
  input: PlanUnifiedChatTurnPhaseInput,
): Promise<PlannedUnifiedChatTurn> {
  const deterministicPolicy = classifyUnifiedChatRequest({
    prompt: input.prompt,
    context: input.activeContext.map((context) => ({
      capabilityId: context.capabilityId,
      objectType: context.objectType,
      objectId: context.objectId,
    })),
  });
  const informationNeed = classifyCurrentInformationNeed(input.prompt);
  const currentPendingWorkSummary = pendingWorkSummary(input.aggregate);
  const planningStrategy = resolveConversationPlanningStrategy({
    prompt: input.prompt,
    interactionMode: input.interactionMode,
    requestClass: deterministicPolicy.requestClass,
    usePrivateContext: deterministicPolicy.usePrivateContext,
    participatingCapabilityCount: deterministicPolicy.participatingCapabilities.length,
    informationNeed,
    attachmentCount: input.attachmentCount,
    activeContextCount: input.activeContext.length,
    hasPendingWork: currentPendingWorkSummary !== null,
  });
  if (input.interactionMode === 'conversation') {
    const progressFamily = resolveConversationProgressFamily({
      planningStrategy,
      requestClass: deterministicPolicy.requestClass,
      capabilityIds: deterministicPolicy.participatingCapabilities,
      informationNeed,
      ...(input.aggregate.runs.at(-1)?.status === 'failed'
        ? { recoveryKind: 'retry' as const }
        : {}),
    });
    if (progressFamily) {
      input.onProgressCue?.(chooseConversationProgressCue({
        family: progressFamily,
        turnId: input.turnId ?? input.aggregate.thread.id,
        recentCueIds: input.recentProgressCueIds ?? [],
      }));
    }
  }
  const visibleContext = input.activeContext.map((context) => ({
    capabilityId: context.capabilityId,
    objectType: context.objectType,
    objectId: context.objectId,
    label: context.label,
  }));
  const recentTurns = input.aggregate.messages.slice(-6).map((message) => ({
    role: message.role,
    content: message.body,
  }));
  const planningDeadline = Date.now() + (input.planningBudgetMs ?? DEFAULT_PLANNING_BUDGET_MS);
  const remainingPlanningMs = () => Math.max(0, planningDeadline - Date.now());
  const requestedAgentJudgment = planningStrategy === 'fast_direct'
    ? null
    : shouldAttemptAgentJudgment(deterministicPolicy)
    ? await runWithPlanningBudget(
        (signal) => input.requestJudgment({
          prompt: buildAgentJudgmentPrompt({
            prompt: input.prompt,
            now: input.now,
            timeZone: input.timeZone,
            visibleContext,
            recentTurns,
            pendingWorkSummary: currentPendingWorkSummary,
            tools: UNIFIED_CHAT_TOOL_CATALOG,
          }),
          allowedToolIds: new Set(UNIFIED_CHAT_TOOL_CATALOG.map((tool) => tool.id)),
          signal,
        }),
        { timeoutMs: remainingPlanningMs(), fallback: null, parentSignal: input.signal },
      )
    : null;
  const agentJudgment = requestedAgentJudgment && hasCoherentExecutionPlan(requestedAgentJudgment)
    ? requestedAgentJudgment
    : null;
  const semanticRoute = planningStrategy === 'fast_direct'
    ? null
    : !agentJudgment && shouldAttemptSemanticRouting({
    prompt: input.prompt,
    deterministicPolicy,
  })
    ? await runWithPlanningBudget(
        (signal) => input.routeRequest({
          prompt: input.prompt,
          visibleContext,
          recentTurns,
          signal,
        }),
        { timeoutMs: remainingPlanningMs(), fallback: null, parentSignal: input.signal },
      )
    : null;
  const previousRun = input.aggregate.runs.at(-1);
  const previousTurnContract = resolveLatestTurnContract(input.aggregate);
  const requestPolicy = resolveHybridRequestPolicy({
    prompt: input.prompt,
    deterministicPolicy,
    semanticRoute: agentJudgment ? routeFromJudgment(agentJudgment) : semanticRoute,
    allowAdditionalCapabilities: Boolean(agentJudgment),
    previousPolicy: previousRun?.requestClass
      ? {
          requestClass: previousRun.requestClass,
          participatingCapabilities: previousRun.participatingCapabilities,
          usePrivateContext: previousRun.contextPolicy.usePrivateContext === true,
        }
      : undefined,
    previousAssistantMessage: [...input.aggregate.messages]
      .reverse()
      .find((message) => message.role === 'assistant')?.body,
    previousTurnContract: previousTurnContract?.contract,
  });
  // A typed conversation follow-up can correctly override a model judgment
  // (for example, "add one" after discussing a missing Recipe). Do not let
  // that stale read-only judgment filter the resolved action's write tools.
  const effectiveAgentJudgment = agentJudgment
    ? alignJudgmentToResolvedPolicy(agentJudgment, requestPolicy)
    : null;
  const judgmentSource = effectiveAgentJudgment
    ? 'model'
    : semanticRoute
      ? 'semantic_fallback'
      : 'deterministic_fallback';
  const activityClarification = effectiveAgentJudgment?.executionMode === 'clarify'
    ? effectiveAgentJudgment.clarificationQuestion
    : requestPolicy.participatingCapabilities.includes('todos')
      ? recurringReminderClarification(input.prompt)
      : null;
  const turnContract = buildUnifiedChatTurnContract({
    prompt: input.prompt,
    requestPolicy,
    agentJudgment: effectiveAgentJudgment,
    previous: previousTurnContract,
  });

  return {
    planningStrategy,
    requestPolicy,
    agentJudgment: effectiveAgentJudgment,
    judgmentSource,
    requiresWebSearch: requestPolicy.requestClass === 'general' &&
      (effectiveAgentJudgment?.informationNeed ?? informationNeed) === 'current',
    planConversationReferent: requestPolicy.policyReason === 'conversation-follow-up:plan'
      ? resolvePlanPlacementReferent(input.aggregate)
      : null,
    activityClarification,
    turnContract,
  };
}
