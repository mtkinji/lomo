import { discoverAgentTools, getKwiltGenerationJobContract, type AgentToolCall, type AgentToolDefinition, type AgentToolExecutionResult, type AgentToolLoopEvent } from '@kwilt/agent-runtime';
import {
  KwiltAiQuotaExceededError,
  sendCoachChat as defaultSendCoachChat,
  type CoachChatTurn,
} from '../../services/ai';
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
import { createHouseholdChatToolProvider } from './householdChatToolProvider';
import { UNIFIED_CHAT_TOOL_CATALOG } from './toolCatalog';
import { inferredGoalTargetDate, directRecurringReminder } from './directAppControl';
import { ACTIVITY_ACTION_RESPONSE_FORMAT, parseActivityActionResponse } from './activityProposal';
import { GROUNDED_ANSWER_RESPONSE_FORMAT, formatGroundedAnswer, parseGroundedAnswer } from './groundedAnswer';
import { buildOnDeviceThreadTitlePrompt, normalizeSuggestedThreadTitle } from './threadTitle';
import { buildPlanPriorityChatBody } from './planPriorityChatPresentation';
import { sanitizeVisibleAssistantText } from './visibleAssistantText';
import {
  ASSISTANT_ARTIFACT_RESPONSE_FORMAT,
  parseAssistantArtifactResponse,
  type UnifiedChatArtifactDraft,
} from './assistantArtifact';
import type { AgentJudgment } from './agentJudgment';
import type { UnifiedChatTurnContract } from './turnContract';
import {
  collectCoveredActionTargetIds,
  preflightActionBoundary,
  projectActionOutcomeTruth,
  type UnifiedChatActionOutcomeTruth,
} from './turnOutcomeTruth';
import { conversationResponseContract } from '../liveConversation/conversationTurnProfile';
import { classifyOnDeviceChatTask, resolveLocalChatRoute } from './localChatRoute';
import type { GenerateOnDeviceChatResponse } from './onDeviceChatProvider';

type ExecutionRepository = Pick<
  UnifiedChatRepository,
  'insertMessage' | 'transitionRunStatus' | 'loadThread' | 'applyGeneratedThreadTitle'
>;

type SendCoachChat = typeof defaultSendCoachChat;
type ToolProvider = ReturnType<typeof createUnifiedChatToolProvider>;
type ActionResponse = ReturnType<typeof parseActivityActionResponse>;

function isRecoverableModelFailure(error: unknown, signal?: AbortSignal): boolean {
  if (signal?.aborted) return false;
  if (error instanceof KwiltAiQuotaExceededError) return false;
  if (typeof error !== 'object' || error === null) return true;
  const candidate = error as { name?: unknown; code?: unknown; message?: unknown };
  if (candidate.name === 'AbortError' || candidate.code === 'quota_exceeded') return false;
  const message = typeof candidate.message === 'string' ? candidate.message.toLowerCase() : '';
  return !message.includes('quota exceeded') &&
    !message.includes('credits exhausted') &&
    !message.includes('unauthorized') &&
    !message.includes('forbidden');
}

export function buildAgentJudgmentGrounding(agentJudgment: AgentJudgment | null): string | null {
  if (!agentJudgment) return null;
  const constraints = agentJudgment.constraints.map((constraint) => constraint.sourceText).join('; ') || 'none';
  const steps = agentJudgment.steps.map((step) => {
    const objective = /[.!?]$/.test(step.objective) ? step.objective : `${step.objective}.`;
    const dependency = step.dependsOn === null ? '' : ` (after step ${step.dependsOn})`;
    return `${step.sequence}. ${objective}${dependency}`;
  }).join('\n') || '- none';
  return [
    `User job: ${agentJudgment.userJob}.`,
    `Desired outcome: ${agentJudgment.desiredOutcome}.`,
    `Required constraints: ${constraints}.`,
    `Action authority: ${agentJudgment.authorization}.`,
    `Evidence scope: ${agentJudgment.evidenceScope}.`,
    `Response contract: ${agentJudgment.responseContract}.`,
    `Execution mode: ${agentJudgment.executionMode}.`,
    `Planned steps:\n${steps}`,
    'Treat this as bounded guidance, not proof of work. Use only the actual tool schemas below, preserve every required constraint in tool arguments, and let capability validation, confirmation, proposals, native handoffs, and receipts remain authoritative.',
  ].join('\n');
}

