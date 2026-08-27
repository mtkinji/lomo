import { sendCoachChat as defaultSendCoachChat, type CoachChatTurn } from '../../services/ai';
import {
  createUnifiedChatRepository,
  type UnifiedChatRepository,
} from './threadRepository';
import type { UnifiedChatThreadAggregate } from './types';
import type { UnifiedChatCapabilityId } from './requestPolicy';
import {
  routeUnifiedChatRequest as defaultRouteUnifiedChatRequest,
  type RouteUnifiedChatRequestInput,
} from './routeUnifiedChatRequest';
import type { SemanticRequestRoute } from './semanticRequestRouter';
import {
  requestAgentJudgment as defaultRequestAgentJudgment,
  type RequestAgentJudgmentInput,
} from './requestAgentJudgment';
import type { AgentJudgment } from './agentJudgment';
import type { UnifiedChatCapabilitySnapshots } from './capabilityAdapters';
import type { UnifiedChatTextAttachment } from './unifiedChatAttachmentPolicy';
import { transitionRun } from './runStateMachine';
import type {
  AgentToolCall,
  AgentToolDefinition,
  AgentToolExecutionResult,
} from '@kwilt/agent-runtime';
import { resolveTypedTurnControl } from './typedTurnControl';
import {
  buildUnifiedChatAgentJudgmentTelemetry,
  buildUnifiedChatAgentPlanOutcomeTelemetry,
  buildUnifiedChatRouteTelemetry,
  buildUnifiedChatOperationalTelemetry,
  type UnifiedChatTelemetryProperties,
} from './unifiedChatTelemetry';
import { AnalyticsEvent, type AnalyticsEventName } from '../../services/analytics/events';
import { track } from '../../services/analytics/analytics';
import { posthogClient } from '../../services/analytics/posthogClient';
import {
  handleUnifiedChatPendingActivityWeekdayEditPhase,
  handleUnifiedChatPendingActivityNextWeekRepeatPhase,
  handleUnifiedChatPendingCancellationPhase,
  handleUnifiedChatPendingPrefixSelectionPhase,
  persistUnifiedChatTurnPhase,
} from './turnPersistencePhase';
import { planUnifiedChatTurnPhase } from './turnPlanningPhase';
import {
  authorizeUnifiedChatContextPhase,
  loadDefaultCapabilitySnapshots,
} from './turnContextPhase';
import { executeUnifiedChatTurnPhase } from './turnExecutionPhase';
import {
  buildAppControlOutcome,
  materializeUnifiedChatOutcomePhase,
} from './turnOutcomePhase';
import {
  finalizeUnifiedChatTurnFailurePhase,
  finalizeUnifiedChatTurnPhase,
} from './turnFinalizationPhase';
import type { ConversationProgressCueId } from '../liveConversation/conversationProgressCue';
import {
  defaultGenerateOnDeviceChatResponse,
  type GenerateOnDeviceChatResponse,
} from './onDeviceChatProvider';

export class UnifiedChatTurnError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnifiedChatTurnError';
  }
}

export { buildAppControlOutcome };

