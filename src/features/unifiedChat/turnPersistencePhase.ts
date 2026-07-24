import type { UnifiedChatRepository } from './threadRepository';
import type { UnifiedChatMessage, UnifiedChatRun, UnifiedChatThreadAggregate } from './types';
import { transitionRun } from './runStateMachine';
import {
  validateUnifiedChatAttachmentSet,
  type UnifiedChatTextAttachment,
} from './unifiedChatAttachmentPolicy';

type PersistenceRepository = Pick<
  UnifiedChatRepository,
  | 'insertMessage'
  | 'createRun'
  | 'decideProposal'
  | 'transitionClientAction'
  | 'transitionRunStatus'
  | 'loadThread'
>;

export type PersistUnifiedChatTurnPhaseInput = {
  aggregate: UnifiedChatThreadAggregate;
  prompt: string;
  clientRequestId?: string;
  retryRunId?: string;
  attachments?: UnifiedChatTextAttachment[];
  repository: PersistenceRepository;
  loadAggregate: (threadId: string) => Promise<UnifiedChatThreadAggregate>;
  error: (message: string) => Error;
};

export type PersistedUnifiedChatTurn = {
  prompt: string;
  aggregate: UnifiedChatThreadAggregate;
  retryRun?: UnifiedChatRun;
  retryMessage?: UnifiedChatMessage;
  userMessage: UnifiedChatMessage;
  turnAttachments: UnifiedChatTextAttachment[];
};

export async function persistUnifiedChatTurnPhase(
  input: PersistUnifiedChatTurnPhaseInput,
): Promise<PersistedUnifiedChatTurn> {
  const prompt = input.prompt.trim();
  if (!prompt) throw input.error('Write a message first.');

  const aggregate = await input.loadAggregate(input.aggregate.thread.id);
  if (aggregate.runs.some((run) => run.status === 'queued' || run.status === 'active')) {
    throw input.error('A response is already in progress.');
  }

  const retryRun = input.retryRunId
    ? aggregate.runs.find((candidate) =>
        candidate.id === input.retryRunId && candidate.status === 'failed')
    : undefined;
  if (input.retryRunId && !retryRun) {
    throw input.error('That response is no longer available to retry.');
  }
  if (retryRun && (aggregate.proposals ?? []).some((proposal) => proposal.runId === retryRun.id)) {
    throw input.error('That response already produced a change for review.');
  }

  const retryMessage = retryRun?.userMessageId
    ? aggregate.messages.find((message) =>
        message.id === retryRun.userMessageId && message.role === 'user')
    : undefined;
  if (retryRun && !retryMessage) {
    throw input.error('Kwilt could not find the original message to retry.');
  }

  const requestedAttachments = validateUnifiedChatAttachmentSet(input.attachments ?? []);
  const turnAttachments = retryMessage?.attachments ?? requestedAttachments;
  const userMessage = retryMessage ?? await input.repository.insertMessage({
    threadId: aggregate.thread.id,
    role: 'user',
    body: prompt,
    clientRequestId: input.clientRequestId,
    attachments: turnAttachments,
  });

  return {
    prompt,
    aggregate,
    retryRun,
    retryMessage,
    userMessage,
    turnAttachments,
  };
}

export async function handleUnifiedChatPendingCancellationPhase({
  aggregate,
  userMessage,
  retryMessage,
  repository,
  onRunStarted,
  captureCorrection,
  now = () => new Date(),
}: {
  aggregate: UnifiedChatThreadAggregate;
  userMessage: UnifiedChatMessage;
  retryMessage?: UnifiedChatMessage;
  repository: PersistenceRepository;
  onRunStarted?: (aggregate: UnifiedChatThreadAggregate) => void;
  captureCorrection: (input: {
    type: 'cancel_pending' | 'rejected';
    capabilityId?: string;
  }) => void;
  now?: () => Date;
}): Promise<UnifiedChatThreadAggregate> {
  captureCorrection({ type: 'cancel_pending' });
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
  onRunStarted?.({
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
    captureCorrection({
      type: 'rejected',
      capabilityId: pendingProposals[0].capabilityId,
    });
    body = "Okay—I won't make that change.";
    eventLabel = 'Pending change cancelled';
  } else if (pendingCount === 1 && pendingClientActions[0]) {
    const action = pendingClientActions[0];
    await repository.transitionClientAction({
      actionId: action.id,
      fromStatus: action.status,
      toStatus: 'declined',
      expectedVersion: action.version,
      result: { outcome: 'declined_in_chat' },
      completedAt: now().toISOString(),
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
    runId: controlRun.id,
    fromStatus: 'active',
    toStatus: 'complete',
    expectedVersion: controlRun.version,
    assistantMessageId: assistantMessage.id,
    errorCode: null,
    errorMessage: null,
    completedAt: now().toISOString(),
    event: {
      type: 'correction',
      status: pendingCount > 1 ? 'warning' : 'complete',
      visibility: 'user',
      label: eventLabel,
    },
  });
  return repository.loadThread(aggregate.thread.id);
}
