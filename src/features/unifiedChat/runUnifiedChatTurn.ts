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
import { buildRunContext } from './buildRunContext';
import {
  collectCapabilityEvidence,
  type UnifiedChatCapabilitySnapshots,
} from './capabilityAdapters';
import type { BuiltRunContext } from './capabilityContracts';
import {
  ACTIVITY_ACTION_RESPONSE_FORMAT,
  parseActivityActionResponse,
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

export class UnifiedChatTurnError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnifiedChatTurnError';
  }
}

type TurnRepository = Pick<
  UnifiedChatRepository,
  | 'insertMessage'
  | 'createRun'
  | 'appendRunEvents'
  | 'persistRunEvidence'
  | 'createProposal'
  | 'transitionRunStatus'
  | 'loadThread'
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
};

export type RunUnifiedChatTurnDependencies = {
  repository: TurnRepository;
  sendCoachChat: SendCoachChat;
  loadCapabilitySnapshots?: (
    capabilities: readonly UnifiedChatCapabilityId[],
  ) => Promise<UnifiedChatCapabilitySnapshots>;
};

const EMPTY_CAPABILITY_SNAPSHOTS: UnifiedChatCapabilitySnapshots = {
  goals: { goals: [] },
  todos: { activities: [], goals: [] },
  chapters: { chapters: [] },
};

