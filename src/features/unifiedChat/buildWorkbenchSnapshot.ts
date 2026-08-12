import type { UnifiedChatMutationReceipt, UnifiedChatRun, UnifiedChatRunEvent, UnifiedChatThreadAggregate } from './types';
import type {
  AgentWorkbenchContextRef,
  AgentWorkbenchOffer,
  AgentWorkbenchRun,
  AgentWorkbenchSnapshot,
  AgentWorkbenchTimelineItem,
  AgentWorkbenchTurn,
} from './workbenchProtocol';
import { sanitizeVisibleAssistantText } from './visibleAssistantText';
import type { UnifiedChatTextAttachment } from './unifiedChatAttachmentPolicy';
import { buildActivityListMeta } from '../../utils/activityListMeta';
import type { Activity } from '../../domain/types';
import { getUnifiedChatProgressCopy } from './chatProgress';
import { getUnifiedChatFailureCopy } from './chatFailure';

type WorkbenchPresentation = {
  voice?: AgentWorkbenchSnapshot['composer']['voice'];
  attachments?: UnifiedChatTextAttachment[];
};

type FreshWorkbenchPresentation = WorkbenchPresentation & {
  context?: AgentWorkbenchContextRef[];
  offers?: AgentWorkbenchOffer[];
  placeholder?: string;
};

function buildKwiltWorkbenchProduct(placeholder = 'Ask, search or chat…'): AgentWorkbenchSnapshot['product'] {
  return {
    id: 'kwilt',
    assistantName: 'Kwilt',
    placeholder,
    features: {
      attachments: true,
      mentions: false,
      modelControl: false,
      runDepthControl: false,
      runModeControl: false,
      voice: true,
      webSearchControl: false,
    },
  };
}

function buildWorkbenchComposer(
  prompt: string,
  state: AgentWorkbenchSnapshot['composer']['state'],
  presentation?: WorkbenchPresentation,
): AgentWorkbenchSnapshot['composer'] {
  return {
    prompt,
    state,
    attachments: (presentation?.attachments ?? []).map((attachment) => ({
      id: attachment.id,
      name: attachment.name,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      kind: attachment.kind ?? 'text',
      status: attachment.status ?? 'ready',
      ...(attachment.failureReason ? { failureReason: attachment.failureReason } : {}),
    })),
    voice: presentation?.voice ?? { state: 'idle', elapsedSeconds: 0 },
  };
}

export function buildFreshWorkbenchSnapshot(
  prompt = '',
  presentation?: FreshWorkbenchPresentation,
): AgentWorkbenchSnapshot {
  return {
    product: buildKwiltWorkbenchProduct(presentation?.placeholder),
    context: presentation?.context ?? [],
    evidence: [],
    messages: [],
    runs: [],
    proposals: [],
    receipts: [],
    clientActions: [],
    artifacts: [],
    offers: presentation?.offers ?? [],
    composer: buildWorkbenchComposer(prompt, 'ready', presentation),
  };
}

