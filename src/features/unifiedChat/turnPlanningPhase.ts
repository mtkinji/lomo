import type { UnifiedChatContextRef, UnifiedChatThreadAggregate } from './types';
import {
  classifyCurrentInformationNeed,
  classifyUnifiedChatRequest,
  type UnifiedChatRequestPolicy,
} from './requestPolicy';
import {
  resolveHybridRequestPolicy,
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

export type PlanUnifiedChatTurnPhaseInput = {
  prompt: string;
  aggregate: UnifiedChatThreadAggregate;
  activeContext: UnifiedChatContextRef[];
  routeRequest: (
    input: RouteUnifiedChatRequestInput,
  ) => Promise<SemanticRequestRoute | null>;
};

export type PlannedUnifiedChatTurn = {
  requestPolicy: UnifiedChatRequestPolicy;
  requiresWebSearch: boolean;
  planConversationReferent: PlanPlacementConversationReferent | null;
  activityClarification: string | null;
};

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
  const semanticRoute = shouldAttemptSemanticRouting({
    prompt: input.prompt,
    deterministicPolicy,
  })
    ? await input.routeRequest({
        prompt: input.prompt,
        visibleContext: input.activeContext.map((context) => ({
          capabilityId: context.capabilityId,
          objectType: context.objectType,
          objectId: context.objectId,
          label: context.label,
        })),
        recentTurns: input.aggregate.messages.slice(-6).map((message) => ({
          role: message.role,
          content: message.body,
        })),
      })
    : null;
  const previousRun = input.aggregate.runs.at(-1);
  const requestPolicy = resolveHybridRequestPolicy({
    prompt: input.prompt,
    deterministicPolicy,
    semanticRoute,
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
  });

  return {
    requestPolicy,
    requiresWebSearch: requestPolicy.requestClass === 'general' && (
      semanticRoute?.informationNeed === 'current' ||
      classifyCurrentInformationNeed(input.prompt) === 'current'
    ),
    planConversationReferent: requestPolicy.policyReason === 'conversation-follow-up:plan'
      ? resolvePlanPlacementReferent(input.aggregate)
      : null,
    activityClarification: requestPolicy.participatingCapabilities.includes('todos')
      ? recurringReminderClarification(input.prompt)
      : null,
  };
}
