import type { AgentToolLoopEvent, AppControlOutcome } from '@kwilt/agent-runtime';
import type { ActivityProposalOperation } from './activityProposal';
import type { UnifiedChatCapabilitySnapshots } from './capabilityAdapters';
import { buildPlanPlacementReferent, type PlanPlacementConversationReferent } from './planConversationReferent';
import {
  buildPendingWorkConversationReferent,
  type PendingWorkConversationReferentItem,
} from './conversationReferent';
import type { UnifiedChatRequestPolicy } from './requestPolicy';
import type { UnifiedChatRepository } from './threadRepository';
import type { ExecutedUnifiedChatTurn } from './turnExecutionPhase';
import type { UnifiedChatMessage, UnifiedChatRun } from './types';
import { toLocalDateKey } from '../../services/plan/planDates';

type OutcomeRepository = Pick<
  UnifiedChatRepository,
  'insertMessage' | 'createProposal' | 'createClientAction' | 'appendRunEvents' | 'createArtifact'
>;

type ToolProvider = ExecutedUnifiedChatTurn['toolProvider'];
type ActionResponse = ExecutedUnifiedChatTurn['actionResponse'];

export function buildAppControlOutcome({
  text,
  proposalIds,
  receiptIds,
  clientActionIds,
}: {
  text: string;
  proposalIds: string[];
  receiptIds: string[];
  clientActionIds: string[];
}): AppControlOutcome {
  if (receiptIds.length > 0) return { type: 'applied', receiptIds };
  if (proposalIds.length > 0) return { type: 'review', proposalIds };
  if (clientActionIds.length > 0) {
    return { type: 'native_handoff', actionId: clientActionIds[0]! };
  }
  return { type: 'answer', text };
}

function withProposalMetadata<T extends ActivityProposalOperation>(
  operation: T,
  summary: string,
  idempotencyKey: string,
): T & { summary: string; idempotencyKey: string } {
  return { ...operation, summary, idempotencyKey };
}

export type MaterializeUnifiedChatOutcomePhaseInput = {
  threadId: string;
  run: UnifiedChatRun;
  visibleBody: string;
  actionResponse: ActionResponse;
  toolProvider: ToolProvider;
  runtimeToolEvents: readonly AgentToolLoopEvent[];
  artifactDraft?: ExecutedUnifiedChatTurn['artifactDraft'];
  requestPolicy: UnifiedChatRequestPolicy;
  snapshots: UnifiedChatCapabilitySnapshots;
  planConversationReferent: PlanPlacementConversationReferent | null;
  repository: OutcomeRepository;
  setFailureCode: (code: string) => void;
};

export type MaterializedUnifiedChatOutcome = {
  assistantMessage: UnifiedChatMessage;
  appControlOutcome: AppControlOutcome;
};

