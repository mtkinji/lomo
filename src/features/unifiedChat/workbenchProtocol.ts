export const AGENT_WORKBENCH_PROTOCOL_VERSION = 2 as const;

export type AgentWorkbenchObjectRef = {
  id: string;
  type: string;
  label: string;
  secondaryLabel?: string;
  thumbnailUrl?: string;
};

export type AgentWorkbenchAttachment = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  status: 'ready';
};

export type AgentWorkbenchMessage = {
  id: string;
  threadId: string;
  role: 'user' | 'assistant';
  body: string;
  createdAt: string;
  feedback?: 'positive' | 'negative' | null;
  attachments: AgentWorkbenchAttachment[];
};

export type AgentWorkbenchRun = {
  id: string;
  threadId: string;
  userMessageId?: string;
  assistantMessageId?: string;
  status: 'queued' | 'active' | 'complete' | 'partial' | 'stopped' | 'steered' | 'failed';
  canRetry: boolean;
  events: Array<{
    id: string;
    sequence: number;
    type: string;
    status: 'pending' | 'active' | 'complete' | 'warning' | 'failed';
    label: string;
    detail?: string;
  }>;
};

export type AgentWorkbenchTimelineItem =
  | { kind: 'message'; id: string }
  | { kind: 'run'; id: string }
  | { kind: 'evidence'; ids: string[] }
  | { kind: 'proposal'; id: string }
  | { kind: 'receipt'; id: string }
  | { kind: 'client_action'; id: string }
  | {
      kind: 'correction';
      id: string;
      targetKind: 'proposal' | 'receipt';
      targetItemId: string;
      summary: string;
    };

export type AgentWorkbenchTurn = {
  id: string;
  sequence: number;
  items: AgentWorkbenchTimelineItem[];
};

export type AgentWorkbenchEvidenceRef = {
  id: string;
  runId: string;
  capabilityId: string;
  object: AgentWorkbenchObjectRef;
  selectionStatus: 'included' | 'omitted';
  authority: 'authoritative' | 'derived' | 'user_supplied';
  freshness: 'current' | 'recent' | 'stale' | 'unknown';
  selectionReason: string;
  sufficient: boolean;
  coverageNote: string;
};

export type AgentWorkbenchContextRef = {
  id: string;
  capabilityId: string;
  object: AgentWorkbenchObjectRef;
  source: 'launch' | 'user_added' | 'retrieved_promoted';
  removable: boolean;
  version: number;
};

export type AgentWorkbenchProposal = {
  id: string;
  runId: string;
  messageId?: string;
  capabilityId: 'todos' | 'plan' | 'goals' | 'arcs' | 'profile' | 'chapters' | 'relationships';
  title: string;
  body: string;
  status: 'pending' | 'edited' | 'rejected' | 'deferred' | 'approved' | 'applying' | 'applied' | 'failed' | 'undone';
  version: number;
  operation: {
    id: string;
    type: 'create_activity' | 'update_activity' | 'delete_activity' | 'create_activity_step' |
      'update_activity_step' | 'complete_activity_step' | 'delete_activity_step' |
      'reorder_activity_steps' | 'schedule_activity' | 'schedule_activity_chunk' | 'reschedule_activity' |
      'remove_activity_from_plan' | 'create_goal' | 'update_goal' | 'delete_goal' |
      'create_arc' | 'update_arc' | 'delete_arc' | 'update_profile' | 'update_chapter_note' |
      'remember_relationship' | 'correct_relationship' | 'forget_relationship';
    targetId?: string;
    summary: string;
    fields: Record<string, unknown>;
  };
};

export type AgentWorkbenchReceipt = {
  id: string;
  proposalId: string;
  status: 'applied' | 'failed' | 'undone';
  summary: string;
  object?: AgentWorkbenchObjectRef;
  returnTarget?: Record<string, unknown>;
  canUndo: boolean;
  inventoryItem?: {
    title: string;
    meta?: string;
    estimateMeta?: string;
    metaTone?: 'urgent' | 'today' | 'tomorrow' | 'future';
    isCompleted: boolean;
  };
};

export type AgentWorkbenchClientAction = {
  id: string;
  runId: string;
  capabilityId: string;
  actionType: string;
  title: string;
  consequenceSummary: string;
  status: 'pending_client_action' | 'presenting' | 'completed' | 'declined' | 'failed';
  version: number;
  canContinue: boolean;
};

