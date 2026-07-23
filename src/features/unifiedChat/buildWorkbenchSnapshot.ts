import type { UnifiedChatMutationReceipt, UnifiedChatRun, UnifiedChatRunEvent, UnifiedChatThreadAggregate } from './types';
import type {
  AgentWorkbenchRun,
  AgentWorkbenchSnapshot,
  AgentWorkbenchTimelineItem,
  AgentWorkbenchTurn,
} from './workbenchProtocol';
import { sanitizeVisibleAssistantText } from './visibleAssistantText';
import type { UnifiedChatTextAttachment } from './unifiedChatAttachmentPolicy';
import { buildActivityListMeta } from '../../utils/activityListMeta';
import type { Activity } from '../../domain/types';

function projectRun(
  run: UnifiedChatRun,
  persistedEvents: readonly UnifiedChatRunEvent[],
  canRetry: boolean,
): AgentWorkbenchRun {
  const isActive = run.status === 'queued' || run.status === 'active';
  const isFailed = run.status === 'failed';
  const fallbackEvents: AgentWorkbenchRun['events'] = isActive
    ? [
        {
          id: `${run.id}:working`,
          sequence: 1,
          type: 'progress',
          status: 'active',
          label: 'Preparing a response',
        },
      ]
    : isFailed
      ? [
          {
            id: `${run.id}:failed`,
            sequence: 1,
            type: 'error',
            status: 'failed',
            label: 'Response interrupted',
            detail: 'Try sending your message again.',
          },
        ]
      : [];
  const events = persistedEvents.length > 0
    ? persistedEvents
        .filter((event) => event.visibility === 'user' && event.label)
        .map((event) => ({
          id: event.id, sequence: event.sequence, type: event.type, status: event.status,
          label: event.label ?? 'Chat progress',
          ...(event.detail ? { detail: event.detail } : {}),
        }))
    : fallbackEvents;

  return {
    id: run.id,
    threadId: run.threadId,
    ...(run.userMessageId ? { userMessageId: run.userMessageId } : {}),
    ...(run.assistantMessageId ? { assistantMessageId: run.assistantMessageId } : {}),
    status: run.status,
    canRetry,
    events,
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
    snapshot.receipts.some((item) => !claimedReceiptIds.has(item.id));
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
  presentation?: {
    voice?: AgentWorkbenchSnapshot['composer']['voice'];
    attachments?: UnifiedChatTextAttachment[];
  },
): AgentWorkbenchSnapshot {
  const hasActiveRun = aggregate.runs.some(
    (run) => run.status === 'queued' || run.status === 'active',
  );
  const compactCreateProposals = new Set(
    (aggregate.proposals ?? [])
      .filter((proposal) =>
        proposal.operation.type === 'create_activity' &&
        (proposal.status === 'applied' || proposal.status === 'undone'),
      )
      .map((proposal) => proposal.id),
  );
  const compactCreateMessageIds = new Set(
    (aggregate.proposals ?? [])
      .filter((proposal) => compactCreateProposals.has(proposal.id) && proposal.messageId)
      .map((proposal) => proposal.messageId as string),
  );
  const snapshot: AgentWorkbenchSnapshot = {
    product: {
      id: 'kwilt',
      assistantName: 'Kwilt',
      placeholder: 'Ask, search or chat…',
      features: {
        attachments: true,
        mentions: false,
        modelControl: false,
        runDepthControl: false,
        runModeControl: false,
        voice: true,
        webSearchControl: false,
      },
    },
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
    evidence: (aggregate.evidence ?? []).map((evidence) => ({
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
        status: 'ready' as const,
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
      const { expectedUpdatedAt: _expectedUpdatedAt, ...fields } = proposal.operation.payload;
      return {
        id: proposal.id,
        runId: proposal.runId,
        ...(proposal.messageId ? { messageId: proposal.messageId } : {}),
        capabilityId: proposal.capabilityId,
        title: proposal.title,
        body: proposal.body,
        status: proposal.status,
        version: proposal.version,
        operation: {
          id: proposal.operation.id,
          type: proposal.operation.type,
          ...(proposal.operation.targetId ? { targetId: proposal.operation.targetId } : {}),
          summary: proposal.operation.summary,
          fields,
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
      const title = typeof receipt.resultState.title === 'string' ? receipt.resultState.title : null;
      const showInventory = Boolean(creating && receipt.status === 'applied' && title);
      const inventoryMeta = showInventory
        ? buildActivityListMeta({ activity: receipt.resultState as unknown as Activity })
        : {};
      return {
        id: receipt.id,
        proposalId: receipt.proposalId,
        status: receipt.status,
        summary: title
          ? `${receipt.status === 'undone' ? 'Removed' : receipt.status === 'failed' ? 'Could not update' : creating ? 'Added' : 'Updated'} ${title}`
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
    composer: {
      prompt,
      state: hasActiveRun ? 'working' : 'ready',
      attachments: (presentation?.attachments ?? []).map((attachment) => ({
        id: attachment.id,
        name: attachment.name,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        status: 'ready' as const,
      })),
      voice: presentation?.voice ?? { state: 'idle', elapsedSeconds: 0 },
    },
  };
  const timeline = buildWorkbenchTimeline(aggregate, snapshot);
  if (timeline) snapshot.timeline = timeline;
  return snapshot;
}