export async function materializeUnifiedChatOutcomePhase(
  input: MaterializeUnifiedChatOutcomePhaseInput,
): Promise<MaterializedUnifiedChatOutcome> {
  const stagedToolProposals = input.toolProvider.proposals();
  const stagedClientActions = input.toolProvider.clientActions();
  const hasAuthoritativeNextStep = Boolean(input.actionResponse?.proposal) ||
    stagedToolProposals.length > 0 || stagedClientActions.length > 0;
  const claimsCompletedEffect = /\b(?:done|completed|created|updated|deleted|applied|scheduled|changed|saved|sent)\b/i
    .test(input.visibleBody);
  if (
    (input.requestPolicy.requestClass === 'capability_action' ||
      input.requestPolicy.requestClass === 'native_control') &&
    !hasAuthoritativeNextStep &&
    claimsCompletedEffect
  ) {
    input.setFailureCode('action_outcome_missing');
    throw new Error('Action-looking prose did not have an authoritative outcome.');
  }

  input.setFailureCode('assistant_persistence_failed');
  const assistantMessage = await input.repository.insertMessage({
    threadId: input.threadId,
    role: 'assistant',
    body: input.visibleBody,
  });
  if (input.artifactDraft) {
    input.setFailureCode('artifact_persistence_failed');
    await input.repository.createArtifact({
      threadId: input.threadId, runId: input.run.id, messageId: assistantMessage.id,
      ...input.artifactDraft,
    });
  }
  const proposalIds: string[] = [];
  const pendingWorkReferentItems: PendingWorkConversationReferentItem[] = [];
  const receiptIds: string[] = [];
  const clientActionIds: string[] = [];
  const persistProposal = async (
    proposal: Parameters<OutcomeRepository['createProposal']>[0],
  ) => {
    const created = await input.repository.createProposal(proposal);
    proposalIds.push(created.id);
    const operation = proposal.operation as {
      type: string;
      targetId: string | null;
      expectedUpdatedAt?: unknown;
      payload?: { expectedUpdatedAt?: unknown };
    };
    const expectedUpdatedAt = typeof operation.expectedUpdatedAt === 'string'
      ? operation.expectedUpdatedAt
      : typeof operation.payload?.expectedUpdatedAt === 'string'
        ? operation.payload.expectedUpdatedAt
        : null;
    pendingWorkReferentItems.push({
      proposalId: created.id,
      expectedVersion: typeof created.version === 'number' ? created.version : 1,
      capabilityId: proposal.capabilityId,
      operationType: operation.type,
      targetId: operation.targetId,
      expectedUpdatedAt,
      label: proposal.title,
      sequence: pendingWorkReferentItems.length + 1,
    });
    return created;
  };

  if (input.actionResponse?.proposal) {
    input.setFailureCode('proposal_persistence_failed');
    const operation = input.actionResponse.proposal.operation;
    await persistProposal({
      threadId: input.threadId,
      runId: input.run.id,
      messageId: assistantMessage.id,
      capabilityId: 'todos',
      title: input.actionResponse.proposal.title,
      body: input.actionResponse.proposal.body,
      permissionPolicy: { requiresExplicitApproval: true },
      operation: withProposalMetadata(
        operation,
        input.actionResponse.proposal.title,
        `unified-chat:${input.run.id}:1`,
      ),
    });
  }

  if (input.runtimeToolEvents.length > 0) {
    await input.repository.appendRunEvents({
      threadId: input.threadId,
      runId: input.run.id,
      events: input.runtimeToolEvents
        .filter((event) => event.type !== 'model_step')
        .map((event, index) => ({
          sequence: 4 + index,
          type: 'tool',
          status: event.type === 'tool_completed' ? 'complete' as const : 'warning' as const,
          visibility: 'internal' as const,
          label: event.type === 'tool_completed'
            ? `Used ${event.toolId ?? 'a Kwilt tool'}`
            : `Tool boundary: ${event.type}`,
          detail: event.resultStatus ? `Result: ${event.resultStatus}` : undefined,
          payload: {
            toolId: event.toolId ?? null,
            toolCallId: event.toolCallId ?? null,
            resultStatus: event.resultStatus ?? null,
          },
        })),
    });
  }

  const nextPlanConversationReferent =
    input.requestPolicy.policyReason === 'day-plan-recommendation' && input.snapshots.plan
      ? buildPlanPlacementReferent(input.snapshots.plan)
      : input.planConversationReferent;
  const referentWasStaged = nextPlanConversationReferent
    ? stagedToolProposals.some((proposal) =>
        proposal.capabilityId === 'plan' &&
        proposal.operation.targetId === nextPlanConversationReferent.activityId)
    : false;
  if (nextPlanConversationReferent && !referentWasStaged) {
    const persistedToolEventCount = input.runtimeToolEvents
      .filter((event) => event.type !== 'model_step').length;
    await input.repository.appendRunEvents({
      threadId: input.threadId,
      runId: input.run.id,
      events: [{
        sequence: 4 + persistedToolEventCount,
        type: 'conversation_referent',
        status: 'complete',
        visibility: 'internal',
        label: 'Plan item awaiting placement',
        detail: null,
        payload: nextPlanConversationReferent,
      }],
    });
  }
  const persistedPlanReferent = Boolean(nextPlanConversationReferent && !referentWasStaged);

  for (const [index, proposal] of stagedToolProposals.entries()) {
    input.setFailureCode('proposal_persistence_failed');
    const common = {
      threadId: input.threadId,
      runId: input.run.id,
      messageId: assistantMessage.id,
      title: proposal.title,
      body: proposal.body,
      permissionPolicy: { requiresExplicitApproval: true as const },
    };
    if (proposal.capabilityId === 'screenTime') {
      await persistProposal({
        ...common,
        capabilityId: 'screenTime',
        operation: {
          ...proposal.operation,
          summary: proposal.title,
          idempotencyKey: `unified-chat:${input.run.id}:tool:${index + 1}`,
        },
      });
    } else if (proposal.capabilityId === 'todos') {
      await persistProposal({
        ...common,
        capabilityId: 'todos',
        operation: withProposalMetadata(
          proposal.operation,
          proposal.title,
          `unified-chat:${input.run.id}:tool:${index + 1}`,
        ),
      });
    } else if (proposal.capabilityId === 'plan') {
      await persistProposal({
        ...common,
        capabilityId: 'plan',
        operation: {
          ...proposal.operation,
          summary: proposal.title,
          idempotencyKey: `unified-chat:${input.run.id}:tool:${index + 1}`,
        },
      });
    } else if (proposal.capabilityId === 'goals') {
      await persistProposal({
        ...common,
        capabilityId: 'goals',
        operation: {
          ...proposal.operation,
          summary: proposal.title,
          idempotencyKey: `unified-chat:${input.run.id}:tool:${index + 1}`,
        },
      });
    } else if (proposal.capabilityId === 'profile') {
      await persistProposal({
        ...common,
        capabilityId: 'profile',
        operation: {
          ...proposal.operation,
          summary: proposal.title,
          idempotencyKey: `unified-chat:${input.run.id}:tool:${index + 1}`,
        },
      });
    } else if (proposal.capabilityId === 'chapters') {
      await persistProposal({
        ...common,
        capabilityId: 'chapters',
        operation: {
          ...proposal.operation,
          summary: proposal.title,
          idempotencyKey: `unified-chat:${input.run.id}:tool:${index + 1}`,
        },
      });
    } else {
      await persistProposal({
        ...common,
        capabilityId: 'arcs',
        operation: {
          ...proposal.operation,
          summary: proposal.title,
          idempotencyKey: `unified-chat:${input.run.id}:tool:${index + 1}`,
        },
      });
    }
  }

  for (const [index, action] of stagedClientActions.entries()) {
    input.setFailureCode('client_action_persistence_failed');
    const createdAction = await input.repository.createClientAction({
      threadId: input.threadId,
      runId: input.run.id,
      messageId: assistantMessage.id,
      capabilityId: action.capabilityId,
      actionType: action.actionType,
      targetType: action.targetType,
      targetId: action.targetId,
      title: action.title,
      consequenceSummary: action.consequenceSummary,
      payload: action.payload,
      idempotencyKey: `unified-chat:${input.run.id}:client:${index + 1}`,
    });
    clientActionIds.push(createdAction.id);
  }

  const planSnapshot = input.requestPolicy.participatingCapabilities.includes('plan')
    ? input.snapshots.plan
    : undefined;
  if (input.requestPolicy.policyReason === 'day-plan-recommendation' && planSnapshot?.writeCalendarRef) {
    for (const recommendation of planSnapshot.recommendations) {
      if (recommendation.placement.status !== 'placed' || !recommendation.expectedUpdatedAt) continue;
      const start = new Date(recommendation.placement.startDate);
      const timeLabel = Number.isNaN(start.getTime())
        ? 'Tomorrow'
        : new Intl.DateTimeFormat('en-US', {
            weekday: 'short',
            hour: 'numeric',
            minute: '2-digit',
          }).format(start);
      await persistProposal({
        threadId: input.threadId,
        runId: input.run.id,
        messageId: assistantMessage.id,
        capabilityId: 'plan',
        title: recommendation.title,
        body: `${timeLabel}${recommendation.goalTitle ? ` · ${recommendation.goalTitle}` : ''}`,
        permissionPolicy: { requiresExplicitApproval: true },
        operation: {
          type: 'schedule_activity',
          targetId: recommendation.activityId,
          expectedUpdatedAt: recommendation.expectedUpdatedAt,
          payload: {
            activityId: recommendation.activityId,
            expectedUpdatedAt: recommendation.expectedUpdatedAt,
            startDate: recommendation.placement.startDate,
            endDate: recommendation.placement.endDate,
            targetDateKey: toLocalDateKey(new Date(planSnapshot.targetDate)),
            writeCalendarRef: planSnapshot.writeCalendarRef,
          },
          summary: `Add ${recommendation.title} to Plan`,
          idempotencyKey: `unified-chat:${input.run.id}:plan:${recommendation.activityId}`,
        },
      });
    }
  }

  if (pendingWorkReferentItems.length > 0) {
    const persistedToolEventCount = input.runtimeToolEvents
      .filter((event) => event.type !== 'model_step').length;
    await input.repository.appendRunEvents({
      threadId: input.threadId,
      runId: input.run.id,
      events: [{
        sequence: 4 + persistedToolEventCount + (persistedPlanReferent ? 1 : 0),
        type: 'conversation_referent',
        status: 'complete',
        visibility: 'internal',
        label: pendingWorkReferentItems.length === 1
          ? 'Work awaiting review'
          : `${pendingWorkReferentItems.length} changes awaiting review`,
        detail: null,
        payload: buildPendingWorkConversationReferent(pendingWorkReferentItems),
      }],
    });
  }

  return {
    assistantMessage,
    appControlOutcome: buildAppControlOutcome({
      text: input.visibleBody,
      proposalIds,
      receiptIds,
      clientActionIds,
    }),
  };
}