export type AgentWorkbenchSnapshot = {
  product: {
    id: string;
    assistantName: string;
    placeholder: string;
    features: {
      attachments: boolean;
      mentions: boolean;
      modelControl: boolean;
      runDepthControl: boolean;
      runModeControl: boolean;
      voice: boolean;
      webSearchControl: boolean;
    };
  };
  thread?: { id: string; title: string; status: 'active' | 'archived' };
  context: AgentWorkbenchContextRef[];
  evidence: AgentWorkbenchEvidenceRef[];
  messages: AgentWorkbenchMessage[];
  runs: AgentWorkbenchRun[];
  proposals: AgentWorkbenchProposal[];
  receipts: AgentWorkbenchReceipt[];
  clientActions: AgentWorkbenchClientAction[];
  /** Optional so protocol-v2 hosts can adopt coherent turns without breaking older surfaces. */
  timeline?: AgentWorkbenchTurn[];
  composer: {
    prompt: string;
    state: 'ready' | 'working' | 'complete';
    attachments: AgentWorkbenchAttachment[];
    voice: {
      state: 'idle' | 'recording' | 'transcribing' | 'unsupported' | 'error';
      elapsedSeconds: number;
      message?: string;
    };
  };
};

export type SupportedAgentWorkbenchCommand =
  | { type: 'composer.change'; prompt: string }
  | { type: 'composer.focus.change'; focused: boolean }
  | { type: 'context.add' }
  | { type: 'attachment.pick' }
  | { type: 'attachment.remove'; attachmentId: string }
  | { type: 'voice.toggle' }
  | { type: 'run.send'; prompt: string }
  | { type: 'run.stop'; runId: string }
  | { type: 'run.steer'; runId: string; prompt: string }
  | { type: 'run.retry'; runId: string }
  | { type: 'context.remove'; contextId: string; expectedVersion: number }
  | {
      type: 'message.feedback';
      messageId: string;
      feedback: 'positive' | 'negative';
      reason?: string;
    }
  | { type: 'object.open'; object: AgentWorkbenchObjectRef }
  | {
      type: 'proposal.decide';
      proposalId: string;
      action: 'edit' | 'reject' | 'defer' | 'approve';
      expectedVersion: number;
      patch?: Record<string, unknown>;
    }
  | {
      type: 'proposal.decide_many';
      items: Array<{
        proposalId: string;
        action: 'approve';
        expectedVersion: number;
      }>;
    }
  | { type: 'receipt.undo'; receiptId: string }
  | { type: 'receipt.open'; receiptId: string }
  | {
      type: 'client_action.decide';
      actionId: string;
      action: 'continue' | 'decline';
      expectedVersion: number;
    }
  | { type: 'thread.create' };

export type AgentWorkbenchSurfaceMessage =
  | {
      protocolVersion: typeof AGENT_WORKBENCH_PROTOCOL_VERSION;
      type: 'surface.ready';
      requestId: string;
    }
  | {
      protocolVersion: typeof AGENT_WORKBENCH_PROTOCOL_VERSION;
      type: 'surface.command';
      requestId: string;
      command: SupportedAgentWorkbenchCommand;
    };