async function loadDefaultCapabilitySnapshots(
  capabilities: readonly UnifiedChatCapabilityId[],
): Promise<UnifiedChatCapabilitySnapshots> {
  const [{ useAppStore }, { fetchMyChapters }] = await Promise.all([
    import('../../store/useAppStore'),
    import('../../services/chapters'),
  ]);
  const state = useAppStore.getState();
  const chapters = capabilities.includes('chapters')
    ? await fetchMyChapters({ limit: 20, throwOnError: true })
    : [];
  return {
    goals: { goals: state.goals },
    todos: { activities: state.activities, goals: state.goals },
    chapters: { chapters },
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

function groundingSummary(
  requestClass: string,
  usePrivateContext: boolean,
  context: BuiltRunContext,
  attachments: readonly UnifiedChatTextAttachment[],
): string {
  const policy = `Launch source: unifiedChat. Request class: ${requestClass}.`;
  const parts = [
    policy,
  ];
  if (requestClass === 'capability_action') {
    parts.push(
      'Prepare at most one To-do operation. This request is already inside Kwilt; never ask which app or system owns the To-do. For explicit creation, identify the title and safe record fields; the native Quick Add pipeline owns steps, triggers, details, and cover-image enrichment under its existing permissions and entitlements. For an update, when exactly one selected Activity matches the user-named To-do, prepare the requested low-risk update instead of asking for details that are not required by the Activity field being changed. Copy targetId and expectedUpdatedAt exactly from that selected evidence machine reference. Ask one short clarification only when multiple selected Activities plausibly match or the requested field value is genuinely unresolved. Do not invent sharing, spending, Screen Time enforcement, or effects outside the Activity contract.',
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
  const loadCapabilitySnapshots =
    dependencies?.loadCapabilitySnapshots ?? loadDefaultCapabilitySnapshots;
  const prompt = input.prompt.trim();
  if (!prompt) throw new UnifiedChatTurnError('Write a message first.');
  if (
    input.aggregate.runs.some((run) => run.status === 'queued' || run.status === 'active')
  ) {
    throw new UnifiedChatTurnError('A response is already in progress.');
  }

  const retryRun = input.retryRunId
    ? input.aggregate.runs.find((candidate) => candidate.id === input.retryRunId && candidate.status === 'failed')
    : undefined;
  if (input.retryRunId && !retryRun) {
    throw new UnifiedChatTurnError('That response is no longer available to retry.');
  }
  if (retryRun && (input.aggregate.proposals ?? []).some((proposal) => proposal.runId === retryRun.id)) {
    throw new UnifiedChatTurnError('That response already produced a change for review.');
  }
  const retryMessage = retryRun?.userMessageId
    ? input.aggregate.messages.find((message) => message.id === retryRun.userMessageId && message.role === 'user')
    : undefined;
  if (retryRun && !retryMessage) {
    throw new UnifiedChatTurnError('Kwilt could not find the original message to retry.');
  }
  const requestedAttachments = validateUnifiedChatAttachmentSet(input.attachments ?? []);
  const turnAttachments = retryMessage?.attachments ?? requestedAttachments;
  const userMessage = retryMessage ?? await repository.insertMessage({
    threadId: input.aggregate.thread.id,
    role: 'user',
    body: prompt,
    clientRequestId: input.clientRequestId,
    attachments: turnAttachments,
  });
  const activeContext = (input.aggregate.contextRefs ?? []).filter((context) => context.active);
  const requestPolicy = classifyUnifiedChatRequest({
    prompt,
    context: activeContext.map((context) => ({
      capabilityId: context.capabilityId,
      objectType: context.objectType,
      objectId: context.objectId,
    })),
  });
  const run = await repository.createRun({
    threadId: input.aggregate.thread.id,
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
    ...input.aggregate,
    messages: retryMessage
      ? input.aggregate.messages
      : [...input.aggregate.messages, userMessage],
    runs: [...input.aggregate.runs, run],
  });
  const history: CoachChatTurn[] = [
    ...input.aggregate.messages.map((message) => ({
      role: message.role,
      content: message.body,
    })),
    ...(retryMessage ? [] : [{ role: 'user' as const, content: userMessage.body }]),
  ];
  let failureCode = 'context_selection_failed';

  try {
    const snapshots = requestPolicy.usePrivateContext
      ? await loadCapabilitySnapshots(requestPolicy.participatingCapabilities)
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
      threadId: input.aggregate.thread.id,
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
      threadId: input.aggregate.thread.id,
      runId: run.id,
      evidence: persistenceRows(context),
    });
    const supportsTypedAction =
      requestPolicy.requestClass !== 'capability_action' ||
      requestPolicy.participatingCapabilities.includes('todos');
    if (!supportsTypedAction) {
      const clarification = requestPolicy.clarification ??
        'Kwilt can prepare reviewed To-do changes here right now. What To-do would you like to change?';
      const assistantMessage = await repository.insertMessage({
        threadId: input.aggregate.thread.id,
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
      return repository.loadThread(input.aggregate.thread.id);
    }
    const expectsActivityProposal =
      requestPolicy.requestClass === 'capability_action' &&
      requestPolicy.participatingCapabilities.includes('todos');
    const expectsGroundedAnswer = (requestPolicy.usePrivateContext || turnAttachments.length > 0) && !expectsActivityProposal;
    failureCode = 'model_response_failed';
    const response = await sendCoachChat(history, {
      aiJob: 'default_chat',
      workflowInstanceId: input.aggregate.thread.id,
      includeUserProfileContext: false,
      signal: input.signal,
      ...(expectsActivityProposal
        ? { responseFormat: { ...ACTIVITY_ACTION_RESPONSE_FORMAT } }
        : expectsGroundedAnswer
          ? { responseFormat: { ...GROUNDED_ANSWER_RESPONSE_FORMAT } }
        : {}),
      launchContextSummary: groundingSummary(
        requestPolicy.requestClass,
        requestPolicy.usePrivateContext,
        context,
        turnAttachments,
      ),
      paywallSource: 'unknown',
    });
    const parsedActionResponse = expectsActivityProposal
      ? parseActivityActionResponse(response)
      : null;
    const directCreateTitle = expectsActivityProposal ? directTodoCaptureTitle(prompt) : null;
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
    if (expectsActivityProposal && !actionResponse) {
      failureCode = 'action_response_invalid';
      throw new UnifiedChatTurnError('Kwilt could not prepare a safe To-do proposal.');
    }
    if (expectsGroundedAnswer && !groundedAnswer) {
      failureCode = 'grounded_response_invalid';
      throw new UnifiedChatTurnError('Kwilt could not separate its evidence and limits safely.');
    }
    const visibleBody = groundedAnswer
      ? formatGroundedAnswer(groundedAnswer)
      : sanitizeVisibleAssistantText(actionResponse?.answer ?? response);
    if (!visibleBody) {
      failureCode = 'visible_response_invalid';
      throw new UnifiedChatTurnError('Kwilt did not produce a visible answer.');
    }
    failureCode = 'assistant_persistence_failed';
    const assistantMessage = await repository.insertMessage({
      threadId: input.aggregate.thread.id,
      role: 'assistant',
      body: visibleBody,
    });
    if (actionResponse?.proposal) {
      failureCode = 'proposal_persistence_failed';
      const operation = actionResponse.proposal.operation;
      await repository.createProposal({
        threadId: input.aggregate.thread.id,
        runId: run.id,
        messageId: assistantMessage.id,
        capabilityId: 'todos',
        title: actionResponse.proposal.title,
        body: actionResponse.proposal.body,
        permissionPolicy: { requiresExplicitApproval: true },
        operation: {
          type: operation.type,
          targetId: operation.targetId,
          expectedUpdatedAt: operation.expectedUpdatedAt,
          payload: operation.payload,
          summary: actionResponse.proposal.title,
          idempotencyKey: `unified-chat:${run.id}:1`,
        },
      });
    }
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
        label: actionResponse?.proposal ? 'Prepared a change for review' : 'Response ready',
      },
    });
    return repository.loadThread(input.aggregate.thread.id);
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
