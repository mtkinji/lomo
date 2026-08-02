import { discoverAgentTools, type AgentToolCall, type AgentToolDefinition, type AgentToolExecutionResult, type AgentToolLoopEvent } from '@kwilt/agent-runtime';
import { sendCoachChat as defaultSendCoachChat, type CoachChatTurn } from '../../services/ai';
import { AnalyticsEvent, type AnalyticsEventName } from '../../services/analytics/events';
import type { UnifiedChatTelemetryProperties } from './unifiedChatTelemetry';
import { buildUnifiedChatToolTelemetry } from './unifiedChatTelemetry';
import type { UnifiedChatThreadAggregate, UnifiedChatMessage, UnifiedChatRun } from './types';
import type { UnifiedChatRequestPolicy } from './requestPolicy';
import { directCompoundTodoCaptureTitles, directTodoCaptureTitle } from './requestPolicy';
import type { UnifiedChatCapabilitySnapshots } from './capabilityAdapters';
import type { BuiltRunContext } from './capabilityContracts';
import type { UnifiedChatTextAttachment } from './unifiedChatAttachmentPolicy';
import { buildUnifiedChatAttachmentContext } from './unifiedChatAttachmentPolicy';
import type { PlanPlacementConversationReferent } from './planConversationReferent';
import {
  formatConversationReferentGrounding,
  resolveConversationReferent,
  type PendingWorkConversationReferent,
} from './conversationReferent';
import type { UnifiedChatRepository } from './threadRepository';
import { transitionRun } from './runStateMachine';
import { createRelationshipMemoryToolProvider } from '../../services/relationshipMemoryToolProvider';
import { createUnifiedChatToolProvider } from './unifiedChatToolProvider';
import { UNIFIED_CHAT_TOOL_CATALOG } from './toolCatalog';
import { inferredGoalTargetDate, directRecurringReminder } from './directAppControl';
import { ACTIVITY_ACTION_RESPONSE_FORMAT, parseActivityActionResponse } from './activityProposal';
import { GROUNDED_ANSWER_RESPONSE_FORMAT, formatGroundedAnswer, parseGroundedAnswer } from './groundedAnswer';
import { normalizeSuggestedThreadTitle } from './threadTitle';
import { buildPlanPriorityChatBody } from './planPriorityChatPresentation';
import { sanitizeVisibleAssistantText } from './visibleAssistantText';
import {
  ASSISTANT_ARTIFACT_RESPONSE_FORMAT,
  parseAssistantArtifactResponse,
  type UnifiedChatArtifactDraft,
} from './assistantArtifact';
import type { AgentJudgment } from './agentJudgment';

type ExecutionRepository = Pick<
  UnifiedChatRepository,
  'insertMessage' | 'transitionRunStatus' | 'loadThread' | 'applyGeneratedThreadTitle'
>;

type SendCoachChat = typeof defaultSendCoachChat;
type ToolProvider = ReturnType<typeof createUnifiedChatToolProvider>;
type ActionResponse = ReturnType<typeof parseActivityActionResponse>;

