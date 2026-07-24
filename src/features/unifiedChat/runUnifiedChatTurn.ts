import { sendCoachChat as defaultSendCoachChat, type CoachChatTurn } from '../../services/ai';
import {
  createUnifiedChatRepository,
  type UnifiedChatRepository,
} from './threadRepository';
import type { UnifiedChatThreadAggregate } from './types';
import {
  classifyUnifiedChatRequest,
  directTodoCaptureTitle,
  type UnifiedChatCapabilityId,
} from './requestPolicy';
import {
  resolveHybridRequestPolicy,
  shouldAttemptSemanticRouting,
} from './hybridRequestPolicy';
import {
  routeUnifiedChatRequest as defaultRouteUnifiedChatRequest,
  type RouteUnifiedChatRequestInput,
} from './routeUnifiedChatRequest';
import type { SemanticRequestRoute } from './semanticRequestRouter';
import { buildRunContext } from './buildRunContext';
import {
  collectCapabilityEvidence,
  type UnifiedChatCapabilitySnapshots,
} from './capabilityAdapters';
import type { BuiltRunContext } from './capabilityContracts';
import {
  ACTIVITY_ACTION_RESPONSE_FORMAT,
  parseActivityActionResponse,
  type ActivityProposalOperation,
} from './activityProposal';
import {
  formatGroundedAnswer,
  GROUNDED_ANSWER_RESPONSE_FORMAT,
  parseGroundedAnswer,
} from './groundedAnswer';
import { sanitizeVisibleAssistantText } from './visibleAssistantText';
import {
  buildUnifiedChatAttachmentContext,
  validateUnifiedChatAttachmentSet,
  type UnifiedChatTextAttachment,
} from './unifiedChatAttachmentPolicy';
import { transitionRun } from './runStateMachine';
import { normalizeSuggestedThreadTitle } from './threadTitle';
import {
  buildPlanRecommendations,
  resolvePlanTargetDate,
} from './planRecommendationTool';
import { loadPlanAgentContext } from '../../services/plan/loadPlanAgentContext';
import { getKwiltCalendarBlocksForDay } from '../../services/plan/kwiltCalendarBlocks';
import { toLocalDateKey } from '../../services/plan/planDates';
import { discoverAgentTools } from '@kwilt/agent-runtime';
import { UNIFIED_CHAT_TOOL_CATALOG } from './toolCatalog';
import { createUnifiedChatToolProvider } from './unifiedChatToolProvider';
import { createRelationshipMemoryToolProvider } from '../../services/relationshipMemoryToolProvider';
import type {
  AgentToolCall,
  AgentToolDefinition,
  AgentToolExecutionResult,
  AgentToolLoopEvent,
  AppControlOutcome,
} from '@kwilt/agent-runtime';
import { resolveTypedTurnControl } from './typedTurnControl';
import { buildUnifiedChatRouteTelemetry, buildUnifiedChatToolTelemetry, type UnifiedChatTelemetryProperties } from './unifiedChatTelemetry';
import { AnalyticsEvent, type AnalyticsEventName } from '../../services/analytics/events';
import { track } from '../../services/analytics/analytics';
import { posthogClient } from '../../services/analytics/posthogClient';
import { buildPlanPriorityChatBody } from './planPriorityChatPresentation';
import {
  buildPlanPlacementReferent,
  resolvePlanPlacementReferent,
  type PlanPlacementConversationReferent,
} from './planConversationReferent';

export class UnifiedChatTurnError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnifiedChatTurnError';
  }
}

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
  if (clientActionIds.length > 0) return { type: 'native_handoff', actionId: clientActionIds[0]! };
  return { type: 'answer', text };
}

type TurnRepository = Pick<
  UnifiedChatRepository,
  | 'insertMessage'
  | 'createRun'
  | 'appendRunEvents'
  | 'persistRunEvidence'
  | 'createProposal'
  | 'createClientAction'
  | 'decideProposal'
  | 'transitionClientAction'
  | 'transitionRunStatus'
  | 'loadThread'
  | 'applyGeneratedThreadTitle'
>;

type SendCoachChat = typeof defaultSendCoachChat;

export type RunUnifiedChatTurnInput = {
  aggregate: UnifiedChatThreadAggregate;
  prompt: string;
  clientRequestId?: string;
  signal?: AbortSignal;
  abortDisposition?: () =>
    | { type: 'stop' }
    | { type: 'steer'; prompt: string };
  retryRunId?: string;
  attachments?: UnifiedChatTextAttachment[];
  onRunStarted?: (aggregate: UnifiedChatThreadAggregate) => void;
  onThreadTitleUpdated?: (thread: UnifiedChatThreadAggregate['thread']) => void;
};

export type RunUnifiedChatTurnDependencies = {
  repository: TurnRepository;
  sendCoachChat: SendCoachChat;
  loadCurrentAggregate?: (threadId: string) => Promise<UnifiedChatThreadAggregate>;
  loadCapabilitySnapshots?: (
    capabilities: readonly UnifiedChatCapabilityId[],
    request: { prompt: string },
  ) => Promise<UnifiedChatCapabilitySnapshots>;
  routeRequest?: (
    input: RouteUnifiedChatRequestInput,
  ) => Promise<SemanticRequestRoute | null>;
  enableRuntimeTools?: boolean;
  executeRelationshipTool?: (
    call: AgentToolCall,
    tool: AgentToolDefinition,
  ) => Promise<AgentToolExecutionResult | null>;
  captureTelemetry?: (event: AnalyticsEventName, properties?: UnifiedChatTelemetryProperties) => void;
};