export function formatProposalReceiptSummary(
  status: 'applied' | 'failed' | 'undone',
  operationType: string | undefined,
  title: string,
): string {
  if (status === 'failed') {
    const verb = operationType === 'schedule_activity' || operationType === 'schedule_activity_chunk' ? 'Could not schedule'
      : operationType === 'reschedule_activity' ? 'Could not move'
        : operationType === 'remove_activity_from_plan' ? 'Could not remove'
          : operationType === 'create_goal' ? 'Could not create'
            : operationType === 'create_money_category' ? 'Could not create'
            : operationType === 'delete_goal' ? 'Could not delete'
              : operationType === 'create_arc' ? 'Could not create'
                : operationType === 'delete_arc' ? 'Could not delete'
          : 'Could not update';
    return `${verb} ${title}`;
  }
  if (status === 'undone') {
    if (operationType === 'schedule_activity' || operationType === 'schedule_activity_chunk') return `Removed ${title} from Plan`;
    if (operationType === 'reschedule_activity') return `Moved ${title} back`;
    if (operationType === 'remove_activity_from_plan') return `Restored ${title} to Plan`;
    if (operationType === 'create_activity') return `Removed ${title}`;
    if (operationType === 'create_goal') return `Removed ${title}`;
    if (operationType === 'delete_goal') return `Restored ${title}`;
    if (operationType === 'create_arc') return `Removed ${title}`;
    if (operationType === 'delete_arc') return `Restored ${title}`;
    return `Restored ${title}`;
  }
  if (operationType === 'create_activity') return `Added ${title}`;
  if (operationType === 'create_money_category') return `Created ${title}`;
  if (operationType === 'rename_money_category') return `Renamed ${title}`;
  if (operationType === 'create_goal') return `Created ${title}`;
  if (operationType === 'delete_goal') return `Deleted ${title}`;
  if (operationType === 'create_arc') return `Created ${title}`;
  if (operationType === 'delete_arc') return `Deleted ${title}`;
  if (operationType === 'remember_relationship') return `Remembered ${title}`;
  if (operationType === 'correct_relationship') return `Corrected ${title}`;
  if (operationType === 'forget_relationship') return `Forgot ${title}`;
  if (operationType === 'schedule_activity' || operationType === 'schedule_activity_chunk') return `Scheduled ${title}`;
  if (operationType === 'reschedule_activity') return `Moved ${title}`;
  if (operationType === 'remove_activity_from_plan') return `Removed ${title} from Plan`;
  return `Updated ${title}`;
}

function projectRun(
  run: UnifiedChatRun,
  persistedEvents: readonly UnifiedChatRunEvent[],
  canRetry: boolean,
): AgentWorkbenchRun {
  const isActive = run.status === 'queued' || run.status === 'active';
  const isFailed = run.status === 'failed';
  const failureCopy = getUnifiedChatFailureCopy({
    failureCode: run.errorCode,
    participatingCapabilities: run.participatingCapabilities,
  });
  const fallbackEvents: AgentWorkbenchRun['events'] = isActive
    ? [
        {
          id: `${run.id}:working`,
          sequence: 1,
          type: 'progress',
          status: 'active',
          label: getUnifiedChatProgressCopy({
            phase: 'checking',
            participatingCapabilities: run.participatingCapabilities,
          }),
        },
      ]
    : isFailed
      ? [
          {
            id: `${run.id}:failed`,
            sequence: 1,
            type: 'error',
            status: 'failed',
            label: failureCopy.label,
            detail: failureCopy.detail,
          },
        ]
      : [];
  const events = persistedEvents.length > 0
    ? persistedEvents
        .filter((event) => event.visibility === 'user' && event.label)
        .map((event) => {
          const isTerminalFailureEvent = isFailed && (
            event.status === 'failed' &&
            (event.type === 'response' || event.label === 'Response interrupted')
          );
          return {
            id: event.id,
            sequence: event.sequence,
            type: event.type,
            status: isFailed && event.status === 'active' ? 'pending' as const : event.status,
            label: isTerminalFailureEvent ? failureCopy.label : event.label ?? 'Chat progress',
            ...(isTerminalFailureEvent
              ? { detail: failureCopy.detail }
              : event.detail ? { detail: event.detail } : {}),
          };
        })
    : fallbackEvents;
  const sourceEvent = run.initiator === 'system'
    ? {
        id: `${run.id}:source`, sequence: 0, type: 'source' as const, status: 'complete' as const,
        label: run.triggerKind === 'native_device_enforcement'
          ? 'Waiting for this device'
          : 'Prepared in the background',
      }
    : run.originChannel === 'sms' || run.originChannel === 'phone'
      ? {
          id: `${run.id}:source`, sequence: 0, type: 'source' as const, status: 'complete' as const,
          label: 'Started by Phone Agent',
        }
      : null;

  return {
    id: run.id,
    threadId: run.threadId,
    ...(run.userMessageId ? { userMessageId: run.userMessageId } : {}),
    ...(run.assistantMessageId ? { assistantMessageId: run.assistantMessageId } : {}),
    status: run.status,
    canRetry,
    events: sourceEvent ? [sourceEvent, ...events] : events,
  };
}