export type AgentWorkbenchHostMessage =
  | {
      protocolVersion: typeof AGENT_WORKBENCH_PROTOCOL_VERSION;
      type: 'host.initialize' | 'host.snapshot';
      requestId: string;
      snapshot: AgentWorkbenchSnapshot;
    }
  | {
      protocolVersion: typeof AGENT_WORKBENCH_PROTOCOL_VERSION;
      type: 'host.error';
      requestId: string;
      message: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasText(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === 'string' && String(value[key]).trim().length > 0;
}

function isObjectRef(value: unknown): value is AgentWorkbenchObjectRef {
  return isRecord(value) && hasText(value, 'id') && hasText(value, 'type') && hasText(value, 'label');
}

function parseCommand(value: unknown): SupportedAgentWorkbenchCommand | null {
  if (!isRecord(value) || !hasText(value, 'type')) return null;
  switch (value.type) {
    case 'composer.change':
    case 'run.send':
      return typeof value.prompt === 'string'
        ? ({ type: value.type, prompt: value.prompt } as SupportedAgentWorkbenchCommand)
        : null;
    case 'composer.focus.change':
      return typeof value.focused === 'boolean'
        ? { type: 'composer.focus.change', focused: value.focused }
        : null;
    case 'voice.toggle':
      return { type: 'voice.toggle' };
    case 'context.add':
      return { type: 'context.add' };
    case 'attachment.pick':
      return { type: 'attachment.pick' };
    case 'attachment.remove':
      return hasText(value, 'attachmentId')
        ? { type: 'attachment.remove', attachmentId: String(value.attachmentId) }
        : null;
    case 'run.stop':
    case 'run.retry':
      return hasText(value, 'runId')
        ? { type: value.type, runId: String(value.runId) }
        : null;
    case 'run.steer':
      return hasText(value, 'runId') && hasText(value, 'prompt')
        ? { type: 'run.steer', runId: String(value.runId), prompt: String(value.prompt) }
        : null;
    case 'context.remove':
      return hasText(value, 'contextId') &&
        typeof value.expectedVersion === 'number' &&
        Number.isInteger(value.expectedVersion) && value.expectedVersion > 0
        ? {
            type: 'context.remove',
            contextId: String(value.contextId),
            expectedVersion: value.expectedVersion,
          }
        : null;
    case 'message.feedback':
      return hasText(value, 'messageId') &&
        (value.feedback === 'positive' || value.feedback === 'negative')
        ? {
            type: 'message.feedback',
            messageId: String(value.messageId),
            feedback: value.feedback,
            ...(typeof value.reason === 'string' ? { reason: value.reason } : {}),
          }
        : null;
    case 'object.open':
      return isObjectRef(value.object) ? { type: 'object.open', object: value.object } : null;
    case 'proposal.decide':
      return hasText(value, 'proposalId') &&
        (value.action === 'edit' || value.action === 'reject' || value.action === 'defer' || value.action === 'approve') &&
        typeof value.expectedVersion === 'number' &&
        Number.isInteger(value.expectedVersion) && value.expectedVersion > 0 &&
        (value.patch === undefined || isRecord(value.patch))
        ? {
            type: 'proposal.decide',
            proposalId: String(value.proposalId),
            action: value.action,
            expectedVersion: value.expectedVersion,
            ...(isRecord(value.patch) ? { patch: value.patch } : {}),
          }
        : null;
    case 'proposal.decide_many': {
      if (!Array.isArray(value.items) || value.items.length === 0 || value.items.length > 12) {
        return null;
      }
      const items: Array<{ proposalId: string; action: 'approve'; expectedVersion: number }> = [];
      const proposalIds = new Set<string>();
      for (const item of value.items) {
        if (
          !isRecord(item) ||
          !hasText(item, 'proposalId') ||
          item.action !== 'approve' ||
          typeof item.expectedVersion !== 'number' ||
          !Number.isInteger(item.expectedVersion) ||
          item.expectedVersion <= 0 ||
          item.patch !== undefined
        ) {
          return null;
        }
        const proposalId = String(item.proposalId);
        if (proposalIds.has(proposalId)) return null;
        proposalIds.add(proposalId);
        items.push({ proposalId, action: 'approve', expectedVersion: item.expectedVersion });
      }
      return { type: 'proposal.decide_many', items };
    }
    case 'receipt.undo':
    case 'receipt.open':
      return hasText(value, 'receiptId')
        ? { type: value.type, receiptId: String(value.receiptId) }
        : null;
    case 'client_action.decide':
      return hasText(value, 'actionId') &&
        (value.action === 'continue' || value.action === 'decline') &&
        typeof value.expectedVersion === 'number' && Number.isInteger(value.expectedVersion) && value.expectedVersion > 0
        ? {
            type: 'client_action.decide', actionId: String(value.actionId),
            action: value.action, expectedVersion: value.expectedVersion,
          }
        : null;
    case 'thread.create':
      return { type: 'thread.create' };
    default:
      return null;
  }
}

export function parseAgentWorkbenchSurfaceMessage(
  raw: string,
): AgentWorkbenchSurfaceMessage | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !isRecord(value) ||
      value.protocolVersion !== AGENT_WORKBENCH_PROTOCOL_VERSION ||
      !hasText(value, 'requestId')
    ) {
      return null;
    }
    if (value.type === 'surface.ready') {
      return {
        protocolVersion: AGENT_WORKBENCH_PROTOCOL_VERSION,
        type: 'surface.ready',
        requestId: String(value.requestId),
      };
    }
    if (value.type !== 'surface.command') return null;
    const command = parseCommand(value.command);
    if (!command) return null;
    return {
      protocolVersion: AGENT_WORKBENCH_PROTOCOL_VERSION,
      type: 'surface.command',
      requestId: String(value.requestId),
      command,
    };
  } catch {
    return null;
  }
}

export function makeAgentWorkbenchHostMessage(
  type: 'host.initialize' | 'host.snapshot',
  snapshot: AgentWorkbenchSnapshot,
): AgentWorkbenchHostMessage {
  return {
    protocolVersion: AGENT_WORKBENCH_PROTOCOL_VERSION,
    type,
    requestId: `kwilt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    snapshot,
  };
}