const EMPTY_CAPABILITY_SNAPSHOTS: UnifiedChatCapabilitySnapshots = {
  goals: { goals: [] },
  todos: { activities: [], goals: [] },
  chapters: { chapters: [] },
  profile: { profile: null },
};

async function loadDefaultCapabilitySnapshots(
  capabilities: readonly UnifiedChatCapabilityId[],
  request: { prompt: string },
): Promise<UnifiedChatCapabilitySnapshots> {
  const [{ useAppStore }, { fetchMyChapters }] = await Promise.all([
    import('../../store/useAppStore'),
    import('../../services/chapters'),
  ]);
  const state = useAppStore.getState();
  const chapters = capabilities.includes('chapters')
    ? await fetchMyChapters({ limit: 20, throwOnError: true })
    : [];
  const targetDate = resolvePlanTargetDate(
    new Date(),
    /\btomorrow\b/i.test(request.prompt) ? 'tomorrow' : 'today',
  );
  const planCalendarContext = capabilities.includes('plan')
    ? await loadPlanAgentContext({
        targetDate,
        kwiltBusyIntervals: getKwiltCalendarBlocksForDay(state.activities, targetDate)
          .map((block) => ({ start: block.start, end: block.end })),
      })
    : null;
  const plan = capabilities.includes('plan') && planCalendarContext
    ? {
        ...buildPlanRecommendations({
        activities: state.activities,
        goals: state.goals,
        arcs: state.arcs,
        userProfile: state.userProfile,
        targetDate,
        busyIntervals: planCalendarContext.busyIntervals,
        writeCalendarId: planCalendarContext.writeCalendarRef?.calendarId ?? null,
        maxItems: 4,
        activityAreas: state.activityAreas,
        }),
        writeCalendarRef: planCalendarContext.writeCalendarRef,
        limitation: planCalendarContext.limitation,
      }
    : undefined;
  return {
    arcs: { arcs: state.arcs },
    goals: { goals: state.goals, arcIds: state.arcs.map((arc) => arc.id) },
    todos: { activities: state.activities, goals: state.goals },
    chapters: { chapters },
    profile: { profile: state.userProfile },
    account: {
      showUp: {
        lastShowUpDate: state.lastShowUpDate,
        currentShowUpStreak: state.currentShowUpStreak,
        currentCoveredShowUpStreak: state.currentCoveredShowUpStreak,
        eligibleRepairUntilMs: state.streakBreakState.eligibleRepairUntilMs,
        observedAt: state.streakUpdatedAtIso,
      },
    },
    plan,
  };
}

function persistenceRows(context: BuiltRunContext) {
  const common = {
    sufficient: context.coverage.sufficient,
    omittedCount: context.coverage.omittedCount,
    coverageNote: context.coverage.note,
  };
  return [
    ...context.evidence.map((evidence, index) => ({
      sequence: index + 1,
      capabilityId: evidence.capabilityId,
      objectType: evidence.object.type,
      objectId: evidence.object.id,
      label: evidence.object.label,
      selectionStatus: 'included' as const,
      authority: evidence.authority,
      freshness: evidence.freshness,
      observedAt: evidence.observedAt,
      provenance: { source: evidence.capabilityId, object: evidence.object },
      selectionReason: evidence.includedBecause,
      ...common,
    })),
    ...context.omissions.map((omission, index) => ({
      sequence: context.evidence.length + index + 1,
      capabilityId: omission.capabilityId,
      objectType: omission.objectType,
      objectId: omission.objectId,
      label: omission.label,
      selectionStatus: 'omitted' as const,
      authority: omission.authority,
      freshness: omission.freshness,
      observedAt: omission.observedAt,
      provenance: { source: omission.capabilityId },
      selectionReason: omission.reason,
      ...common,
    })),
  ];
}

function withProposalMetadata<T extends ActivityProposalOperation>(
  operation: T,
  summary: string,
  idempotencyKey: string,
): T & { summary: string; idempotencyKey: string } {
  return { ...operation, summary, idempotencyKey };
}