function buildWorkbenchTimeline(
  aggregate: UnifiedChatThreadAggregate,
  snapshot: Omit<AgentWorkbenchSnapshot, 'timeline' | 'composer' | 'product' | 'thread' | 'context'>,
): AgentWorkbenchTurn[] | undefined {
  const messagesById = new Map(snapshot.messages.map((message) => [message.id, message]));
  const evidenceByRun = new Map<string, string[]>();
  const proposalsByRun = new Map<string, string[]>();
  const receiptsByRun = new Map<string, string[]>();
  const clientActionsByRun = new Map<string, string[]>();
  const artifactsByRun = new Map<string, string[]>();
  const sourceProposalRun = new Map((aggregate.proposals ?? []).map((proposal) => [proposal.id, proposal.runId]));

  for (const evidence of snapshot.evidence) {
    evidenceByRun.set(evidence.runId, [...(evidenceByRun.get(evidence.runId) ?? []), evidence.id]);
  }
  for (const proposal of snapshot.proposals) {
    proposalsByRun.set(proposal.runId, [...(proposalsByRun.get(proposal.runId) ?? []), proposal.id]);
  }
  for (const receipt of snapshot.receipts) {
    const runId = sourceProposalRun.get(receipt.proposalId);
    if (runId) receiptsByRun.set(runId, [...(receiptsByRun.get(runId) ?? []), receipt.id]);
  }
  for (const action of snapshot.clientActions) {
    clientActionsByRun.set(action.runId, [...(clientActionsByRun.get(action.runId) ?? []), action.id]);
  }
  for (const artifact of snapshot.artifacts) {
    artifactsByRun.set(artifact.runId, [...(artifactsByRun.get(artifact.runId) ?? []), artifact.id]);
  }

  type PendingTurn = {
    id: string;
    createdAt: string;
    ordinal: number;
    runIds: string[];
    items: AgentWorkbenchTimelineItem[];
  };
  const pending: PendingTurn[] = [];
  const claimedMessageIds = new Set<string>();
  const claimedEvidenceIds = new Set<string>();
  const claimedProposalIds = new Set<string>();
  const claimedReceiptIds = new Set<string>();
  const claimedClientActionIds = new Set<string>();
  const claimedArtifactIds = new Set<string>();
  const runGroups = new Map<string, AgentWorkbenchRun[]>();

  for (const run of snapshot.runs) {
    const key = run.userMessageId ? `message:${run.userMessageId}` : `run:${run.id}`;
    runGroups.set(key, [...(runGroups.get(key) ?? []), run]);
  }

  for (const [groupKey, runs] of runGroups) {
    const sourceRuns = runs
      .map((run) => aggregate.runs.find((candidate) => candidate.id === run.id))
      .filter((run): run is UnifiedChatRun => Boolean(run))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    const orderedRuns = [...runs].sort((left, right) => {
      const leftIndex = sourceRuns.findIndex((run) => run.id === left.id);
      const rightIndex = sourceRuns.findIndex((run) => run.id === right.id);
      return leftIndex - rightIndex;
    });
    const latestRun = orderedRuns.at(-1);
    if (!latestRun) continue;

    const userMessage = latestRun.userMessageId ? messagesById.get(latestRun.userMessageId) : undefined;
    const assistantMessageIds = new Set([
      ...orderedRuns.flatMap((run) => run.assistantMessageId ? [run.assistantMessageId] : []),
      ...orderedRuns.flatMap((run) => (aggregate.proposals ?? [])
        .filter((proposal) => proposal.runId === run.id && proposal.messageId)
        .map((proposal) => proposal.messageId as string)),
    ]);
    const assistantMessages = [...assistantMessageIds]
      .flatMap((id) => {
        const message = messagesById.get(id);
        return message?.role === 'assistant' ? [message] : [];
      })
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    const items: AgentWorkbenchTimelineItem[] = [];
    if (userMessage) {
      items.push({ kind: 'message', id: userMessage.id });
      claimedMessageIds.add(userMessage.id);
    }
    if (latestRun.status === 'queued' || latestRun.status === 'active' || latestRun.status === 'failed') {
      items.push({ kind: 'run', id: latestRun.id });
    }
    for (const assistantMessage of assistantMessages) {
      items.push({ kind: 'message', id: assistantMessage.id });
      claimedMessageIds.add(assistantMessage.id);
    }
    for (const run of orderedRuns) {
      const evidenceIds = evidenceByRun.get(run.id) ?? [];
      if (evidenceIds.length > 0) {
        items.push({ kind: 'evidence', ids: evidenceIds });
        evidenceIds.forEach((id) => claimedEvidenceIds.add(id));
      }
      for (const proposalId of proposalsByRun.get(run.id) ?? []) {
        items.push({ kind: 'proposal', id: proposalId });
        claimedProposalIds.add(proposalId);
      }
      for (const receiptId of receiptsByRun.get(run.id) ?? []) {
        items.push({ kind: 'receipt', id: receiptId });
        claimedReceiptIds.add(receiptId);
      }
      for (const actionId of clientActionsByRun.get(run.id) ?? []) {
        items.push({ kind: 'client_action', id: actionId });
        claimedClientActionIds.add(actionId);
      }
      for (const artifactId of artifactsByRun.get(run.id) ?? []) {
        items.push({ kind: 'artifact', id: artifactId });
        claimedArtifactIds.add(artifactId);
      }
    }

    const firstSourceRun = sourceRuns[0];
    if (items.length > 0) {
      pending.push({
        id: firstSourceRun ? `run:${firstSourceRun.id}` : groupKey,
        createdAt: userMessage?.createdAt ?? firstSourceRun?.createdAt ?? '',
        ordinal: pending.length,
        runIds: orderedRuns.map((run) => run.id),
        items,
      });
    }
  }

  for (const message of snapshot.messages) {
    if (claimedMessageIds.has(message.id)) continue;
    pending.push({
      id: `message:${message.id}`,
      createdAt: message.createdAt,
      ordinal: pending.length,
      runIds: [],
      items: [{ kind: 'message', id: message.id }],
    });
  }

  const hasOrphanedArtifact =
    snapshot.evidence.some((item) => !claimedEvidenceIds.has(item.id)) ||
    snapshot.proposals.some((item) => !claimedProposalIds.has(item.id)) ||
    snapshot.receipts.some((item) => !claimedReceiptIds.has(item.id)) ||
    snapshot.clientActions.some((item) => !claimedClientActionIds.has(item.id)) ||
    snapshot.artifacts.some((item) => !claimedArtifactIds.has(item.id));
  if (hasOrphanedArtifact) return undefined;

  const baseTurns = [...pending]
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.ordinal - right.ordinal);
  const shouldEchoCorrection = (runId: string, changedAt: string) => {
    const ownerIndex = baseTurns.findIndex((turn) => turn.runIds.includes(runId));
    return ownerIndex >= 0 && baseTurns.some(
      (turn, index) => index > ownerIndex && turn.createdAt.localeCompare(changedAt) < 0,
    );
  };
  const proposalsWithUndoEcho = new Set(snapshot.receipts.flatMap((receipt) => {
    const source = (aggregate.receipts ?? []).find((candidate) => candidate.id === receipt.id);
    const runId = sourceProposalRun.get(receipt.proposalId);
    return source?.undoneAt && runId && shouldEchoCorrection(runId, source.undoneAt)
      ? [receipt.proposalId]
      : [];
  }));
  for (const proposal of snapshot.proposals) {
    const source = (aggregate.proposals ?? []).find((candidate) => candidate.id === proposal.id);
    if (!source || source.status === 'pending' || proposalsWithUndoEcho.has(proposal.id) ||
      !shouldEchoCorrection(source.runId, source.updatedAt)) continue;
    pending.push({
      id: `correction:proposal:${proposal.id}:${proposal.version}`,
      createdAt: source.updatedAt,
      ordinal: pending.length,
      runIds: [],
      items: [{
        kind: 'correction',
        id: `correction:proposal:${proposal.id}:${proposal.version}`,
        targetKind: 'proposal',
        targetItemId: proposal.id,
        summary: proposal.status === 'applied'
          ? 'Applied an earlier change'
          : proposal.status === 'failed'
            ? 'An earlier change could not be applied'
            : 'Updated an earlier change',
      }],
    });
  }
  for (const receipt of snapshot.receipts) {
    const source = (aggregate.receipts ?? []).find((candidate) => candidate.id === receipt.id);
    const runId = sourceProposalRun.get(receipt.proposalId);
    if (!source?.undoneAt || !runId || !shouldEchoCorrection(runId, source.undoneAt)) continue;
    pending.push({
      id: `correction:receipt:${receipt.id}:undone`,
      createdAt: source.undoneAt,
      ordinal: pending.length,
      runIds: [],
      items: [{
        kind: 'correction',
        id: `correction:receipt:${receipt.id}:undone`,
        targetKind: 'receipt',
        targetItemId: receipt.id,
        summary: 'Undid an earlier change',
      }],
    });
  }

  return pending
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.ordinal - right.ordinal)
    .map(({ id, items }, index) => ({ id, sequence: index + 1, items }));
}