export function selectAgentJudgmentTools(
  tools: readonly AgentToolDefinition[],
  agentJudgment: AgentJudgment | null,
): AgentToolDefinition[] {
  if (!agentJudgment) return [...tools];
  const selectedToolIds = new Set(
    agentJudgment.steps.flatMap((step) => step.toolId ? [step.toolId] : []),
  );
  return tools.filter((tool) => selectedToolIds.has(tool.id));
}

const SELF_DIRECTED_DEVICE_PATTERN =
  /\b(?:for me|myself|my (?:phone|device)|on this (?:phone|device)|allow(?:s|ed|ing)? me to|let(?:s|ting)? me(?: to)?|i (?:can|may|want to|need to) use)\b/i;

export function selectSubjectSafeRuntimeTools(
  tools: readonly AgentToolDefinition[],
  prompt: string,
): AgentToolDefinition[] {
  if (!SELF_DIRECTED_DEVICE_PATTERN.test(prompt)) return [...tools];
  return tools.filter((tool) =>
    tool.capabilityId !== 'screenTime' ||
    tool.id === 'screen_time.read' ||
    tool.id === 'screen_time.personal.setup.open' ||
    tool.id === 'screen_time.personal.limit.open');
}

function selectAgentJudgmentWriteTools(
  tools: readonly AgentToolDefinition[],
  agentJudgment: AgentJudgment | null,
): AgentToolDefinition[] {
  return selectAgentJudgmentTools(tools, agentJudgment).filter((tool) => tool.effect === 'write');
}

export function buildActionTargetGrounding(
  action: UnifiedChatTurnContract['action'],
): string | null {
  if (action?.targetScope !== 'all_matching') return null;
  return [
    'This action uses generic all-matching target semantics.',
    'The bounded evidence below is the complete resolved target set for this turn.',
    'Stage the typed write for every resolved targetId, either as individual calls or in a target collection supported by the tool schema.',
    'Do not stop after a partial sample. If any target cannot be prepared, leave the whole batch unsubmitted so Kwilt can report the boundary truthfully.',
  ].join(' ');
}

export function buildTodoActionGrounding(isAllMatching: boolean): string[] {
  return [
    isAllMatching
      ? 'Prepare one To-do operation for every resolved matching Activity. Do not stop after one item or silently narrow the target set.'
      : 'Prepare at most one To-do operation. This request is already inside Kwilt; never ask which app or system owns the To-do.',
    'For explicit creation, identify the title and safe record fields; the native Quick Add pipeline owns steps, triggers, details, and cover-image enrichment under its existing permissions and entitlements. For an update, copy targetId and expectedUpdatedAt exactly from the selected evidence machine reference. Ask one short clarification only when the requested target or field value is genuinely unresolved. Do not invent sharing, spending, Screen Time enforcement, or effects outside the Activity contract.',
    'For a new recurring reminder, call activities.capture once with the title, reminderLocalTime in 24-hour HH:mm form, and repeatWeekdays using Sunday=0 through Saturday=6. The Activity capability converts that local intent into its durable reminderAt and recurrence fields. Never split a new recurring reminder into update calls that require an Activity id, and never infer a clock time from morning, afternoon, evening, or night.',
  ];
}

export function buildCreateCalendarContinuation({
  prompt,
  stagedCreate,
  stagedPlanPlacement,
}: {
  prompt: string;
  stagedCreate: boolean;
  stagedPlanPlacement: boolean;
}): string | null {
  if (!stagedCreate || stagedPlanPlacement || !/\bcalendar\b/i.test(prompt)) return null;
  return 'After it’s created, tell me the time and duration you want. I’ll use the new To-do’s authoritative record to prepare its reminder and calendar placement in Plan.';
}