function groundingSummary(
  requestClass: string,
  participatingCapabilities: readonly UnifiedChatCapabilityId[],
  usePrivateContext: boolean,
  context: BuiltRunContext,
  attachments: readonly UnifiedChatTextAttachment[],
  planConversationReferent?: PlanPlacementConversationReferent | null,
): string {
  const policy = `Launch source: unifiedChat. Request class: ${requestClass}.`;
  const parts = [
    policy,
  ];
  if (requestClass === 'capability_action' &&
      participatingCapabilities.length === 1 && participatingCapabilities[0] === 'todos') {
    parts.push(
      'Prepare at most one To-do operation. This request is already inside Kwilt; never ask which app or system owns the To-do. For explicit creation, identify the title and safe record fields; the native Quick Add pipeline owns steps, triggers, details, and cover-image enrichment under its existing permissions and entitlements. For an update, when exactly one selected Activity matches the user-named To-do, prepare the requested low-risk update instead of asking for details that are not required by the Activity field being changed. Copy targetId and expectedUpdatedAt exactly from that selected evidence machine reference. Ask one short clarification only when multiple selected Activities plausibly match or the requested field value is genuinely unresolved. Do not invent sharing, spending, Screen Time enforcement, or effects outside the Activity contract.',
    );
  } else if (requestClass === 'capability_action' || requestClass === 'native_control') {
    parts.push(
      `Use only discovered tools for these Kwilt capabilities: ${participatingCapabilities.join(', ')}. ` +
      'Read bounded evidence as needed, then stage typed changes for explicit review. Copy object ids and optimistic versions exactly from evidence. Never claim a write succeeded from model prose, invent identity or sharing decisions, or bypass a native permission, entitlement, proposal, or receipt boundary.',
    );
  }
  if (participatingCapabilities.includes('relationships')) {
    parts.push(
      'Relationship records are retrieved only through the relationships.read tool; an empty preloaded evidence list does not mean no relationship records exist. Save only facts the user explicitly stated. For correction or forgetting, read first and copy the exact record id and updatedAt into the versioned tool. Never substitute a similarly named person or record.',
    );
  }
  if (usePrivateContext) {
    const evidence = context.evidence.length > 0
      ? context.evidence.map((item) => {
          const machineReference = requestClass === 'capability_action'
            ? ` Machine reference: targetId=${item.object.id}; expectedUpdatedAt=${item.observedAt ?? 'unknown'}.`
            : '';
          return `- ${item.object.label}: ${item.summary} [${item.authority}; ${item.freshness}; ${item.includedBecause}]${machineReference}`;
        }).join('\n')
      : '- No relevant Kwilt records were found.';
    parts.push(
      'Use only the following bounded Kwilt evidence. Distinguish stored facts from inference.',
      evidence,
      `Kwilt coverage: ${context.coverage.note}`,
    );
    if (participatingCapabilities.includes('plan')) {
      parts.push(
        'Plan priority positions are authoritative capability output. Preserve their exact order. Calendar fit is placement status, not a new priority signal: never call a lower-ranked item more important, higher leverage, or the thing to do first merely because it fits. Explain tradeoffs without creating a parallel ranking.',
      );
      if (planConversationReferent) {
        parts.push(
          `Typed conversation referent: the user's scheduling follow-up refers to Priority ${planConversationReferent.priorityPosition + 1}, ` +
          `${planConversationReferent.title} (activityId=${planConversationReferent.activityId}) for ${planConversationReferent.targetDate}. ` +
          'Use this exact Activity for placement or clarification. Do not substitute another recommendation merely because it already fits or is easier to schedule. ' +
          'Machine ids are tool-only and must never appear in visible prose. Plan times and candidate placements are already expressed for this device context; preserve their offset and ask for a clearer clock time when needed, not the user’s time zone.',
        );
      }
    }
  } else {
    parts.push('Do not use private Kwilt capability context for this request.');
  }
  const attachmentContext = buildUnifiedChatAttachmentContext(attachments);
  if (attachmentContext) parts.push(attachmentContext);
  return parts.join('\n\n');
}