type TurnRepository = Pick<
  UnifiedChatRepository,
  | 'insertMessage'
  | 'createRun'
  | 'appendRunEvents'
  | 'persistRunEvidence'
  | 'createProposal'
  | 'createClientAction'
  | 'createArtifact'
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
  interactionMode?: 'text' | 'conversation';
  onLatencyMilestone?: (
    milestone: 'turn_started' | 'planning_complete' | 'context_ready' | 'answer_ready',
  ) => void;
  onConversationClassification?: (classification: {
    planningStrategy: 'fast_direct' | 'full';
    requestClass: NonNullable<UnifiedChatThreadAggregate['runs'][number]['requestClass']>;
  }) => void;
  recentProgressCueIds?: readonly ConversationProgressCueId[];
  onProgressCue?: (cueId: ConversationProgressCueId) => void;
  clientRequestId?: string;
  signal?: AbortSignal;
  abortDisposition?: () =>
    | { type: 'stop' }
    | { type: 'steer'; prompt: string };
  retryRunId?: string;
  attachments?: UnifiedChatTextAttachment[];
  onRunStarted?: (aggregate: UnifiedChatThreadAggregate) => void;
  onRunProgress?: (aggregate: UnifiedChatThreadAggregate) => void;
  onResponseProgress?: (progress: { runId: string; text: string }) => void;
  onProviderFallback?: (fallback: {
    from: 'on_device';
    to: 'cloud';
    reason: string;
  }) => void;
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
  requestJudgment?: (
    input: RequestAgentJudgmentInput,
  ) => Promise<AgentJudgment | null>;
  generateOnDeviceResponse?: GenerateOnDeviceChatResponse;
  enableRuntimeTools?: boolean;
  executeRelationshipTool?: (
    call: AgentToolCall,
    tool: AgentToolDefinition,
  ) => Promise<AgentToolExecutionResult | null>;
  executeHouseholdTool?: (
    call: AgentToolCall,
    tool: AgentToolDefinition,
  ) => Promise<AgentToolExecutionResult | null>;
  captureTelemetry?: (event: AnalyticsEventName, properties?: UnifiedChatTelemetryProperties) => void;
  now?: () => Date;
  timeZone?: () => string;
};