export function buildWorkbenchSnapshot(
  aggregate: UnifiedChatThreadAggregate,
  prompt = '',
  presentation?: WorkbenchPresentation,
): AgentWorkbenchSnapshot {
  const hasActiveRun = aggregate.runs.some(
    (run) => run.status === 'queued' || run.status === 'active',
  );
  const compactCreateProposals = new Set(
    (aggregate.proposals ?? [])
      .filter((proposal) =>
        proposal.operation.type === 'create_activity' &&
        (aggregate.proposals ?? []).filter((candidate) => candidate.runId === proposal.runId).length === 1 &&
        (proposal.status === 'applied' || proposal.status === 'undone'),
      )
      .map((proposal) => proposal.id),
  );
  const compactCreateMessageIds = new Set(
    (aggregate.proposals ?? [])
      .filter((proposal) => compactCreateProposals.has(proposal.id) && proposal.messageId)
      .map((proposal) => proposal.messageId as string),
  );
  const proposalIdByOutcomeSequence = new Map(
    (aggregate.proposals ?? []).flatMap((proposal) => proposal.operation.outcomeStep
      ? [[`${proposal.runId}:${proposal.operation.outcomeStep.sequence}`, proposal.id] as const]
      : []),
  );
  const latestRunIdByUserMessageId = new Map<string, string>();
  for (const run of [...aggregate.runs].sort(
    (left, right) => left.createdAt.localeCompare(right.createdAt),
  )) {
    if (run.userMessageId) latestRunIdByUserMessageId.set(run.userMessageId, run.id);
  }
  const runById = new Map(aggregate.runs.map((run) => [run.id, run]));
  const visibleEvidence = (aggregate.evidence ?? []).filter((evidence) => {
    const run = runById.get(evidence.runId);
    if (!run?.userMessageId) return true;
    return latestRunIdByUserMessageId.get(run.userMessageId) === run.id;
  });
  const snapshot: AgentWorkbenchSnapshot = {
    product: buildKwiltWorkbenchProduct(),
    thread: {
      id: aggregate.thread.id,
      title: aggregate.thread.title,
      status: aggregate.thread.status,
    },
    context: (aggregate.contextRefs ?? [])
      .filter((context) => context.active)
      .map((context) => ({
        id: context.id,
        capabilityId: context.capabilityId,
        object: {
          id: context.objectId,
          type: context.objectType,
          label: context.label,
          ...(context.secondaryLabel ? { secondaryLabel: context.secondaryLabel } : {}),
        },
        source: context.source,
        removable: true,
        version: context.version,
      })),
    evidence: visibleEvidence.map((evidence) => ({
      id: evidence.id,
      runId: evidence.runId,
      capabilityId: evidence.capabilityId,
      object: {
        id: evidence.objectId,
        type: evidence.objectType,
        label: evidence.label,
      },
      selectionStatus: evidence.selectionStatus,
      authority: evidence.authority,
      freshness: evidence.freshness,
      selectionReason: evidence.selectionReason,
      sufficient: evidence.sufficient,
      coverageNote: evidence.coverageNote,
    })),
    messages: aggregate.messages.filter(
      (message) => !compactCreateMessageIds.has(message.id),
    ).map((message) => ({
      id: message.id,
      threadId: message.threadId,
      role: message.role,
      body: message.role === 'assistant'
        ? sanitizeVisibleAssistantText(message.body)
        : message.body,
      createdAt: message.createdAt,
      feedback: message.feedback,
      attachments: (message.attachments ?? []).map((attachment) => ({
        id: attachment.id,
        name: attachment.name,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        kind: attachment.kind ?? 'text',
        status: attachment.status ?? 'ready',
        ...(attachment.failureReason ? { failureReason: attachment.failureReason } : {}),
      })),
    })),
    runs: aggregate.runs.map((run) => projectRun(
      run,
      (aggregate.events ?? []).filter((event) => event.runId === run.id),
      run.status === 'failed' && !(aggregate.proposals ?? []).some((proposal) => proposal.runId === run.id),
    )),
    proposals: (aggregate.proposals ?? []).filter(
      (proposal) => !compactCreateProposals.has(proposal.id),
    ).map((proposal) => {
      const { expectedUpdatedAt: _expectedUpdatedAt, ...fields } = proposal.operation.payload as Record<string, unknown>;
      const currentTargetLabel = proposal.operation.targetId
        ? visibleEvidence.find((item) => item.objectId === proposal.operation.targetId)?.label
        : null;
      const visibleFields = proposal.capabilityId === 'screenTime'
        ? proposal.operation.type === 'create_family_screen_time_prerequisite_agreement'
          ? {
              thresholdMinutes: proposal.operation.payload.rule.prerequisiteActivity.thresholdMinutes,
              reset: proposal.operation.payload.rule.prerequisiteActivity.reset,
              targetCount: 1,
            }
          : {
              expiresAt: proposal.operation.payload.expiresAt,
              timeBasis: proposal.operation.payload.timeBasis,
              targetCount: proposal.operation.payload.targets.length,
            }
        : proposal.capabilityId !== 'plan'
        ? proposal.operation.type === 'update_activity' && currentTargetLabel
          ? { ...fields, currentTitle: currentTargetLabel }
          : fields
        : proposal.operation.type === 'remove_activity_from_plan'
          ? {
              action: 'remove',
              previousStartDate: proposal.operation.payload.previousStartDate,
              previousEndDate: proposal.operation.payload.previousEndDate,
              targetDateKey: proposal.operation.payload.previousTargetDateKey,
            }
          : {
              startDate: proposal.operation.payload.startDate,
              endDate: proposal.operation.payload.endDate,
              targetDateKey: proposal.operation.payload.targetDateKey,
            };
      return {
        id: proposal.id,
        runId: proposal.runId,
        ...(proposal.messageId ? { messageId: proposal.messageId } : {}),
        capabilityId: proposal.capabilityId,
        title: proposal.title,
        body: proposal.body,
        status: proposal.status,
        version: proposal.version,
        ...(proposal.operation.outcomeStep ? {
          outcome: {
            sequence: proposal.operation.outcomeStep.sequence,
            ...(proposal.operation.outcomeStep.dependsOnSequence === null ? {} : {
              dependsOnProposalId: proposalIdByOutcomeSequence.get(
                `${proposal.runId}:${proposal.operation.outcomeStep.dependsOnSequence}`,
              ),
            }),
          },
        } : {}),
        operation: {
          id: proposal.operation.id,
          type: proposal.operation.type,
          ...(proposal.operation.targetId ? { targetId: proposal.operation.targetId } : {}),
          summary: proposal.operation.summary,
          fields: visibleFields,
        },
      };
    }),
    receipts: (aggregate.receipts ?? []).filter(
      (receipt): receipt is UnifiedChatMutationReceipt & { status: 'applied' | 'failed' | 'undone' } =>
        receipt.status !== 'reserved' && !(
          receipt.status === 'undone' &&
          (aggregate.proposals ?? []).find((candidate) => candidate.id === receipt.proposalId)?.operation.type === 'create_activity'
        ),
    ).map((receipt) => {
      const proposal = (aggregate.proposals ?? []).find((candidate) => candidate.id === receipt.proposalId);
      const creating = proposal?.operation.type === 'create_activity';
      const relationshipBefore = receipt.resultState.before && typeof receipt.resultState.before === 'object'
        ? receipt.resultState.before as Record<string, unknown>
        : {};
      const title = typeof receipt.resultState.title === 'string'
        ? receipt.resultState.title
        : typeof receipt.resultState.name === 'string'
          ? receipt.resultState.name
          : typeof receipt.resultState.personName === 'string'
            ? receipt.resultState.personName
            : receipt.capabilityId === 'relationships' && typeof relationshipBefore.title === 'string'
              ? relationshipBefore.title
              : receipt.capabilityId === 'relationships' && typeof relationshipBefore.text === 'string'
                ? relationshipBefore.text
                : receipt.capabilityId === 'relationships' && typeof relationshipBefore.display_name === 'string'
                  ? relationshipBefore.display_name
          : receipt.capabilityId === 'profile' ? 'Profile'
            : receipt.capabilityId === 'chapters' && typeof receipt.resultState.periodKey === 'string'
              ? `Chapter ${receipt.resultState.periodKey}`
              : receipt.capabilityId === 'relationships' && typeof receipt.resultState.recordType === 'string'
                ? `saved ${receipt.resultState.recordType}`
                : null;
      const showInventory = Boolean(creating && receipt.status === 'applied' && title);
      const inventoryMeta = showInventory
        ? buildActivityListMeta({ activity: receipt.resultState as unknown as Activity })
        : {};
      return {
        id: receipt.id,
        proposalId: receipt.proposalId,
        status: receipt.status,
        summary: receipt.capabilityId === 'screenTime' && receipt.status === 'applied'
          ? receipt.resultState.deviceState === 'applied'
            ? 'Saved · Applied on the child device'
            : receipt.resultState.deviceState === 'device_required'
              ? 'Saved · Child device setup needed'
              : receipt.resultState.deviceState === 'failed'
                ? 'Saved · Child device needs attention'
                : 'Saved · Applying to the child device'
          : title
          ? formatProposalReceiptSummary(receipt.status, proposal?.operation.type, title)
          : receipt.status === 'failed' ? 'The change could not be applied' : 'Kwilt saved the change',
        ...(receipt.resultingObjectId && title
          ? { object: { id: receipt.resultingObjectId, type: receipt.resultingObjectType ?? 'activity', label: title } }
          : {}),
        ...(showInventory && title ? {
          inventoryItem: {
            title,
            ...(inventoryMeta.meta ? { meta: inventoryMeta.meta } : {}),
            ...(inventoryMeta.estimateMeta ? { estimateMeta: inventoryMeta.estimateMeta } : {}),
            ...(inventoryMeta.metaTone ? { metaTone: inventoryMeta.metaTone } : {}),
            isCompleted: receipt.resultState.status === 'done',
          },
        } : {}),
        ...(receipt.returnTarget ? { returnTarget: receipt.returnTarget } : {}),
        canUndo: receipt.canUndo,
      };
    }),
    clientActions: (aggregate.clientActions ?? []).map((action) => ({
      id: action.id, runId: action.runId, capabilityId: action.capabilityId,
      actionType: action.actionType, title: action.title,
      consequenceSummary: action.consequenceSummary, status: action.status,
      version: action.version,
      canContinue: action.status === 'pending_client_action' || action.status === 'presenting',
    })),
    artifacts: (aggregate.artifacts ?? []).map((artifact) => ({
      id: artifact.id, runId: artifact.runId, messageId: artifact.messageId,
      title: artifact.title, kind: artifact.kind, content: artifact.content,
      version: artifact.version, label: 'Draft' as const, editable: true as const,
    })),
    composer: buildWorkbenchComposer(prompt, hasActiveRun ? 'working' : 'ready', presentation),
  };
  const timeline = buildWorkbenchTimeline(aggregate, snapshot);
  if (timeline) snapshot.timeline = timeline;
  return snapshot;
}
