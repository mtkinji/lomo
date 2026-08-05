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

export type PlanUnifiedChatTurnPhaseInput = {
  prompt: string;
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
};

export type PlannedUnifiedChatTurn = {
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
  if (judgment.requestClass === 'capability_action') {
    return selectedTools.some((tool) => tool.effect === 'write');
  }
  if (judgment.requestClass === 'capability_question') {
    return selectedTools.every((tool) => tool.effect === 'read');
  }
  return true;
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
  const requestedAgentJudgment = shouldAttemptAgentJudgment(deterministicPolicy)
    ? await input.requestJudgment({
        prompt: buildAgentJudgmentPrompt({
          prompt: input.prompt,
          now: input.now,
          timeZone: input.timeZone,
          visibleContext,
          recentTurns,
          pendingWorkSummary: pendingWorkSummary(input.aggregate),
          tools: UNIFIED_CHAT_TOOL_CATALOG,
        }),
        allowedToolIds: new Set(UNIFIED_CHAT_TOOL_CATALOG.map((tool) => tool.id)),
        signal: input.signal,
      })
    : null;
  const agentJudgment = requestedAgentJudgment && hasCoherentExecutionPlan(requestedAgentJudgment)
    ? requestedAgentJudgment
    : null;
  const semanticRoute = !agentJudgment && shouldAttemptSemanticRouting({
    prompt: input.prompt,
    deterministicPolicy,
  })
    ? await input.routeRequest({
        prompt: input.prompt,
        visibleContext,
        recentTurns,
      })
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
  const judgmentSource = agentJudgment
    ? 'model'
    : semanticRoute
      ? 'semantic_fallback'
      : 'deterministic_fallback';
  const activityClarification = agentJudgment?.executionMode === 'clarify'
    ? agentJudgment.clarificationQuestion
    : requestPolicy.participatingCapabilities.includes('todos')
      ? recurringReminderClarification(input.prompt)
      : null;
  const turnContract = buildUnifiedChatTurnContract({
    prompt: input.prompt,
    requestPolicy,
    agentJudgment,
    previous: previousTurnContract,
  });

  return {
    requestPolicy,
    agentJudgment,
    judgmentSource,
    requiresWebSearch: requestPolicy.requestClass === 'general' &&
      (agentJudgment?.informationNeed ?? classifyCurrentInformationNeed(input.prompt)) === 'current',
    planConversationReferent: requestPolicy.policyReason === 'conversation-follow-up:plan'
      ? resolvePlanPlacementReferent(input.aggregate)
      : null,
    activityClarification,
    turnContract,
  };
}
