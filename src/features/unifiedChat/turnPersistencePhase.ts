import type { UnifiedChatRepository } from './threadRepository';
import type { UnifiedChatMessage, UnifiedChatRun, UnifiedChatThreadAggregate } from './types';
import { transitionRun } from './runStateMachine';
import {
  validateUnifiedChatAttachmentSet,
  type UnifiedChatTextAttachment,
} from './unifiedChatAttachmentPolicy';
import { resolveConversationReferent } from './conversationReferent';
import { buildPendingWorkConversationReferent } from './conversationReferent';
import { toLocalDateKey } from '../../services/plan/planDates';

type PersistenceRepository = Pick<
  UnifiedChatRepository,
  | 'insertMessage'
  | 'createRun'
  | 'decideProposal'
  | 'transitionClientAction'
  | 'transitionRunStatus'
  | 'loadThread'
  | 'appendRunEvents'
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
  const referent = resolveConversationReferent(aggregate);
  const referencedItems = referent?.schemaVersion === 2 && referent.kind === 'pending_work'
    ? referent.items
    : [];
  const pendingProposalById = new Map(pendingProposals.map((proposal) => [proposal.id, proposal]));
  const referencedPendingProposals = referencedItems
    .map((item) => ({ item, proposal: pendingProposalById.get(item.proposalId) }))
    .filter((entry): entry is typeof entry & { proposal: NonNullable<typeof entry.proposal> } => Boolean(entry.proposal));
  const hasExactReferencedProposalSet = referencedItems.length > 1 &&
    referencedPendingProposals.length === referencedItems.length &&
    referencedPendingProposals.every(({ item, proposal }) => proposal.version === item.expectedVersion) &&
    pendingClientActions.length === 0;
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
      clarification: pendingCount > 1 && !hasExactReferencedProposalSet
        ? 'Which pending change should Kwilt cancel?'
        : null,
    },
  });
  onRunStarted?.({
    ...aggregate,
    messages: retryMessage ? aggregate.messages : [...aggregate.messages, userMessage],
    runs: [...aggregate.runs, controlRun],
  });

  let body: string;
  let eventLabel: string;
  if (hasExactReferencedProposalSet) {
    for (const { proposal } of referencedPendingProposals) {
      await repository.decideProposal({
        proposalId: proposal.id,
        action: 'reject',
        expectedVersion: proposal.version,
        note: 'Cancelled in Chat by the user.',
      });
      captureCorrection({ type: 'rejected', capabilityId: proposal.capabilityId });
    }
    body = "Okay—I won't make those changes.";
    eventLabel = 'Pending changes cancelled';
  } else if (pendingCount === 1 && pendingProposals[0]) {
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
      status: pendingCount > 1 && !hasExactReferencedProposalSet ? 'warning' : 'complete',
      visibility: 'user',
      label: eventLabel,
    },
  });
  return repository.loadThread(aggregate.thread.id);
}

export async function handleUnifiedChatPendingPrefixSelectionPhase({
  aggregate,
  userMessage,
  retryMessage,
  count,
  mode = 'prefix',
  repository,
  onRunStarted,
  captureCorrection,
  now = () => new Date(),
}: {
  aggregate: UnifiedChatThreadAggregate;
  userMessage: UnifiedChatMessage;
  retryMessage?: UnifiedChatMessage;
  count: number;
  mode?: 'prefix' | 'other';
  repository: PersistenceRepository;
  onRunStarted?: (aggregate: UnifiedChatThreadAggregate) => void;
  captureCorrection: (input: { type: 'rejected'; capabilityId?: string }) => void;
  now?: () => Date;
}): Promise<UnifiedChatThreadAggregate> {
  const referent = resolveConversationReferent(aggregate);
  const referencedItems = referent?.schemaVersion === 2 && referent.kind === 'pending_work'
    ? referent.items
    : [];
  const pendingById = new Map((aggregate.proposals ?? [])
    .filter((proposal) => proposal.status === 'pending' || proposal.status === 'edited' || proposal.status === 'deferred')
    .map((proposal) => [proposal.id, proposal]));
  const referencedPending = referencedItems.map((item) => ({ item, proposal: pendingById.get(item.proposalId) }))
    .filter((entry): entry is typeof entry & { proposal: NonNullable<typeof entry.proposal> } => Boolean(entry.proposal));
  const hasExactSet = referencedItems.length > 0 && referencedPending.length === referencedItems.length &&
    referencedPending.every(({ item, proposal }) => proposal.version === item.expectedVersion);
  const hasUsableSelection = hasExactSet && (mode === 'prefix' || referencedPending.length === 2);
  const participatingCapabilities = hasUsableSelection
    ? [...new Set(referencedPending.map(({ proposal }) => proposal.capabilityId))]
    : [];
  const controlRun = await repository.createRun({
    threadId: aggregate.thread.id,
    userMessageId: userMessage.id,
    requestClass: 'capability_action',
    participatingCapabilities,
    contextPolicy: {
      usePrivateContext: false,
      reason: 'typed-pending-work-selection',
      clarification: hasUsableSelection ? null : 'Which proposed changes should Kwilt keep?',
    },
  });
  onRunStarted?.({
    ...aggregate,
    messages: retryMessage ? aggregate.messages : [...aggregate.messages, userMessage],
    runs: [...aggregate.runs, controlRun],
  });

  let body: string;
  let eventLabel: string;
  if (!hasUsableSelection) {
    body = 'I can’t tell which set of proposed changes you mean. Which changes should I keep?';
    eventLabel = 'Selection needs a target';
  } else {
    const removed = mode === 'other' ? referencedPending.slice(0, 1) : referencedPending.slice(count);
    for (const { proposal } of removed) {
      await repository.decideProposal({
        proposalId: proposal.id,
        action: 'reject',
        expectedVersion: proposal.version,
        note: 'Removed from the pending set in Chat by the user.',
      });
      captureCorrection({ type: 'rejected', capabilityId: proposal.capabilityId });
    }
    const keptCount = mode === 'other' ? 1 : Math.min(count, referencedPending.length);
    body = mode === 'other'
      ? 'Okay—I kept the other change for review and removed the first one.'
      : removed.length === 0
      ? `All ${keptCount} changes are already waiting for review.`
      : `Okay—I kept the first ${keptCount === 1 ? 'one' : keptCount === 2 ? 'two' : keptCount} changes for review and removed the rest.`;
    eventLabel = 'Pending selection updated';
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
      status: hasUsableSelection ? 'complete' : 'warning',
      visibility: 'user',
      label: eventLabel,
      detail: body,
    },
  });
  return repository.loadThread(aggregate.thread.id);
}

