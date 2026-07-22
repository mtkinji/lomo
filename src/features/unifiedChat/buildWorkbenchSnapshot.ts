import type { UnifiedChatMutationReceipt, UnifiedChatRun, UnifiedChatRunEvent, UnifiedChatThreadAggregate } from './types';
import type { AgentWorkbenchRun, AgentWorkbenchSnapshot } from './workbenchProtocol';
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
    ...(run.assistantMessageId ? { assistantMessageId: run.assistantMessageId } : {}),
    status: run.status,
    canRetry,
    events,
  };
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
  return {
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
}