export function buildTurnResponseGrounding({
  authorization,
  evidenceScope,
  responseContract,
}: Pick<UnifiedChatTurnContract, 'authorization' | 'evidenceScope' | 'responseContract'>): string | null {
  if (responseContract !== 'evidence_linked') return null;
  return [
    'Lead with the useful conclusion.',
    'Name the material observations that support it.',
    'Distinguish observation from inference and state meaningful coverage limits.',
    evidenceScope === 'broad'
      ? 'Compare the authorized evidence as a system or pattern review; do not reduce the answer to a few lexical matches.'
      : 'Stay focused on the authorized records that materially answer the request.',
    authorization === 'none'
      ? 'Do not prepare, imply, or claim a change; this turn has no action authority.'
      : 'Describe proposed or applied work only from authoritative tools, proposals, handoffs, and receipts.',
  ].join(' ');
}

function groundingSummary(
  requestPolicy: UnifiedChatRequestPolicy,
  agentJudgment: AgentJudgment | null,
  context: BuiltRunContext,
  attachments: readonly UnifiedChatTextAttachment[],
  snapshots: UnifiedChatCapabilitySnapshots,
  planConversationReferent?: PlanPlacementConversationReferent | null,
  pendingWorkConversationReferent?: PendingWorkConversationReferent | null,
  turnContract?: UnifiedChatTurnContract,
): string {
  const { requestClass, participatingCapabilities, usePrivateContext } = requestPolicy;
  const parts = [`Launch source: unifiedChat. Request class: ${requestClass}.`];
  const responseGrounding = buildTurnResponseGrounding(turnContract ?? {
    authorization: requestClass === 'capability_action' ? 'explicit_request' : 'none',
    evidenceScope: usePrivateContext ? 'focused' : 'none',
    responseContract: usePrivateContext ? 'evidence_linked' : 'direct',
  });
  if (responseGrounding) parts.push(responseGrounding);
  const judgmentGrounding = buildAgentJudgmentGrounding(agentJudgment);
  if (judgmentGrounding) parts.push(judgmentGrounding);
  const actionTargetGrounding = buildActionTargetGrounding(turnContract?.action ?? null);
  if (actionTargetGrounding) parts.push(actionTargetGrounding);
  if (requestClass === 'capability_action' && participatingCapabilities.includes('todos')) {
    parts.push(...buildTodoActionGrounding(turnContract?.action?.targetScope === 'all_matching'));
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
    if (participatingCapabilities.includes('plan')) {
      parts.push(
        'plan.schedule_activity may target only an existing authoritative Activity id from bounded evidence. If this same request is creating a new To-do, stage the To-do creation first and do not invent its future id, calendar time, or duration. After the native create receipt exists, offer calendar placement as the next Plan-owned action.',
      );
    }
    if (participatingCapabilities.includes('screenTime')) {
      parts.push(
        'For a self-directed daily app allowance, use screen_time.personal.limit.open with subject self, the named app label, the requested minutes, and daily reset. Use screen_time.personal.setup.open only for generic personal setup without a concrete allowance. Never substitute a child for the signed-in person. For direct family Screen Time controls, resolve the child and saved selection only from the authorized machine references below. Use screen_time.override.block or screen_time.override.allow with an exact future expiresAt and all resolved targets in one proposal. For a standing prerequisite such as using Gospel Library before Games, use screen_time.agreement.create with one resolved prerequisite selection, one resolved target selection, the current desired policy version, and daily reset. If any named app has no saved selection for that child, call screen_time.selection.open for that exact child instead of guessing. Use screen_time.device.setup.open when the user asks to connect a child device. Never use screen_time.configure for a direct app request. An allow affects only Kwilt family restrictions and may not override Apple or other controls. Never claim the child device changed until a device receipt says applied.',
      );
    }
    if (participatingCapabilities.includes('recipes')) {
      parts.push(
        'For Recipe creation, include a title plus at least one ingredient and instruction. For updates and deletion, use bounded Recipe evidence and copy the exact recipeId and current version. Update only private Recipes, preserve every field outside the requested patch, and stage every create, update, or delete for explicit review. Never mutate a Kwilt catalog Recipe in place or claim a Recipe changed before an applied receipt exists.',
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
  interactionMode: 'text' | 'conversation';
  aggregate: UnifiedChatThreadAggregate;
  run: UnifiedChatRun;
  userMessage: UnifiedChatMessage;
  retryMessage?: UnifiedChatMessage;
  requestPolicy: UnifiedChatRequestPolicy;
  agentJudgment: AgentJudgment | null;
  turnContract: UnifiedChatTurnContract;
  requiresWebSearch?: boolean;
  snapshots: UnifiedChatCapabilitySnapshots;
  context: BuiltRunContext;
  turnAttachments: UnifiedChatTextAttachment[];
  planConversationReferent: PlanPlacementConversationReferent | null;
  history: CoachChatTurn[];
  repository: ExecutionRepository;
  sendCoachChat: SendCoachChat;
  generateOnDeviceResponse: GenerateOnDeviceChatResponse;
  runtimeToolsEnabled: boolean;
  signal?: AbortSignal;
  executeRelationshipTool?: (
    call: AgentToolCall,
    tool: AgentToolDefinition,
  ) => Promise<AgentToolExecutionResult | null>;
  executeHouseholdTool?: (
    call: AgentToolCall,
    tool: AgentToolDefinition,
  ) => Promise<AgentToolExecutionResult | null>;
  captureTelemetry: (
    event: AnalyticsEventName,
    properties?: UnifiedChatTelemetryProperties,
  ) => void;
  onResponseProgress?: (progress: { runId: string; text: string }) => void;
  onProviderFallback?: (fallback: {
    from: 'on_device';
    to: 'cloud';
    reason: string;
  }) => void;
  onThreadTitleUpdated?: (thread: UnifiedChatThreadAggregate['thread']) => void;
  onRecoveryAttempted?: () => void;
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
  actionOutcomeTruth: UnifiedChatActionOutcomeTruth;
  recoveryAttempted: boolean;
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
        capability === 'navigation' || capability === 'relationships' || capability === 'money' ||
        capability === 'recipes' || capability === 'household',
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
  const householdProvider = input.executeHouseholdTool
    ? { execute: input.executeHouseholdTool }
    : createHouseholdChatToolProvider();
  const toolProvider = createUnifiedChatToolProvider({
    snapshots: input.snapshots,
    planConversationReferent: input.planConversationReferent,
    executeRelationshipTool: relationshipProvider.execute,
    executeHouseholdTool: householdProvider.execute,
    now: input.now,
  });
  const coveredTargetIds = new Set<string>();
  const expectedTargetIds = new Set(input.context.evidence.map((item) => item.object.id));
  let latestNeedsInputPrompt: string | null = null;
  const executeTurnTool = async (
    call: AgentToolCall,
    tool: AgentToolDefinition,
  ): Promise<AgentToolExecutionResult> => {
    if (tool.effect === 'write') {
      for (const targetId of collectCoveredActionTargetIds(call.arguments, expectedTargetIds)) {
        coveredTargetIds.add(targetId);
      }
    }
    const inferredTargetDate = call.toolId === 'goals.create' && call.arguments.targetDate == null
      ? inferredGoalTargetDate(input.prompt, input.now?.() ?? new Date())
      : null;
    const result = await toolProvider.execute(
      inferredTargetDate
        ? { ...call, arguments: { ...call.arguments, targetDate: inferredTargetDate } }
        : call,
      tool,
    );
    if (result.status === 'needs_input') latestNeedsInputPrompt = result.prompt;
    return result;
  };
  let runtimeToolEvents: readonly AgentToolLoopEvent[] = [];
  let recoveryAttempted = false;
  const runtimeTools = usesRuntimeToolLoop
    ? selectSubjectSafeRuntimeTools(selectAgentJudgmentTools(discoverAgentTools(UNIFIED_CHAT_TOOL_CATALOG, {
        capabilityIds: input.requestPolicy.participatingCapabilities,
        effects: ['read', 'write'],
        providerAvailability: { server: true, device: true, connector: true, channel: false },
      }).map((entry) => entry.tool), input.agentJudgment), input.prompt)
    : [];
  const plannedWriteTools = selectAgentJudgmentWriteTools(runtimeTools, input.agentJudgment);
  const supportsTypedAction = input.requestPolicy.requestClass !== 'capability_action' ||
    input.requestPolicy.participatingCapabilities.includes('todos') || usesRuntimeToolLoop;
  if (input.requestPolicy.clarification || !supportsTypedAction) {
    const capabilityLabel = input.requestPolicy.participatingCapabilities[0]
      ? input.requestPolicy.participatingCapabilities[0].replace(/([a-z])([A-Z])/g, '$1 $2')
      : 'that capability';
    const clarification = input.requestPolicy.clarification ??
      `Kwilt cannot prepare that ${capabilityLabel} change in Chat yet. You can make it directly in ${capabilityLabel}.`;
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
    classifyOnDeviceChatTask(input.prompt) === null &&
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
  directResponse = preflightActionBoundary(input.turnContract, input.context);
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
  const localRoute = directResponse === null
    ? resolveLocalChatRoute({
        prompt: input.prompt,
        requestPolicy: input.requestPolicy,
        requiresWebSearch: input.requiresWebSearch === true,
        attachmentCount: input.turnAttachments.length,
        evidenceCount: input.context.evidence.length,
        isRetry: Boolean(input.retryMessage),
      })
    : { kind: 'cloud' as const };
  let fallbackStartedAt: number | null = null;
  if (localRoute.kind === 'authored') {
    directResponse = localRoute.response;
    input.captureTelemetry(AnalyticsEvent.UnifiedChatProviderOutcome, {
      provider: 'authored',
      task: 'social',
      outcome: 'completed',
    });
  } else if (localRoute.kind === 'on_device') {
    const localResult = await input.generateOnDeviceResponse({
      task: localRoute.task,
      prompt: localRoute.prompt,
    }, input.signal, (text) => input.onResponseProgress?.({ runId: input.run.id, text }));
    if (localResult.status === 'completed') directResponse = localResult.text;
    input.captureTelemetry(AnalyticsEvent.UnifiedChatProviderOutcome, {
      provider: 'apple_foundation_models',
      task: localRoute.task,
      outcome: localResult.status,
      fallback_reason: localResult.status === 'completed' ? null : localResult.reason,
      duration_bucket: localResult.status === 'completed'
        ? localResult.durationMs < 1_000
          ? 'under_1s'
          : localResult.durationMs < 3_000
            ? '1_3s'
            : 'over_3s'
        : null,
      first_output_ms: localResult.status === 'completed' ? localResult.firstOutputMs : null,
      total_ms: localResult.status === 'completed' ? localResult.durationMs : localResult.totalMs,
      warm_state: localResult.warmState,
    });
    input.captureTelemetry(AnalyticsEvent.UnifiedChatResponseLatency, {
      provider: 'apple_foundation_models',
      task: localRoute.task,
      outcome: localResult.status,
      first_output_ms: localResult.status === 'completed' ? localResult.firstOutputMs : null,
      total_ms: localResult.status === 'completed' ? localResult.durationMs : localResult.totalMs,
      warm_state: localResult.warmState,
      fallback_reason: localResult.status === 'completed' ? null : localResult.reason,
    });
    if (localResult.status !== 'completed') {
      fallbackStartedAt = Date.now();
    }
    if (
      localResult.status !== 'completed' &&
      localResult.reason !== 'job_not_promoted' &&
      !(localResult.status === 'cancelled' && input.signal?.aborted)
    ) {
      input.onProviderFallback?.({
        from: 'on_device',
        to: 'cloud',
        reason: localResult.reason,
      });
    }
    if (localResult.status === 'cancelled' && input.signal?.aborted) {
      throw Object.assign(new Error('On-device response cancelled.'), { name: 'AbortError' });
    }
  }
  let cloudStartedAt: number | null = null;
  let cloudFirstOutputMs: number | null = null;
  const modelOptions: NonNullable<Parameters<SendCoachChat>[1]> = {
    aiJob: 'default_chat',
    workflowInstanceId: input.aggregate.thread.id,
    includeUserProfileContext: false,
    webSearch: input.requiresWebSearch === true,
    signal: input.signal,
    onTextUpdate: (text) => {
      if (cloudStartedAt !== null && cloudFirstOutputMs === null) {
        cloudFirstOutputMs = Date.now() - cloudStartedAt;
      }
      input.onResponseProgress?.({ runId: input.run.id, text });
    },
    ...(usesRuntimeToolLoop
      ? {
          runtimeTools,
          ...((input.requestPolicy.requestClass === 'capability_action'
            || input.requestPolicy.requestClass === 'native_control') && plannedWriteTools.length > 0
            ? { runtimeToolChoice: 'required' as const }
            : {}),
          executeRuntimeTool: executeTurnTool,
          runtimeMaxRounds: 4,
          runtimeMaxToolCalls: Math.max(12, input.context.evidence.length + 4),
          onRuntimeToolLoopComplete: (result: { events: readonly AgentToolLoopEvent[] }) => {
            runtimeToolEvents = [...runtimeToolEvents, ...result.events];
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
        input.turnContract,
      ),
      expectsArtifactResponse
        ? 'The user requested editable output. Return the requested editable content in the artifact field with the best matching supported kind; do not leave artifact null. Keep the answer field to a brief introduction.'
        : null,
      input.interactionMode === 'conversation'
        ? conversationResponseContract.instruction
        : null,
    ].filter((item): item is string => Boolean(item)).join('\n\n'),
    ...(input.interactionMode === 'conversation' &&
      !usesRuntimeToolLoop &&
      !expectsActivityProposal &&
      !expectsGroundedAnswer &&
      !expectsArtifactResponse &&
      input.requiresWebSearch !== true &&
      !input.retryMessage
      ? { maxOutputTokens: conversationResponseContract.maxOutputTokens }
      : {}),
    paywallSource: 'unknown',
    conversationTitlePolicy: {
      suggestFromOpening,
      refreshFromSummary: automaticTitlesAllowed,
      generateOpeningTitle: async (turns) => {
        const job = getKwiltGenerationJobContract('thread_title');
        if (job.local?.promotion !== 'default') return null;
        const localResult = await input.generateOnDeviceResponse({
          task: 'thread_title',
          prompt: buildOnDeviceThreadTitlePrompt(
            turns,
            job.local.maximumInputCharacters,
          ),
        }, input.signal);
        input.captureTelemetry(AnalyticsEvent.UnifiedChatProviderOutcome, {
          provider: 'apple_foundation_models',
          task: 'thread_title',
          outcome: localResult.status,
          fallback_reason: localResult.status === 'completed' ? null : localResult.reason,
          duration_bucket: localResult.status === 'completed'
            ? localResult.durationMs < 1_000
              ? 'under_1s'
              : localResult.durationMs < 3_000
                ? '1_3s'
                : 'over_3s'
            : null,
          first_output_ms: localResult.status === 'completed' ? localResult.firstOutputMs : null,
          total_ms: localResult.status === 'completed' ? localResult.durationMs : localResult.totalMs,
          warm_state: localResult.warmState,
        });
        input.captureTelemetry(AnalyticsEvent.UnifiedChatResponseLatency, {
          provider: 'apple_foundation_models',
          task: 'thread_title',
          outcome: localResult.status,
          first_output_ms: localResult.status === 'completed' ? localResult.firstOutputMs : null,
          total_ms: localResult.status === 'completed' ? localResult.durationMs : localResult.totalMs,
          warm_state: localResult.warmState,
          fallback_reason: localResult.status === 'completed' ? null : localResult.reason,
        });
        if (
          localResult.status !== 'completed' &&
          localResult.reason !== 'job_not_promoted' &&
          !(localResult.status === 'cancelled' && input.signal?.aborted)
        ) {
          input.onProviderFallback?.({
            from: 'on_device',
            to: 'cloud',
            reason: localResult.reason,
          });
        }
        return localResult.status === 'completed' ? localResult.text : null;
      },
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
    if (directResponse !== null) {
      response = directResponse;
    } else {
      cloudStartedAt = Date.now();
      response = await input.sendCoachChat(input.history, modelOptions);
      const cloudTotalMs = Date.now() - cloudStartedAt;
      input.captureTelemetry(AnalyticsEvent.UnifiedChatResponseLatency, {
        provider: 'cloud',
        task: 'default_chat',
        outcome: 'completed',
        first_output_ms: cloudFirstOutputMs ?? cloudTotalMs,
        total_ms: cloudTotalMs,
        fallback_ms: fallbackStartedAt === null ? null : Date.now() - fallbackStartedAt,
      });
    }
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
    } else if (isRecoverableModelFailure(error, input.signal)) {
      recoveryAttempted = true;
      input.onRecoveryAttempted?.();
      response = await input.sendCoachChat(input.history, {
        ...modelOptions,
        aiJob: 'lightweight_helper',
        creditPolicy: 'internal_helper',
        conversationTitlePolicy: undefined,
        launchContextSummary: [
          modelOptions.launchContextSummary,
          'Recovery contract: the first generation attempt failed before producing a usable response. ' +
          'Complete the same user request now. Preserve all evidence, tool, and structured-output boundaries.',
        ].filter(Boolean).join('\n\n'),
      });
    } else {
      throw error;
    }
  }
  if (
    (input.requestPolicy.requestClass === 'capability_action'
      || input.requestPolicy.requestClass === 'native_control') &&
    plannedWriteTools.length > 0 &&
    toolProvider.proposals().length === 0 &&
    toolProvider.clientActions().length === 0 &&
    !latestNeedsInputPrompt
  ) {
    recoveryAttempted = true;
    input.onRecoveryAttempted?.();
    input.setFailureCode('action_recovery_failed');
    try {
      response = await input.sendCoachChat(input.history, {
        ...modelOptions,
        aiJob: 'lightweight_helper',
        creditPolicy: 'internal_helper',
        runtimeTools: plannedWriteTools,
        runtimeToolChoice: 'required',
        conversationTitlePolicy: undefined,
        launchContextSummary: [
          modelOptions.launchContextSummary,
          'Recovery contract: the first attempt did not stage the promised typed change. ' +
          'Call one of the supplied write tools now with only authorized evidence and exact constraints. ' +
          'If required input is missing, let the tool return needs_input. Never claim completion in prose.',
        ].filter(Boolean).join('\n\n'),
      });
    } catch {
      // The truthful outcome projector below converts an exhausted recovery
      // into a useful clarification without claiming that work was staged.
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

  let parsedActionResponse = expectsActivityProposal
    ? parseActivityActionResponse(response)
    : null;
  let groundedAnswer = expectsGroundedAnswer ? parseGroundedAnswer(response) : null;
  let artifactResponse = expectsArtifactResponse ? parseAssistantArtifactResponse(response) : null;
  const malformedStructuredResponse =
    (expectsActivityProposal && !parsedActionResponse) ||
    (expectsGroundedAnswer && !groundedAnswer) ||
    (expectsArtifactResponse && !artifactResponse);
  if (malformedStructuredResponse && !input.signal?.aborted) {
    recoveryAttempted = true;
    input.onRecoveryAttempted?.();
    input.setFailureCode(
      expectsActivityProposal
        ? 'action_response_invalid'
        : expectsGroundedAnswer
          ? 'grounded_response_invalid'
          : 'artifact_response_invalid',
    );
    try {
      response = await input.sendCoachChat(input.history, {
        ...modelOptions,
        aiJob: 'lightweight_helper',
        creditPolicy: 'internal_helper',
        conversationTitlePolicy: undefined,
        launchContextSummary: [
          modelOptions.launchContextSummary,
          'Recovery contract: the first response did not satisfy the required structured-output schema. ' +
          'Return the complete response in that exact schema now. Preserve the same evidence and safety boundaries.',
        ].filter(Boolean).join('\n\n'),
      });
    } catch {
      // The validation below preserves the typed-output boundary when repair is exhausted.
    }
    parsedActionResponse = expectsActivityProposal ? parseActivityActionResponse(response) : null;
    groundedAnswer = expectsGroundedAnswer ? parseGroundedAnswer(response) : null;
    artifactResponse = expectsArtifactResponse ? parseAssistantArtifactResponse(response) : null;
  }
  if (
    !expectsActivityProposal && !expectsGroundedAnswer && !expectsArtifactResponse &&
    input.requestPolicy.requestClass !== 'capability_action' &&
    !sanitizeVisibleAssistantText(response) && !input.signal?.aborted
  ) {
    recoveryAttempted = true;
    input.onRecoveryAttempted?.();
    input.setFailureCode('visible_response_invalid');
    try {
      response = await input.sendCoachChat(input.history, {
        ...modelOptions,
        aiJob: 'lightweight_helper',
        creditPolicy: 'internal_helper',
        conversationTitlePolicy: undefined,
        launchContextSummary: [
          modelOptions.launchContextSummary,
          'Recovery contract: the first response had no user-visible answer. ' +
          'Answer the same request now with concise, useful visible text.',
        ].filter(Boolean).join('\n\n'),
      });
    } catch {
      // The visible-answer boundary below remains authoritative after one repair attempt.
    }
  }
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
    ? buildPlanPriorityChatBody(
        input.snapshots.plan.recommendations,
        'tomorrow',
        [],
        { canPrepareChanges: input.turnContract.authorization !== 'none' },
      )
    : input.requestPolicy.policyReason === 'day-plan-status' && input.snapshots.plan
      ? buildPlanPriorityChatBody(
          input.snapshots.plan.recommendations,
          'tomorrow',
          input.snapshots.plan.scheduledItems ?? [],
          { canPrepareChanges: input.turnContract.authorization !== 'none' },
        )
      : null;
  const stagedProposals = toolProvider.proposals();
  const authoritativeFallbackBody = stagedProposals.length > 0
    ? stagedProposals.length === 1
      ? `I prepared “${stagedProposals[0].title}” for review.`
      : `I prepared ${stagedProposals.length} changes for review.`
    : toolProvider.clientActions().length > 0
      ? toolProvider.clientActions().length === 1
        ? `I prepared “${toolProvider.clientActions()[0].title}” for native review.`
        : `I prepared ${toolProvider.clientActions().length} native actions for review.`
      : null;
  const actionOutcomeTruth = projectActionOutcomeTruth({
    turnContract: input.turnContract,
    context: input.context,
    runtimeToolEvents,
    preparedChangeCount: toolProvider.proposals().length + toolProvider.clientActions().length,
    preparedChangeTitles: [
      ...toolProvider.proposals().map((proposal) => proposal.title),
      ...toolProvider.clientActions().map((action) => action.title),
    ],
    coveredTargetIds: [...coveredTargetIds],
    modelResponse: response,
    clarification: latestNeedsInputPrompt,
  });
  const createCalendarContinuation = buildCreateCalendarContinuation({
    prompt: input.prompt,
    stagedCreate: stagedProposals.some((proposal) => proposal.operation.type === 'create_activity'),
    stagedPlanPlacement: stagedProposals.some((proposal) => proposal.operation.type === 'schedule_activity'),
  });
  const truthfulActionBody = actionOutcomeTruth.visibleBody && createCalendarContinuation
    ? `${actionOutcomeTruth.visibleBody}\n\n${createCalendarContinuation}`
    : actionOutcomeTruth.visibleBody;
  const visibleBody = planPriorityBody ?? truthfulActionBody ?? (groundedAnswer
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
    actionOutcomeTruth,
    recoveryAttempted,
  };
}