export async function handleUnifiedChatPendingActivityWeekdayEditPhase({
  aggregate,
  userMessage,
  retryMessage,
  weekday,
  repository,
  onRunStarted,
  captureCorrection,
  now = () => new Date(),
}: {
  aggregate: UnifiedChatThreadAggregate;
  userMessage: UnifiedChatMessage;
  retryMessage?: UnifiedChatMessage;
  weekday: number;
  repository: PersistenceRepository;
  onRunStarted?: (aggregate: UnifiedChatThreadAggregate) => void;
  captureCorrection: (input: { type: 'edited'; capabilityId: 'todos' }) => void;
  now?: () => Date;
}): Promise<UnifiedChatThreadAggregate> {
  const referent = resolveConversationReferent(aggregate);
  const item = referent?.schemaVersion === 2 && referent.kind === 'pending_work' && referent.items.length === 1
    ? referent.items[0]
    : null;
  const proposal = item
    ? (aggregate.proposals ?? []).find((candidate) => candidate.id === item.proposalId)
    : null;
  const canEdit = Boolean(
    item && proposal && item.capabilityId === 'todos' && proposal.capabilityId === 'todos' &&
    (item.operationType === 'create_activity' || item.operationType === 'update_activity') &&
    (proposal.status === 'pending' || proposal.status === 'edited' || proposal.status === 'deferred') &&
    proposal.version === item.expectedVersion,
  );
  const controlRun = await repository.createRun({
    threadId: aggregate.thread.id,
    userMessageId: userMessage.id,
    requestClass: 'capability_action',
    participatingCapabilities: canEdit ? ['todos'] : [],
    contextPolicy: {
      usePrivateContext: false,
      reason: 'typed-pending-activity-date-correction',
      clarification: canEdit ? null : 'Which To-do should Kwilt move?',
    },
  });
  onRunStarted?.({
    ...aggregate,
    messages: retryMessage ? aggregate.messages : [...aggregate.messages, userMessage],
    runs: [...aggregate.runs, controlRun],
  });

  let body: string;
  let eventStatus: 'complete' | 'warning';
  if (!canEdit || !item || !proposal) {
    body = 'Which proposed To-do change should I move?';
    eventStatus = 'warning';
  } else {
    const scheduled = new Date(now());
    const offset = (weekday - scheduled.getDay() + 7) % 7;
    scheduled.setDate(scheduled.getDate() + offset);
    const scheduledDate = toLocalDateKey(scheduled);
    const decision = await repository.decideProposal({
      proposalId: proposal.id,
      action: 'edit',
      expectedVersion: proposal.version,
      patch: { scheduledDate },
      note: 'Changed in Chat by the user.',
    });
    captureCorrection({ type: 'edited', capabilityId: 'todos' });
    const weekdayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(scheduled);
    body = `Okay—I moved that change to ${weekdayLabel}. It is still waiting for your review.`;
    eventStatus = 'complete';
    await repository.appendRunEvents({
      threadId: aggregate.thread.id,
      runId: controlRun.id,
      events: [{
        sequence: 1,
        type: 'conversation_referent',
        status: 'complete',
        visibility: 'internal',
        label: 'Edited work awaiting review',
        detail: null,
        payload: buildPendingWorkConversationReferent([{
          ...item,
          expectedVersion: decision.version,
        }]),
      }],
    });
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
      type: 'correction', status: eventStatus, visibility: 'user',
      label: eventStatus === 'complete' ? 'Pending date changed' : 'Date change needs a target',
      detail: body,
    },
  });
  return repository.loadThread(aggregate.thread.id);
}