export async function runUnifiedChatTurn(
  input: RunUnifiedChatTurnInput,
  dependencies?: RunUnifiedChatTurnDependencies,
): Promise<UnifiedChatThreadAggregate> {
  input.onLatencyMilestone?.('turn_started');
  const repository = dependencies?.repository ?? createUnifiedChatRepository();
  const sendCoachChat = dependencies?.sendCoachChat ?? defaultSendCoachChat;
  // A supplied dependency object is a test/custom harness; semantic routing is
  // opt-in there so existing deterministic harnesses never make a network call.
  const routeRequest = dependencies?.routeRequest ?? (
    dependencies ? async () => null : defaultRouteUnifiedChatRequest
  );
  const requestJudgment = dependencies?.requestJudgment ?? (
    dependencies ? async () => null : defaultRequestAgentJudgment
  );
  const generateOnDeviceResponse =
    dependencies?.generateOnDeviceResponse ?? defaultGenerateOnDeviceChatResponse;
  const loadCapabilitySnapshots =
    dependencies?.loadCapabilitySnapshots ?? loadDefaultCapabilitySnapshots;
  const runtimeToolsEnabled = dependencies?.enableRuntimeTools ?? !dependencies;
  const captureTelemetry = dependencies?.captureTelemetry ?? (dependencies
    ? () => undefined
    : (event: AnalyticsEventName, properties?: UnifiedChatTelemetryProperties) =>
        track(posthogClient, event, properties));
  let persistedTurn: Awaited<ReturnType<typeof persistUnifiedChatTurnPhase>>;
  try {
    persistedTurn = await persistUnifiedChatTurnPhase({
      aggregate: input.aggregate,
      prompt: input.prompt,
      clientRequestId: input.clientRequestId,
      retryRunId: input.retryRunId,
      attachments: input.attachments,
      repository,
      loadAggregate: dependencies
        ? dependencies.loadCurrentAggregate ?? (async () => input.aggregate)
        : (threadId) => repository.loadThread(threadId),
      error: (message) => new UnifiedChatTurnError(message),
    });
  } catch (error) {
    if (error instanceof UnifiedChatTurnError) throw error;
    throw new UnifiedChatTurnError('Kwilt could not save that message.');
  }
  const { prompt, aggregate, retryMessage, userMessage, turnAttachments } = persistedTurn;
  const attemptNumber = aggregate.runs.filter(
    (candidate) => candidate.userMessageId === userMessage.id,
  ).length + 1;
  const activeContext = (aggregate.contextRefs ?? []).filter((context) => context.active);
  const typedControl = resolveTypedTurnControl(prompt);
  if (typedControl?.type === 'cancel_pending') {
    return handleUnifiedChatPendingCancellationPhase({
      aggregate,
      userMessage,
      retryMessage,
      repository,
      onRunStarted: input.onRunStarted,
      now: dependencies?.now,
      captureCorrection: ({ type, capabilityId }) => {
        if (type === 'cancel_pending') {
          captureTelemetry(AnalyticsEvent.UnifiedChatNextTurnCorrection, {
            correction_type: 'cancel_pending',
          });
        } else {
          captureTelemetry(AnalyticsEvent.UnifiedChatProposalCorrected, {
            correction_type: 'rejected',
            capability_id: capabilityId,
          });
        }
      },
    });
  }
  if (typedControl?.type === 'keep_pending_prefix') {
    return handleUnifiedChatPendingPrefixSelectionPhase({
      aggregate,
      userMessage,
      retryMessage,
      count: typedControl.count,
      repository,
      onRunStarted: input.onRunStarted,
      now: dependencies?.now,
      captureCorrection: ({ capabilityId }) => {
        captureTelemetry(AnalyticsEvent.UnifiedChatProposalCorrected, {
          correction_type: 'rejected',
          capability_id: capabilityId,
        });
      },
    });
  }
  if (typedControl?.type === 'keep_other_pending') {
    return handleUnifiedChatPendingPrefixSelectionPhase({
      aggregate,
      userMessage,
      retryMessage,
      count: 1,
      mode: 'other',
      repository,
      onRunStarted: input.onRunStarted,
      now: dependencies?.now,
      captureCorrection: ({ capabilityId }) => {
        captureTelemetry(AnalyticsEvent.UnifiedChatProposalCorrected, {
          correction_type: 'rejected',
          capability_id: capabilityId,
        });
      },
    });
  }
  if (typedControl?.type === 'edit_pending_activity_weekday') {
    return handleUnifiedChatPendingActivityWeekdayEditPhase({
      aggregate,
      userMessage,
      retryMessage,
      weekday: typedControl.weekday,
      repository,
      onRunStarted: input.onRunStarted,
      now: dependencies?.now,
      captureCorrection: ({ capabilityId }) => {
        captureTelemetry(AnalyticsEvent.UnifiedChatProposalCorrected, {
          correction_type: 'edited',
          capability_id: capabilityId,
        });
      },
    });
  }
  if (typedControl?.type === 'repeat_pending_next_week') {
    return handleUnifiedChatPendingActivityNextWeekRepeatPhase({
      aggregate,
      userMessage,
      retryMessage,
      repository,
      onRunStarted: input.onRunStarted,
      now: dependencies?.now,
    });
  }
  let plannedTurn: Awaited<ReturnType<typeof planUnifiedChatTurnPhase>>;
  try {
    plannedTurn = await planUnifiedChatTurnPhase({
      prompt,
      interactionMode: input.interactionMode ?? 'text',
      attachmentCount: turnAttachments.length,
      turnId: userMessage.id,
      recentProgressCueIds: input.recentProgressCueIds,
      onProgressCue: input.onProgressCue,
      aggregate,
      activeContext,
      routeRequest,
      requestJudgment,
      now: dependencies?.now?.() ?? new Date(),
      timeZone: dependencies?.timeZone?.() ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
      signal: input.signal,
    });
    input.onLatencyMilestone?.('planning_complete');
  } catch {
    const failedPlanningRun = await repository.createRun({
      threadId: aggregate.thread.id,
      userMessageId: userMessage.id,
      requestClass: 'general',
      participatingCapabilities: [],
      contextPolicy: {
        usePrivateContext: false,
        reason: 'planning-failed',
        clarification: null,
      },
    });
    input.onRunStarted?.({
      ...aggregate,
      messages: retryMessage ? aggregate.messages : [...aggregate.messages, userMessage],
      runs: [...aggregate.runs, failedPlanningRun],
    });
    if (!input.signal?.aborted) {
      captureTelemetry(
        AnalyticsEvent.UnifiedChatAgentPlanOutcome,
        buildUnifiedChatAgentPlanOutcomeTelemetry(
          null,
          'deterministic_fallback',
          'terminal_failure',
          'planning_failed',
          { requestClass: 'general', participatingCapabilities: [] },
          { attemptNumber, recoveryAttempted: false, terminalFailure: true },
        ),
      );
    }
    return finalizeUnifiedChatTurnFailurePhase({
      run: failedPlanningRun,
      repository,
      failureCode: 'planning_failed',
      signal: input.signal,
      abortDisposition: input.abortDisposition,
      error: (message) => new UnifiedChatTurnError(message),
      publicErrorMessage: 'Kwilt could not plan that response.',
    });
  }
  const {
    requestPolicy, requiresWebSearch, planConversationReferent, activityClarification, turnContract,
  } = plannedTurn;
  input.onConversationClassification?.({
    planningStrategy: plannedTurn.planningStrategy,
    requestClass: requestPolicy.requestClass,
  });
  captureTelemetry(
    plannedTurn.agentJudgment
      ? AnalyticsEvent.UnifiedChatAgentJudgmentSelected
      : AnalyticsEvent.UnifiedChatAgentJudgmentFallback,
    buildUnifiedChatAgentJudgmentTelemetry(
      plannedTurn.agentJudgment,
      plannedTurn.judgmentSource,
      {
        requestClass: requestPolicy.requestClass,
        participatingCapabilities: requestPolicy.participatingCapabilities,
      },
    ),
  );
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
      clarification: activityClarification ?? requestPolicy.clarification,
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
  let recoveryAttempted = false;

  try {
    const { snapshots, context } = await authorizeUnifiedChatContextPhase({
      prompt,
      run,
      requestPolicy,
      activeContext,
      turnAttachments,
      turnContract,
      repository,
      loadCapabilitySnapshots,
    });
    failureCode = 'model_response_failed';
    input.onLatencyMilestone?.('context_ready');
    if (input.onRunProgress) {
      try {
        input.onRunProgress(await repository.loadThread(aggregate.thread.id));
      } catch {
        // Progress publication is best-effort and must never interrupt the response.
      }
    }
    if (activityClarification) {
      const assistantMessage = await repository.insertMessage({
        threadId: aggregate.thread.id,
        role: 'assistant',
        body: activityClarification,
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
          label: 'Clarification needed', detail: activityClarification,
          payload: { outcomeType: 'clarification' },
        },
      });
      input.onLatencyMilestone?.('answer_ready');
      captureTelemetry(
        AnalyticsEvent.UnifiedChatAgentPlanOutcome,
        buildUnifiedChatAgentPlanOutcomeTelemetry(
          plannedTurn.agentJudgment,
          plannedTurn.judgmentSource,
          'clarification',
          null,
          {
            requestClass: requestPolicy.requestClass,
            participatingCapabilities: requestPolicy.participatingCapabilities,
          },
          { attemptNumber, recoveryAttempted: false, terminalFailure: false },
        ),
      );
      return repository.loadThread(aggregate.thread.id);
    }
    const executionResult = await executeUnifiedChatTurnPhase({
      prompt,
      interactionMode: input.interactionMode ?? 'text',
      aggregate,
      run,
      userMessage,
      retryMessage,
      requestPolicy,
      agentJudgment: plannedTurn.agentJudgment,
      turnContract,
      requiresWebSearch,
      snapshots,
      context,
      turnAttachments,
      planConversationReferent,
      history,
      repository,
      sendCoachChat,
      generateOnDeviceResponse,
      runtimeToolsEnabled,
      signal: input.signal,
      executeRelationshipTool: dependencies?.executeRelationshipTool,
      executeHouseholdTool: dependencies?.executeHouseholdTool,
      captureTelemetry,
      onResponseProgress: input.onResponseProgress,
      onProviderFallback: input.onProviderFallback,
      onThreadTitleUpdated: input.onThreadTitleUpdated,
      onRecoveryAttempted: () => {
        recoveryAttempted = true;
      },
      now: dependencies?.now,
      setFailureCode: (code) => {
        failureCode = code;
      },
      error: (message) => new UnifiedChatTurnError(message),
    });
    if (executionResult.kind === 'completed_early') {
      input.onLatencyMilestone?.('answer_ready');
      captureTelemetry(
        AnalyticsEvent.UnifiedChatAgentPlanOutcome,
        buildUnifiedChatAgentPlanOutcomeTelemetry(
          plannedTurn.agentJudgment,
          plannedTurn.judgmentSource,
          'clarification',
          null,
          {
            requestClass: requestPolicy.requestClass,
            participatingCapabilities: requestPolicy.participatingCapabilities,
          },
          { attemptNumber, recoveryAttempted: false, terminalFailure: false },
        ),
      );
      return executionResult.aggregate;
    }
    const {
      visibleBody, actionResponse, toolProvider, runtimeToolEvents, artifactDraft, actionOutcomeTruth,
      recoveryAttempted: executionRecoveryAttempted,
    } = executionResult;
    recoveryAttempted = recoveryAttempted || executionRecoveryAttempted;
    captureTelemetry(
      AnalyticsEvent.UnifiedChatOperationalOutcome,
      buildUnifiedChatOperationalTelemetry({ turnContract, context, actionOutcomeTruth }),
    );
    const { assistantMessage, appControlOutcome } = await materializeUnifiedChatOutcomePhase({
      threadId: aggregate.thread.id,
      run,
      visibleBody,
      actionResponse,
      toolProvider,
      runtimeToolEvents,
      agentJudgment: plannedTurn.agentJudgment,
      artifactDraft,
      requestPolicy,
      snapshots,
      planConversationReferent,
      turnContract,
      actionOutcomeTruth,
      repository,
      setFailureCode: (code) => {
        failureCode = code;
      },
    });
    failureCode = 'run_completion_failed';
    await finalizeUnifiedChatTurnPhase({
      run,
      assistantMessageId: assistantMessage.id,
      outcome: appControlOutcome,
      repository,
    });
    input.onLatencyMilestone?.('answer_ready');
    captureTelemetry(
      AnalyticsEvent.UnifiedChatAgentPlanOutcome,
      buildUnifiedChatAgentPlanOutcomeTelemetry(
        plannedTurn.agentJudgment,
        plannedTurn.judgmentSource,
        appControlOutcome.type,
        null,
        {
          requestClass: requestPolicy.requestClass,
          participatingCapabilities: requestPolicy.participatingCapabilities,
        },
        { attemptNumber, recoveryAttempted, terminalFailure: false },
      ),
    );
    return repository.loadThread(aggregate.thread.id);
  } catch {
    if (!input.signal?.aborted) {
      captureTelemetry(
        AnalyticsEvent.UnifiedChatAgentPlanOutcome,
        buildUnifiedChatAgentPlanOutcomeTelemetry(
          plannedTurn.agentJudgment,
          plannedTurn.judgmentSource,
          'terminal_failure',
          failureCode,
          {
            requestClass: requestPolicy.requestClass,
            participatingCapabilities: requestPolicy.participatingCapabilities,
          },
          { attemptNumber, recoveryAttempted, terminalFailure: true },
        ),
      );
    }
    return finalizeUnifiedChatTurnFailurePhase({
      run,
      repository,
      failureCode,
      signal: input.signal,
      abortDisposition: input.abortDisposition,
      error: (message) => new UnifiedChatTurnError(message),
    });
  }
}