export async function runUnifiedChatTurn(
  input: RunUnifiedChatTurnInput,
  dependencies?: RunUnifiedChatTurnDependencies,
): Promise<UnifiedChatThreadAggregate> {
  const repository = dependencies?.repository ?? createUnifiedChatRepository();
  const sendCoachChat = dependencies?.sendCoachChat ?? defaultSendCoachChat;
  // A supplied dependency object is a test/custom harness; semantic routing is
  // opt-in there so existing deterministic harnesses never make a network call.
  const routeRequest = dependencies?.routeRequest ?? (
    dependencies ? async () => null : defaultRouteUnifiedChatRequest
  );
  const loadCapabilitySnapshots =
    dependencies?.loadCapabilitySnapshots ?? loadDefaultCapabilitySnapshots;
  const runtimeToolsEnabled = dependencies?.enableRuntimeTools ?? !dependencies;
  const captureTelemetry = dependencies?.captureTelemetry ?? (dependencies
    ? () => undefined
    : (event: AnalyticsEventName, properties?: UnifiedChatTelemetryProperties) =>
        track(posthogClient, event, properties));
  const prompt = input.prompt.trim();
  if (!prompt) throw new UnifiedChatTurnError('Write a message first.');
  const aggregate = dependencies
    ? dependencies.loadCurrentAggregate
      ? await dependencies.loadCurrentAggregate(input.aggregate.thread.id)
      : input.aggregate
    : await repository.loadThread(input.aggregate.thread.id);
  if (
    aggregate.runs.some((run) => run.status === 'queued' || run.status === 'active')
  ) {
    throw new UnifiedChatTurnError('A response is already in progress.');
  }

  const retryRun = input.retryRunId
    ? aggregate.runs.find((candidate) => candidate.id === input.retryRunId && candidate.status === 'failed')
    : undefined;
  if (input.retryRunId && !retryRun) {
    throw new UnifiedChatTurnError('That response is no longer available to retry.');
  }
  if (retryRun && (aggregate.proposals ?? []).some((proposal) => proposal.runId === retryRun.id)) {
    throw new UnifiedChatTurnError('That response already produced a change for review.');
  }
  const retryMessage = retryRun?.userMessageId
    ? aggregate.messages.find((message) => message.id === retryRun.userMessageId && message.role === 'user')
    : undefined;
  if (retryRun && !retryMessage) {
    throw new UnifiedChatTurnError('Kwilt could not find the original message to retry.');
  }
  const requestedAttachments = validateUnifiedChatAttachmentSet(input.attachments ?? []);
  const turnAttachments = retryMessage?.attachments ?? requestedAttachments;
  const userMessage = retryMessage ?? await repository.insertMessage({
    threadId: aggregate.thread.id,
    role: 'user',
    body: prompt,
    clientRequestId: input.clientRequestId,
    attachments: turnAttachments,
  });
  const activeContext = (aggregate.contextRefs ?? []).filter((context) => context.active);
  const typedControl = resolveTypedTurnControl(prompt);
  if (typedControl?.type === 'cancel_pending') {
    captureTelemetry(AnalyticsEvent.UnifiedChatNextTurnCorrection, {
      correction_type: 'cancel_pending',
    });
    const pendingProposals = (aggregate.proposals ?? []).filter((proposal) =>
      proposal.status === 'pending' || proposal.status === 'edited' || proposal.status === 'deferred');
    const pendingClientActions = (aggregate.clientActions ?? []).filter((action) =>
      action.status === 'pending_client_action' || action.status === 'presenting');
    const pendingCount = pendingProposals.length + pendingClientActions.length;
    const participatingCapabilities = [...new Set([
      ...pendingProposals.map((proposal) => proposal.capabilityId),
      ...pendingClientActions.map((action) => action.capabilityId),
    ])];
    const controlRun = await repository.createRun({
      threadId: aggregate.thread.id,
      userMessageId: userMessage.id,
      requestClass: 'capability_action',
      participatingCapabilities,
      contextPolicy: {
        usePrivateContext: false,
        reason: 'typed-pending-work-cancellation',
        clarification: pendingCount > 1 ? 'Which pending change should Kwilt cancel?' : null,
      },
    });
    input.onRunStarted?.({
      ...aggregate,
      messages: retryMessage ? aggregate.messages : [...aggregate.messages, userMessage],
      runs: [...aggregate.runs, controlRun],
    });

    let body: string;
    let eventLabel: string;
    if (pendingCount === 1 && pendingProposals[0]) {
      await repository.decideProposal({
        proposalId: pendingProposals[0].id,
        action: 'reject',
        expectedVersion: pendingProposals[0].version,
        note: 'Cancelled in Chat by the user.',
      });
      captureTelemetry(AnalyticsEvent.UnifiedChatProposalCorrected, {
        correction_type: 'rejected', capability_id: pendingProposals[0].capabilityId,
      });
      body = "Okay—I won't make that change.";
      eventLabel = 'Pending change cancelled';
    } else if (pendingCount === 1 && pendingClientActions[0]) {
      const action = pendingClientActions[0];
      await repository.transitionClientAction({
        actionId: action.id, fromStatus: action.status, toStatus: 'declined',
        expectedVersion: action.version, result: { outcome: 'declined_in_chat' },
        completedAt: new Date().toISOString(),
      });
      body = "Okay—I won't open that review.";
      eventLabel = 'Pending device action cancelled';
    } else if (pendingCount > 1) {
      body = 'There is more than one change waiting for review. Tell me which one you want to cancel.';
      eventLabel = 'Cancellation needs a target';
    } else {
      body = 'There is no pending change to cancel.';
      eventLabel = 'No pending change found';
    }

    const assistantMessage = await repository.insertMessage({
      threadId: aggregate.thread.id,
      role: 'assistant',
      body,
    });
    transitionRun(controlRun, 'complete', controlRun.version);
    await repository.transitionRunStatus({
      runId: controlRun.id, fromStatus: 'active', toStatus: 'complete', expectedVersion: controlRun.version,
      assistantMessageId: assistantMessage.id, errorCode: null, errorMessage: null,
      completedAt: new Date().toISOString(),
      event: { type: 'correction', status: pendingCount > 1 ? 'warning' : 'complete', visibility: 'user', label: eventLabel },
    });
    return repository.loadThread(aggregate.thread.id);
  }
  const deterministicPolicy = classifyUnifiedChatRequest({
    prompt,
    context: activeContext.map((context) => ({
      capabilityId: context.capabilityId,
      objectType: context.objectType,
      objectId: context.objectId,
    })),
  });
  const semanticRoute = shouldAttemptSemanticRouting({ prompt, deterministicPolicy })
    ? await routeRequest({
        prompt,
        visibleContext: activeContext.map((context) => ({
          capabilityId: context.capabilityId,
          objectType: context.objectType,
          objectId: context.objectId,
          label: context.label,
        })),
        recentTurns: aggregate.messages.slice(-6).map((message) => ({
          role: message.role,
          content: message.body,
        })),
      })
    : null;
  const previousRun = aggregate.runs.at(-1);
  const requestPolicy = resolveHybridRequestPolicy({
    prompt,
    deterministicPolicy,
    semanticRoute,
    previousPolicy: previousRun?.requestClass
      ? {
          requestClass: previousRun.requestClass,
          participatingCapabilities: previousRun.participatingCapabilities,
          usePrivateContext: previousRun.contextPolicy.usePrivateContext === true,
        }
      : undefined,
    previousAssistantMessage: [...aggregate.messages]
      .reverse()
      .find((message) => message.role === 'assistant')?.body,
  });
  const planConversationReferent = requestPolicy.policyReason === 'conversation-follow-up:plan'
    ? resolvePlanPlacementReferent(aggregate)
    : null;
  captureTelemetry(AnalyticsEvent.UnifiedChatRouteSelected, buildUnifiedChatRouteTelemetry(requestPolicy));
  if (requestPolicy.requestClass === 'better_served_elsewhere') {
    captureTelemetry(AnalyticsEvent.UnifiedChatUnsupportedIntent, {
      boundary: requestPolicy.policyReason,
      route_source: requestPolicy.policyReason.startsWith('semantic-route:') ? 'semantic' : 'deterministic',
    });
  }
  const run = await repository.createRun({
    threadId: aggregate.thread.id,
    userMessageId: userMessage.id,
    requestClass: requestPolicy.requestClass,
    participatingCapabilities: requestPolicy.participatingCapabilities,
    contextPolicy: {
      usePrivateContext: requestPolicy.usePrivateContext,
      reason: requestPolicy.policyReason,
      clarification: requestPolicy.clarification,
    },
  });
  input.onRunStarted?.({
    ...aggregate,
    messages: retryMessage
      ? aggregate.messages
      : [...aggregate.messages, userMessage],
    runs: [...aggregate.runs, run],
  });
  const history: CoachChatTurn[] = [
    ...aggregate.messages.map((message) => ({
      role: message.role,
      content: message.body,
    })),
    ...(retryMessage ? [] : [{ role: 'user' as const, content: userMessage.body }]),
  ];
  let failureCode = 'context_selection_failed';

  try {
    const snapshots = requestPolicy.usePrivateContext
      ? await loadCapabilitySnapshots(requestPolicy.participatingCapabilities, { prompt })
      : EMPTY_CAPABILITY_SNAPSHOTS;
    const sources = requestPolicy.usePrivateContext
      ? collectCapabilityEvidence({
          participatingCapabilities: requestPolicy.participatingCapabilities,
          snapshots,
        })
      : [];
    const context = buildRunContext({
      prompt,
      policy: requestPolicy,
      sources,
      explicitContextObjectIds: activeContext.map((item) => item.objectId),
    });
    failureCode = 'progress_persistence_failed';
    await repository.appendRunEvents({
      threadId: aggregate.thread.id,
      runId: run.id,
      events: [
        {
          sequence: 1,
          type: 'scope',
          status: 'complete',
          visibility: 'user',
          label: requestPolicy.usePrivateContext
            ? `Scoped to ${requestPolicy.participatingCapabilities.length} Kwilt ${requestPolicy.participatingCapabilities.length === 1 ? 'capability' : 'capabilities'}`
            : 'Answering without private Kwilt context',
        },
        {
          sequence: 2,
          type: 'evidence',
          status: context.coverage.sufficient ? 'complete' : 'warning',
          visibility: 'user',
          label: turnAttachments.length > 0
            ? `Read ${turnAttachments.length} attached ${turnAttachments.length === 1 ? 'document' : 'documents'}`
            : requestPolicy.usePrivateContext
              ? `Checked ${context.coverage.includedCount} relevant Kwilt ${context.coverage.includedCount === 1 ? 'record' : 'records'}`
              : 'No personal records needed',
          detail: turnAttachments.length > 0
            ? `Used all ${turnAttachments.length} explicitly attached text ${turnAttachments.length === 1 ? 'document' : 'documents'} for this request only. ${context.coverage.note}`
            : context.coverage.note,
        },
        {
          sequence: 3,
          type: 'response',
          status: 'active',
          visibility: 'user',
          label: 'Preparing a response',
        },
      ],
    });
    await repository.persistRunEvidence({
      threadId: aggregate.thread.id,
      runId: run.id,
      evidence: persistenceRows(context),
    });
    const directCreateTitle = directTodoCaptureTitle(prompt);
    const usesRuntimeToolLoop = runtimeToolsEnabled &&
      (requestPolicy.requestClass === 'capability_action' || requestPolicy.requestClass === 'native_control' ||
        requestPolicy.participatingCapabilities.includes('relationships')) &&
      requestPolicy.participatingCapabilities.some(
        (capability) => capability === 'arcs' || capability === 'todos' || capability === 'plan' ||
          capability === 'goals' || capability === 'profile' || capability === 'chapters' ||
          capability === 'screenTime' || capability === 'notifications' || capability === 'account' ||
          capability === 'navigation' || capability === 'relationships',
      ) &&
      !directCreateTitle;
    const relationshipProvider = dependencies?.executeRelationshipTool
      ? { execute: dependencies.executeRelationshipTool }
      : createRelationshipMemoryToolProvider({
          context: { threadId: aggregate.thread.id, runId: run.id, messageId: userMessage.id },
        });
    const toolProvider = createUnifiedChatToolProvider({
      snapshots,
      planConversationReferent,
      executeRelationshipTool: relationshipProvider.execute,
    });
    let runtimeToolEvents: readonly AgentToolLoopEvent[] = [];
    const runtimeTools = usesRuntimeToolLoop
      ? discoverAgentTools(UNIFIED_CHAT_TOOL_CATALOG, {
          capabilityIds: requestPolicy.participatingCapabilities,
          effects: ['read', 'write'],
          providerAvailability: { server: true, device: true, connector: true, channel: false },
        }).map((entry) => entry.tool)
      : [];
    const supportsTypedAction =
      requestPolicy.requestClass !== 'capability_action' ||
      requestPolicy.participatingCapabilities.includes('todos') ||
      usesRuntimeToolLoop;
    if (!supportsTypedAction) {
      const clarification = requestPolicy.clarification ??
        'Kwilt can prepare reviewed To-do changes here right now. What To-do would you like to change?';
      const assistantMessage = await repository.insertMessage({
        threadId: aggregate.thread.id,
        role: 'assistant',
        body: clarification,
      });
      transitionRun(run, 'complete', run.version);
      await repository.transitionRunStatus({
        runId: run.id, fromStatus: 'active', toStatus: 'complete', expectedVersion: run.version,
        assistantMessageId: assistantMessage.id,
        errorCode: null,
        errorMessage: null,
        completedAt: new Date().toISOString(),
        event: {
          type: 'clarification', status: 'warning', visibility: 'user',
          label: 'Clarification needed', detail: clarification,
        },
      });
      return repository.loadThread(aggregate.thread.id);
    }
    const expectsActivityProposal =
      requestPolicy.requestClass === 'capability_action' &&
      requestPolicy.participatingCapabilities.includes('todos') &&
      !usesRuntimeToolLoop;
    const expectsGroundedAnswer = (requestPolicy.usePrivateContext || turnAttachments.length > 0) &&
      !expectsActivityProposal && !usesRuntimeToolLoop;
    failureCode = 'model_response_failed';
    const automaticTitlesAllowed = aggregate.thread.titleSource !== 'user';
    const suggestFromOpening =
      automaticTitlesAllowed &&
      aggregate.thread.titleSource === 'default' &&
      aggregate.messages.length === 0 &&
      !retryMessage;
    const response = await sendCoachChat(history, {
      aiJob: 'default_chat',
      workflowInstanceId: aggregate.thread.id,
      includeUserProfileContext: false,
      signal: input.signal,
      ...(usesRuntimeToolLoop
        ? {
            runtimeTools,
            executeRuntimeTool: toolProvider.execute,
            runtimeMaxRounds: 4,
            onRuntimeToolLoopComplete: (result: { events: readonly AgentToolLoopEvent[] }) => {
              runtimeToolEvents = result.events;
            },
          }
        : {}),
      ...(expectsActivityProposal
        ? { responseFormat: { ...ACTIVITY_ACTION_RESPONSE_FORMAT } }
        : expectsGroundedAnswer
          ? { responseFormat: { ...GROUNDED_ANSWER_RESPONSE_FORMAT } }
        : {}),
      launchContextSummary: groundingSummary(
        requestPolicy.requestClass,
        requestPolicy.participatingCapabilities,
        requestPolicy.usePrivateContext,
        context,
        turnAttachments,
        planConversationReferent,
      ),
      paywallSource: 'unknown',
      conversationTitlePolicy: {
        suggestFromOpening,
        refreshFromSummary: automaticTitlesAllowed,
        onSuggestedTitle: async (suggestedTitle) => {
          const title = normalizeSuggestedThreadTitle(suggestedTitle);
          if (!title) return;
          try {
            const updatedThread = await repository.applyGeneratedThreadTitle(
              aggregate.thread.id,
              title,
            );
            if (updatedThread) input.onThreadTitleUpdated?.(updatedThread);
          } catch {
            // Title maintenance is helpful metadata and must never break a chat turn.
          }
        },
      },
    });
    for (const record of buildUnifiedChatToolTelemetry(runtimeToolEvents)) {
      captureTelemetry(AnalyticsEvent.UnifiedChatToolSelected, {
        tool_id: record.tool_id,
        loop_event: record.loop_event,
        round: record.round,
      });
      captureTelemetry(AnalyticsEvent.UnifiedChatProviderOutcome, {
        tool_id: record.tool_id,
        outcome: record.outcome,
      });
      if (record.outcome === 'unsupported') {
        captureTelemetry(AnalyticsEvent.UnifiedChatUnsupportedIntent, {
          boundary: 'unknown_tool', tool_id: record.tool_id,
        });
      }
    }
    const parsedActionResponse = expectsActivityProposal
      ? parseActivityActionResponse(response)
      : null;
    const legacyDirectCreateTitle = expectsActivityProposal ? directCreateTitle : null;
    const actionResponse = parsedActionResponse && !parsedActionResponse.proposal && legacyDirectCreateTitle
      ? {
          ...parsedActionResponse,
          proposal: {
            title: `Add ${legacyDirectCreateTitle}`,
            body: 'Creates this To-do and enriches it through Quick Add.',
            operation: {
              type: 'create_activity' as const,
              targetId: null,
              expectedUpdatedAt: null,
              payload: {
                title: legacyDirectCreateTitle,
                notes: null,
                goalId: null,
                type: 'task' as const,
                status: 'planned' as const,
                tags: [],
                priority: null,
                scheduledDate: null,
                estimateMinutes: null,
                difficulty: null,
              },
            },
          },
        }
      : parsedActionResponse;
    const groundedAnswer = expectsGroundedAnswer ? parseGroundedAnswer(response) : null;
    if (expectsActivityProposal && !actionResponse) {
      failureCode = 'action_response_invalid';
      throw new UnifiedChatTurnError('Kwilt could not prepare a safe To-do proposal.');
    }
    if (expectsGroundedAnswer && !groundedAnswer) {
      failureCode = 'grounded_response_invalid';
      throw new UnifiedChatTurnError('Kwilt could not separate its evidence and limits safely.');
    }
    const planPriorityBody = requestPolicy.policyReason === 'day-plan-recommendation' && snapshots.plan
      ? buildPlanPriorityChatBody(snapshots.plan.recommendations)
      : null;
    const visibleBody = planPriorityBody ?? (groundedAnswer
      ? formatGroundedAnswer(groundedAnswer)
      : sanitizeVisibleAssistantText(actionResponse?.answer ?? response));
    if (!visibleBody) {
      failureCode = 'visible_response_invalid';
      throw new UnifiedChatTurnError('Kwilt did not produce a visible answer.');
    }
    failureCode = 'assistant_persistence_failed';
    const assistantMessage = await repository.insertMessage({
      threadId: aggregate.thread.id,
      role: 'assistant',
      body: visibleBody,
    });
    const proposalIds: string[] = [];
    const receiptIds: string[] = [];
    const clientActionIds: string[] = [];
    const persistProposal = async (proposal: Parameters<TurnRepository['createProposal']>[0]) => {
      const created = await repository.createProposal(proposal);
      proposalIds.push(created.id);
      return created;
    };
    if (actionResponse?.proposal) {
      failureCode = 'proposal_persistence_failed';
      const operation = actionResponse.proposal.operation;
      await persistProposal({
        threadId: aggregate.thread.id,
        runId: run.id,
        messageId: assistantMessage.id,
        capabilityId: 'todos',
        title: actionResponse.proposal.title,
        body: actionResponse.proposal.body,
        permissionPolicy: { requiresExplicitApproval: true },
        operation: withProposalMetadata(
          operation,
          actionResponse.proposal.title,
          `unified-chat:${run.id}:1`,
        ),
      });
    }
    const stagedToolProposals = toolProvider.proposals();
    const stagedClientActions = toolProvider.clientActions();
    if (runtimeToolEvents.length > 0) {
      await repository.appendRunEvents({
        threadId: aggregate.thread.id,
        runId: run.id,
        events: runtimeToolEvents
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
    const nextPlanConversationReferent = requestPolicy.policyReason === 'day-plan-recommendation' && snapshots.plan
      ? buildPlanPlacementReferent(snapshots.plan)
      : planConversationReferent;
    const referentWasStaged = nextPlanConversationReferent
      ? stagedToolProposals.some((proposal) =>
          proposal.capabilityId === 'plan' &&
          proposal.operation.targetId === nextPlanConversationReferent.activityId)
      : false;
    if (nextPlanConversationReferent && !referentWasStaged) {
      const persistedToolEventCount = runtimeToolEvents.filter((event) => event.type !== 'model_step').length;
      await repository.appendRunEvents({
        threadId: aggregate.thread.id,
        runId: run.id,
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
    for (const [index, proposal] of stagedToolProposals.entries()) {
      failureCode = 'proposal_persistence_failed';
      const common = {
        threadId: aggregate.thread.id,
        runId: run.id,
        messageId: assistantMessage.id,
        title: proposal.title,
        body: proposal.body,
        permissionPolicy: { requiresExplicitApproval: true as const },
      };
      if (proposal.capabilityId === 'todos') {
        await persistProposal({
          ...common,
          capabilityId: 'todos',
          operation: withProposalMetadata(
            proposal.operation,
            proposal.title,
            `unified-chat:${run.id}:tool:${index + 1}`,
          ),
        });
      } else if (proposal.capabilityId === 'plan') {
        await persistProposal({
          ...common,
          capabilityId: 'plan',
          operation: {
            ...proposal.operation,
            summary: proposal.title,
            idempotencyKey: `unified-chat:${run.id}:tool:${index + 1}`,
          },
        });
      } else if (proposal.capabilityId === 'goals') {
        await persistProposal({
          ...common,
          capabilityId: 'goals',
          operation: {
            ...proposal.operation,
            summary: proposal.title,
            idempotencyKey: `unified-chat:${run.id}:tool:${index + 1}`,
          },
        });
      } else if (proposal.capabilityId === 'profile') {
        await persistProposal({
          ...common,
          capabilityId: 'profile',
          operation: {
            ...proposal.operation,
            summary: proposal.title,
            idempotencyKey: `unified-chat:${run.id}:tool:${index + 1}`,
          },
        });
      } else if (proposal.capabilityId === 'chapters') {
        await persistProposal({
          ...common,
          capabilityId: 'chapters',
          operation: {
            ...proposal.operation,
            summary: proposal.title,
            idempotencyKey: `unified-chat:${run.id}:tool:${index + 1}`,
          },
        });
      } else {
        await persistProposal({
          ...common,
          capabilityId: 'arcs',
          operation: {
            ...proposal.operation,
            summary: proposal.title,
            idempotencyKey: `unified-chat:${run.id}:tool:${index + 1}`,
          },
        });
      }
    }
    for (const [index, action] of stagedClientActions.entries()) {
      failureCode = 'client_action_persistence_failed';
      const createdAction = await repository.createClientAction({
        threadId: aggregate.thread.id, runId: run.id, messageId: assistantMessage.id,
        capabilityId: action.capabilityId, actionType: action.actionType,
        targetType: action.targetType, targetId: action.targetId,
        title: action.title, consequenceSummary: action.consequenceSummary, payload: action.payload,
        idempotencyKey: `unified-chat:${run.id}:client:${index + 1}`,
      });
      clientActionIds.push(createdAction.id);
    }
    const planSnapshot = requestPolicy.participatingCapabilities.includes('plan')
      ? snapshots.plan
      : undefined;
    if (requestPolicy.requestClass === 'capability_question' && planSnapshot?.writeCalendarRef) {
      for (const recommendation of planSnapshot.recommendations) {
        if (recommendation.placement.status !== 'placed' || !recommendation.expectedUpdatedAt) continue;
        const start = new Date(recommendation.placement.startDate);
        const timeLabel = Number.isNaN(start.getTime())
          ? 'Tomorrow'
          : new Intl.DateTimeFormat('en-US', {
              weekday: 'short', hour: 'numeric', minute: '2-digit',
            }).format(start);
        await persistProposal({
          threadId: aggregate.thread.id,
          runId: run.id,
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
            idempotencyKey: `unified-chat:${run.id}:plan:${recommendation.activityId}`,
          },
        });
      }
    }
    const appControlOutcome = buildAppControlOutcome({
      text: visibleBody,
      proposalIds,
      receiptIds,
      clientActionIds,
    });
    failureCode = 'run_completion_failed';
    transitionRun(run, 'complete', run.version);
    await repository.transitionRunStatus({
      runId: run.id, fromStatus: 'active', toStatus: 'complete', expectedVersion: run.version,
      assistantMessageId: assistantMessage.id,
      errorCode: null,
      errorMessage: null,
      completedAt: new Date().toISOString(),
      event: {
        type: 'response', status: 'complete', visibility: 'user',
        label: appControlOutcome.type === 'answer'
          ? 'Response ready'
          : appControlOutcome.type === 'applied'
            ? 'Change applied'
            : appControlOutcome.type === 'native_handoff'
              ? 'Ready to continue in Kwilt'
              : 'Prepared a change for review',
        payload: { outcomeType: appControlOutcome.type },
      },
    });
    return repository.loadThread(aggregate.thread.id);
  } catch {
    if (input.signal?.aborted) {
      const disposition = input.abortDisposition?.() ?? { type: 'stop' as const };
      const completedAt = new Date().toISOString();
      if (disposition.type === 'steer') {
        transitionRun(run, 'steered', run.version);
        await repository.transitionRunStatus({
          runId: run.id, fromStatus: 'active', toStatus: 'steered', expectedVersion: run.version,
          errorCode: null,
          errorMessage: null,
          completedAt,
          steerCount: (run.steerCount ?? 0) + 1,
          event: {
            type: 'instruction', status: 'warning', visibility: 'user',
            label: 'Direction updated', detail: 'Continuing with your new instruction.',
            payload: { prompt: disposition.prompt },
          },
        });
        throw new UnifiedChatTurnError('Response steered.');
      }
      transitionRun(run, 'stopped', run.version);
      await repository.transitionRunStatus({
        runId: run.id, fromStatus: 'active', toStatus: 'stopped', expectedVersion: run.version,
        errorCode: null,
        errorMessage: null,
        completedAt,
        stopRequestedAt: completedAt,
        event: { type: 'response', status: 'warning', visibility: 'user', label: 'Response stopped' },
      });
      throw new UnifiedChatTurnError('Response stopped.');
    }
    transitionRun(run, 'failed', run.version);
    await repository.transitionRunStatus({
      runId: run.id, fromStatus: 'active', toStatus: 'failed', expectedVersion: run.version,
      errorCode: failureCode,
      errorMessage: 'Kwilt could not finish that response.',
      completedAt: new Date().toISOString(),
      event: { type: 'response', status: 'failed', visibility: 'user', label: 'Response interrupted' },
    });
    throw new UnifiedChatTurnError('Kwilt could not finish that response.');
  }
}