function groundingSummary(
  requestPolicy: UnifiedChatRequestPolicy,
  agentJudgment: AgentJudgment | null,
  context: BuiltRunContext,
  attachments: readonly UnifiedChatTextAttachment[],
  snapshots: UnifiedChatCapabilitySnapshots,
  planConversationReferent?: PlanPlacementConversationReferent | null,
  pendingWorkConversationReferent?: PendingWorkConversationReferent | null,
): string {
  const { requestClass, participatingCapabilities, usePrivateContext } = requestPolicy;
  const parts = [`Launch source: unifiedChat. Request class: ${requestClass}.`];
  if (agentJudgment) {
    const constraints = agentJudgment.constraints.map((constraint) => constraint.sourceText).join('; ') || 'none';
    const steps = agentJudgment.steps.map((step) => {
      const objective = /[.!?]$/.test(step.objective) ? step.objective : `${step.objective}.`;
      return `${step.sequence}. ${objective}`;
    }).join('\n') || '- none';
    parts.push([
      `User job: ${agentJudgment.userJob}.`,
      `Desired outcome: ${agentJudgment.desiredOutcome}.`,
      `Required constraints: ${constraints}.`,
      `Execution mode: ${agentJudgment.executionMode}.`,
      `Planned steps:\n${steps}`,
      'Treat this as bounded guidance, not proof of work. Use only the actual tool schemas below, preserve every required constraint in tool arguments, and let capability validation, confirmation, proposals, native handoffs, and receipts remain authoritative.',
    ].join('\n'));
  }
  if (requestClass === 'capability_action' && participatingCapabilities.includes('todos')) {
    parts.push(
      'Prepare at most one To-do operation. This request is already inside Kwilt; never ask which app or system owns the To-do. For explicit creation, identify the title and safe record fields; the native Quick Add pipeline owns steps, triggers, details, and cover-image enrichment under its existing permissions and entitlements. For an update, when exactly one selected Activity matches the user-named To-do, prepare the requested low-risk update instead of asking for details that are not required by the Activity field being changed. Copy targetId and expectedUpdatedAt exactly from that selected evidence machine reference. Ask one short clarification only when multiple selected Activities plausibly match or the requested field value is genuinely unresolved. Do not invent sharing, spending, Screen Time enforcement, or effects outside the Activity contract.',
      'For a new recurring reminder, call activities.capture once with the title, reminderLocalTime in 24-hour HH:mm form, and repeatWeekdays using Sunday=0 through Saturday=6. The Activity capability converts that local intent into its durable reminderAt and recurrence fields. Never split a new recurring reminder into update calls that require an Activity id, and never infer a clock time from morning, afternoon, evening, or night.',
    );
  }
  if (
    (requestClass === 'capability_action' || requestClass === 'native_control') &&
    !(requestClass === 'capability_action' &&
      participatingCapabilities.length === 1 && participatingCapabilities[0] === 'todos')
  ) {
    parts.push(
      `Use only discovered tools for these Kwilt capabilities: ${participatingCapabilities.join(', ')}. ` +
      'Read bounded evidence as needed, then stage typed changes for explicit review. Copy object ids and optimistic versions exactly from evidence. Never claim a write succeeded from model prose, invent identity or sharing decisions, or bypass a native permission, entitlement, proposal, or receipt boundary.',
    );
    if (participatingCapabilities.includes('goals')) {
      parts.push(
        'When the user asks for a new Goal and also describes a daily follow-through habit, call goals.create once with the bounded Goal targetDate and a followUpActivity containing only its title and daily repeat rule. Do not invent an Arc or call activities.capture before the reviewed Goal exists. After approval, Kwilt will offer the Activity using the authoritative created Goal id.',
      );
    }
    if (participatingCapabilities.includes('screenTime')) {
      parts.push(
        'For direct family Screen Time controls, resolve the child and saved selection only from the authorized machine references below. Use screen_time.override.block or screen_time.override.allow with an exact future expiresAt and all resolved targets in one proposal. If the named app has no saved selection for that child, call screen_time.selection.open for that exact child instead of guessing. Use screen_time.device.setup.open when the user asks to connect a child device. Never use screen_time.configure for a direct app request. An allow affects only Kwilt family restrictions and may not override Apple or other controls. Never claim the child device changed until a device receipt says applied.',
      );
    }
  }
  if (participatingCapabilities.includes('relationships')) {
    parts.push(
      'Relationship records are retrieved only through the relationships.read tool; an empty preloaded evidence list does not mean no relationship records exist. Save only facts the user explicitly stated. For correction or forgetting, read first and copy the exact record id and updatedAt into the versioned tool. Never substitute a similarly named person or record.',
    );
  }
  if (requestClass === 'better_served_elsewhere') {
    parts.push(
      'This request requires a specialist, an unsupported consequential effect, or an immediate-safety boundary. State exactly what you cannot safely or actually do. Do not diagnose, prescribe, provide personalized legal or financial directives, or imply that Kwilt performed an external effect. Give the safest useful general information, concrete next step, and urgent-help direction when delay could cause harm.',
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
    if (participatingCapabilities.includes('screenTime') && snapshots.screenTime) {
      const references = snapshots.screenTime.children.filter((child) => child.canManage).map((child) => ({
        childMembershipId: child.membershipId,
        displayName: child.displayName,
        expectedVersion: child.policy.desiredPolicyVersion,
        deviceReady: child.policy.devices.some((device) => (
          device.readiness === 'ready' && device.authorizationStatus === 'authorized'
        )),
        selections: child.policy.selections.filter((selection) => selection.status === 'active').map((selection) => ({
          selectionId: selection.id,
          label: selection.label,
        })),
      }));
      parts.push(
        `Screen Time machine references (tool-only; never show ids in visible prose): ${JSON.stringify(references)}`,
      );
    }
  } else {
    parts.push('Do not use private Kwilt capability context for this request.');
  }
  if (pendingWorkConversationReferent) {
    parts.push(formatConversationReferentGrounding(pendingWorkConversationReferent));
  }
  const attachmentContext = buildUnifiedChatAttachmentContext(attachments);
  if (attachmentContext) parts.push(attachmentContext);
  return parts.join('\n\n');
}

export type ExecuteUnifiedChatTurnPhaseInput = {
  prompt: string;
  aggregate: UnifiedChatThreadAggregate;
  run: UnifiedChatRun;
  userMessage: UnifiedChatMessage;
  retryMessage?: UnifiedChatMessage;
  requestPolicy: UnifiedChatRequestPolicy;
  agentJudgment: AgentJudgment | null;
  requiresWebSearch?: boolean;
  snapshots: UnifiedChatCapabilitySnapshots;
  context: BuiltRunContext;
  turnAttachments: UnifiedChatTextAttachment[];
  planConversationReferent: PlanPlacementConversationReferent | null;
  history: CoachChatTurn[];
  repository: ExecutionRepository;
  sendCoachChat: SendCoachChat;
  runtimeToolsEnabled: boolean;
  signal?: AbortSignal;
  executeRelationshipTool?: (
    call: AgentToolCall,
    tool: AgentToolDefinition,
  ) => Promise<AgentToolExecutionResult | null>;
  captureTelemetry: (
    event: AnalyticsEventName,
    properties?: UnifiedChatTelemetryProperties,
  ) => void;
  onThreadTitleUpdated?: (thread: UnifiedChatThreadAggregate['thread']) => void;
  now?: () => Date;
  setFailureCode: (code: string) => void;
  error: (message: string) => Error;
};

export type ExecutedUnifiedChatTurn = {
  kind: 'executed';
  visibleBody: string;
  actionResponse: ActionResponse;
  toolProvider: ToolProvider;
  runtimeToolEvents: readonly AgentToolLoopEvent[];
  artifactDraft: UnifiedChatArtifactDraft | null;
};

export type CompletedUnifiedChatTurn = {
  kind: 'completed_early';
  aggregate: UnifiedChatThreadAggregate;
};

export async function executeUnifiedChatTurnPhase(
  input: ExecuteUnifiedChatTurnPhaseInput,
): Promise<ExecutedUnifiedChatTurn | CompletedUnifiedChatTurn> {
  const directCreateTitle = directTodoCaptureTitle(input.prompt);
  const directCompoundTitles = directCompoundTodoCaptureTitles(input.prompt);
  const resolvedConversationReferent = resolveConversationReferent(input.aggregate);
  const pendingWorkConversationReferent =
    resolvedConversationReferent?.schemaVersion === 2 &&
    resolvedConversationReferent.kind === 'pending_work' &&
    input.requestPolicy.requestClass === 'capability_action' &&
    /\b(?:it|that|those|them|other|same|first|second|third|instead|only)\b|^no\b/i.test(input.prompt)
      ? resolvedConversationReferent
      : null;
  const usesRuntimeToolLoop = input.runtimeToolsEnabled &&
    (input.requestPolicy.requestClass === 'capability_action' ||
      input.requestPolicy.requestClass === 'native_control' ||
      input.requestPolicy.participatingCapabilities.includes('relationships')) &&
    input.requestPolicy.participatingCapabilities.some(
      (capability) => capability === 'arcs' || capability === 'todos' || capability === 'plan' ||
        capability === 'goals' || capability === 'profile' || capability === 'chapters' ||
        capability === 'screenTime' || capability === 'notifications' || capability === 'account' ||
        capability === 'navigation' || capability === 'relationships',
    );
  const relationshipProvider = input.executeRelationshipTool
    ? { execute: input.executeRelationshipTool }
    : createRelationshipMemoryToolProvider({
        context: {
          threadId: input.aggregate.thread.id,
          runId: input.run.id,
          messageId: input.userMessage.id,
        },
      });
  const toolProvider = createUnifiedChatToolProvider({
    snapshots: input.snapshots,
    planConversationReferent: input.planConversationReferent,
    executeRelationshipTool: relationshipProvider.execute,
    now: input.now,
  });
  const executeTurnTool = (
    call: AgentToolCall,
    tool: AgentToolDefinition,
  ): Promise<AgentToolExecutionResult> => {
    const inferredTargetDate = call.toolId === 'goals.create' && call.arguments.targetDate == null
      ? inferredGoalTargetDate(input.prompt, input.now?.() ?? new Date())
      : null;
    return toolProvider.execute(
      inferredTargetDate
        ? { ...call, arguments: { ...call.arguments, targetDate: inferredTargetDate } }
        : call,
      tool,
    );
  };
  let runtimeToolEvents: readonly AgentToolLoopEvent[] = [];
  const selectedToolIds = input.agentJudgment
    ? new Set(input.agentJudgment.steps.flatMap((step) => step.toolId ? [step.toolId] : []))
    : null;
  const runtimeTools = usesRuntimeToolLoop
    ? discoverAgentTools(UNIFIED_CHAT_TOOL_CATALOG, {
        capabilityIds: input.requestPolicy.participatingCapabilities,
        effects: ['read', 'write'],
        providerAvailability: { server: true, device: true, connector: true, channel: false },
      }).map((entry) => entry.tool)
        .filter((tool) => !selectedToolIds || selectedToolIds.has(tool.id))
    : [];
  const supportsTypedAction = input.requestPolicy.requestClass !== 'capability_action' ||
    input.requestPolicy.participatingCapabilities.includes('todos') || usesRuntimeToolLoop;
  if (input.requestPolicy.clarification || !supportsTypedAction) {
    const clarification = input.requestPolicy.clarification ??
      'Kwilt can prepare reviewed To-do changes here right now. What To-do would you like to change?';
    const assistantMessage = await input.repository.insertMessage({
      threadId: input.aggregate.thread.id,
      role: 'assistant',
      body: clarification,
    });
    transitionRun(input.run, 'complete', input.run.version);
    await input.repository.transitionRunStatus({
      runId: input.run.id,
      fromStatus: 'active',
      toStatus: 'complete',
      expectedVersion: input.run.version,
      assistantMessageId: assistantMessage.id,
      errorCode: null,
      errorMessage: null,
      completedAt: new Date().toISOString(),
      event: {
        type: 'clarification',
        status: 'warning',
        visibility: 'user',
        label: 'Clarification needed',
        detail: clarification,
      },
    });
    return {
      kind: 'completed_early',
      aggregate: await input.repository.loadThread(input.aggregate.thread.id),
    };
  }

  const expectsActivityProposal = input.requestPolicy.requestClass === 'capability_action' &&
    input.requestPolicy.participatingCapabilities.includes('todos') && !usesRuntimeToolLoop;
  const expectsGroundedAnswer = (input.requestPolicy.usePrivateContext || input.turnAttachments.length > 0) &&
    !expectsActivityProposal && !usesRuntimeToolLoop;
  const expectsArtifactResponse = input.requestPolicy.requestClass === 'general' &&
    !input.requiresWebSearch && !usesRuntimeToolLoop && !expectsGroundedAnswer &&
    /\b(?:draft|write|compose|outline|checklist|table|template|email|letter|message|code|script)\b/i.test(input.prompt);
  input.setFailureCode('model_response_failed');
  const automaticTitlesAllowed = input.aggregate.thread.titleSource !== 'user';
  const suggestFromOpening = automaticTitlesAllowed &&
    input.aggregate.thread.titleSource === 'default' &&
    input.aggregate.messages.length === 0 && !input.retryMessage;
  const directReminder = input.requestPolicy.participatingCapabilities.includes('todos')
    ? directRecurringReminder(input.prompt)
    : null;
  const directTool = directReminder || directCompoundTitles
    ? runtimeTools.find((tool) => tool.id === 'activities.capture')
    : undefined;
  let directResponse: string | null = null;
  if ((directReminder || directCompoundTitles) && !directTool) {
    throw input.error('Kwilt could not load the capability needed for that request.');
  }
  if (directTool) {
    const directArguments = directCompoundTitles?.map((title) => ({ title })) ?? [
      directReminder ?? {},
    ];
    const results: AgentToolExecutionResult[] = [];
    const events: AgentToolLoopEvent[] = [];
    for (const [index, argumentsValue] of directArguments.entries()) {
      const directCall: AgentToolCall = {
        id: `direct:${input.run.id}:${index + 1}`,
        toolId: directTool.id,
        arguments: argumentsValue,
      };
      const result = await executeTurnTool(directCall, directTool);
      results.push(result);
      events.push({
        sequence: index + 1,
        type: 'tool_completed',
        round: 1,
        toolCallId: directCall.id,
        toolId: directTool.id,
        resultStatus: result.status,
      });
    }
    runtimeToolEvents = events;
    const result = results[0];
    if (results.some((item) => item.status !== 'proposed' && item.status !== 'pending_client_action')) {
      input.setFailureCode('direct_app_control_failed');
      throw input.error(
        result.status === 'needs_input'
          ? result.prompt
          : 'Kwilt could not prepare that app change safely.',
      );
    } else {
      directResponse = directCompoundTitles
        ? `I prepared ${directCompoundTitles.length} To-dos for review.`
        : directReminder
          ? `I prepared a recurring “${directReminder.title}” reminder for review.`
          : 'I prepared that change for review.';
    }
  }
  const modelOptions: NonNullable<Parameters<SendCoachChat>[1]> = {
    aiJob: 'default_chat',
    workflowInstanceId: input.aggregate.thread.id,
    includeUserProfileContext: false,
    webSearch: input.requiresWebSearch === true,
    signal: input.signal,
    ...(usesRuntimeToolLoop
      ? {
          runtimeTools,
          executeRuntimeTool: executeTurnTool,
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
        : expectsArtifactResponse
          ? { responseFormat: { ...ASSISTANT_ARTIFACT_RESPONSE_FORMAT } }
        : {}),
    launchContextSummary: [
      groundingSummary(
        input.requestPolicy,
        input.agentJudgment,
        input.context,
        input.turnAttachments,
        input.snapshots,
        input.planConversationReferent,
        pendingWorkConversationReferent,
      ),
      expectsArtifactResponse
        ? 'The user requested editable output. Return the requested editable content in the artifact field with the best matching supported kind; do not leave artifact null. Keep the answer field to a brief introduction.'
        : null,
    ].filter((item): item is string => Boolean(item)).join('\n\n'),
    paywallSource: 'unknown',
    conversationTitlePolicy: {
      suggestFromOpening,
      refreshFromSummary: automaticTitlesAllowed,
      onSuggestedTitle: async (suggestedTitle) => {
        const title = normalizeSuggestedThreadTitle(suggestedTitle);
        if (!title) return;
        try {
          const updatedThread = await input.repository.applyGeneratedThreadTitle(
            input.aggregate.thread.id,
            title,
          );
          if (updatedThread) input.onThreadTitleUpdated?.(updatedThread);
        } catch {
          // Helpful metadata must never break a turn.
        }
      },
    },
  };
  let response: string;
  try {
    response = directResponse ?? await input.sendCoachChat(input.history, modelOptions);
  } catch (error) {
    const proposals = toolProvider.proposals();
    const clientActions = toolProvider.clientActions();
    if (proposals.length > 0) {
      response = proposals.length === 1
        ? `I prepared “${proposals[0].title}” for review.`
        : `I prepared ${proposals.length} changes for review.`;
    } else if (clientActions.length > 0) {
      response = clientActions.length === 1
        ? `I prepared “${clientActions[0].title}” for native review.`
        : `I prepared ${clientActions.length} native actions for review.`;
    } else {
      throw error;
    }
  }
  for (const record of buildUnifiedChatToolTelemetry(runtimeToolEvents)) {
    input.captureTelemetry(AnalyticsEvent.UnifiedChatToolSelected, {
      tool_id: record.tool_id,
      loop_event: record.loop_event,
      round: record.round,
    });
    input.captureTelemetry(AnalyticsEvent.UnifiedChatProviderOutcome, {
      tool_id: record.tool_id,
      outcome: record.outcome,
    });
    if (record.outcome === 'unsupported') {
      input.captureTelemetry(AnalyticsEvent.UnifiedChatUnsupportedIntent, {
        boundary: 'unknown_tool',
        tool_id: record.tool_id,
      });
    }
  }

  const parsedActionResponse = expectsActivityProposal
    ? parseActivityActionResponse(response)
    : null;
  const actionResponse = parsedActionResponse && !parsedActionResponse.proposal && directCreateTitle
    ? {
        ...parsedActionResponse,
        proposal: {
          title: `Add ${directCreateTitle}`,
          body: 'Creates this To-do and enriches it through Quick Add.',
          operation: {
            type: 'create_activity' as const,
            targetId: null,
            expectedUpdatedAt: null,
            payload: {
              title: directCreateTitle,
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
  const artifactResponse = expectsArtifactResponse ? parseAssistantArtifactResponse(response) : null;
  if (expectsActivityProposal && !actionResponse) {
    input.setFailureCode('action_response_invalid');
    throw input.error('Kwilt could not prepare a safe To-do proposal.');
  }
  if (expectsGroundedAnswer && !groundedAnswer) {
    input.setFailureCode('grounded_response_invalid');
    throw input.error('Kwilt could not separate its evidence and limits safely.');
  }
  if (expectsArtifactResponse && !artifactResponse) {
    input.setFailureCode('artifact_response_invalid');
    throw input.error('Kwilt could not prepare that draft safely.');
  }
  const planPriorityBody = input.requestPolicy.policyReason === 'day-plan-recommendation' && input.snapshots.plan
    ? buildPlanPriorityChatBody(input.snapshots.plan.recommendations)
    : input.requestPolicy.policyReason === 'day-plan-status' && input.snapshots.plan
      ? buildPlanPriorityChatBody(
          input.snapshots.plan.recommendations,
          'tomorrow',
          input.snapshots.plan.scheduledItems ?? [],
        )
      : null;
  const authoritativeFallbackBody = toolProvider.proposals().length > 0
    ? toolProvider.proposals().length === 1
      ? `I prepared “${toolProvider.proposals()[0].title}” for review.`
      : `I prepared ${toolProvider.proposals().length} changes for review.`
    : toolProvider.clientActions().length > 0
      ? toolProvider.clientActions().length === 1
        ? `I prepared “${toolProvider.clientActions()[0].title}” for native review.`
        : `I prepared ${toolProvider.clientActions().length} native actions for review.`
      : null;
  const visibleBody = planPriorityBody ?? (groundedAnswer
    ? formatGroundedAnswer(groundedAnswer)
    : sanitizeVisibleAssistantText(actionResponse?.answer ?? artifactResponse?.answer ?? response) ||
      authoritativeFallbackBody);
  if (!visibleBody) {
    input.setFailureCode('visible_response_invalid');
    throw input.error('Kwilt did not produce a visible answer.');
  }

  return {
    kind: 'executed',
    visibleBody,
    actionResponse,
    toolProvider,
    runtimeToolEvents,
    artifactDraft: artifactResponse?.artifact ?? null,
  };
}
