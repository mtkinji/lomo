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
  kind: 'text' | 'image' | 'pdf';
  status: 'inspecting' | 'ready' | 'partial' | 'failed';
  failureReason?: string;
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
  | { kind: 'artifact'; id: string }
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
  capabilityId: 'todos' | 'plan' | 'goals' | 'arcs' | 'profile' | 'chapters' | 'relationships' | 'household' | 'screenTime' | 'money' | 'recipes';
  title: string;
  body: string;
  status: 'pending' | 'edited' | 'rejected' | 'deferred' | 'approved' | 'applying' | 'applied' | 'failed' | 'undone';
  version: number;
  outcome?: {
    sequence: number;
    dependsOnProposalId?: string;
  };
  operation: {
    id: string;
    type: 'create_activity' | 'update_activity' | 'delete_activity' | 'create_activity_step' |
      'update_activity_step' | 'complete_activity_step' | 'delete_activity_step' |
      'reorder_activity_steps' | 'schedule_activity' | 'schedule_activity_chunk' | 'reschedule_activity' |
      'remove_activity_from_plan' | 'create_goal' | 'update_goal' | 'delete_goal' |
      'create_arc' | 'update_arc' | 'delete_arc' | 'update_profile' | 'update_chapter_note' |
      'create_money_category' | 'rename_money_category' |
      'update_money_budget' | 'update_money_transaction_meaning' |
      'update_money_transaction_plan_treatment' | 'review_money_transfer' |
      'disconnect_money_connection' |
      'create_recipe' | 'update_recipe' | 'delete_recipe' |
      'remember_relationship' | 'correct_relationship' | 'forget_relationship' |
      'household.member.add_dependent' | 'household.invitation.create' | 'household.invitation.accept' |
      'household.child_capability.update' | 'household.caregiver_grant.update' |
      'household.member.update' | 'household.member.remove' | 'household.device.update' |
      'household.device.revoke' | 'household.device.reconcile' |
      'block_family_screen_time_selection' | 'allow_family_screen_time_selection' |
      'create_family_screen_time_prerequisite_agreement' |
      'update_family_screen_time_agreement' | 'deactivate_family_screen_time_agreement' |
      'cancel_family_screen_time_override' | 'decide_family_screen_time_request' |
      'update_personal_screen_time_rule' | 'deactivate_personal_screen_time_rule' |
      'delete_personal_screen_time_rule';
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

export type AgentWorkbenchArtifact = {
  id: string;
  runId: string;
  messageId: string;
  title: string;
  kind: 'document' | 'checklist' | 'table' | 'code';
  content: string;
  version: number;
  label: 'Draft';
  editable: true;
};

export type AgentWorkbenchOffer = {
  id: string;
  title: string;
  cue: string;
  prompt: string;
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
  artifacts: AgentWorkbenchArtifact[];
  offers?: AgentWorkbenchOffer[];
  /** Optional so protocol-v2 hosts can adopt coherent turns without breaking older surfaces. */
  timeline?: AgentWorkbenchTurn[];
  composer: {
    prompt: string;
    state: 'ready' | 'working' | 'complete';
    attachments: AgentWorkbenchAttachment[];
    voice: {
      state: 'idle' | 'recording' | 'transcribing' | 'connecting' | 'listening' | 'thinking' |
        'speaking' | 'interrupted' | 'recovering' | 'unsupported' | 'error';
      elapsedSeconds: number;
      levels?: number[];
      provisionalTranscript?: string;
      finalizedUtterance?: { id: string; text: string };
      message?: string;
    };
  };
};

export type SupportedAgentWorkbenchCommand =
  | { type: 'composer.change'; prompt: string }
  | { type: 'composer.focus.change'; focused: boolean }
  | { type: 'timeline.jump.latest' }
  | { type: 'context.add' }
  | { type: 'attachment.pick' }
  | { type: 'attachment.remove'; attachmentId: string }
  | { type: 'voice.toggle'; prompt?: undefined; selectionStart?: undefined; selectionEnd?: undefined }
  | { type: 'voice.toggle'; prompt: string; selectionStart: number; selectionEnd: number }
  | { type: 'conversation.start' }
  | { type: 'conversation.stop' }
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
  | { type: 'receipt.undo_many'; receiptIds: string[] }
  | { type: 'receipt.open'; receiptId: string }
  | {
      type: 'artifact.update';
      artifactId: string;
      expectedVersion: number;
      title: string;
      content: string;
    }
  | { type: 'source.open'; url: string }
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
      if (value.prompt === undefined && value.selectionStart === undefined && value.selectionEnd === undefined) {
        return { type: 'voice.toggle' };
      }
      return typeof value.prompt === 'string' &&
        typeof value.selectionStart === 'number' && Number.isInteger(value.selectionStart) &&
        typeof value.selectionEnd === 'number' && Number.isInteger(value.selectionEnd) &&
        value.selectionStart >= 0 && value.selectionEnd >= value.selectionStart && value.selectionEnd <= value.prompt.length
        ? {
            type: 'voice.toggle', prompt: value.prompt,
            selectionStart: value.selectionStart, selectionEnd: value.selectionEnd,
          }
        : null;
    case 'conversation.start':
    case 'conversation.stop':
      return { type: value.type };
    case 'context.add':
      return { type: 'context.add' };
    case 'timeline.jump.latest':
      return { type: 'timeline.jump.latest' };
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
    case 'receipt.undo_many':
      return Array.isArray(value.receiptIds) && value.receiptIds.length > 0 && value.receiptIds.length <= 12 &&
        value.receiptIds.every((receiptId) => typeof receiptId === 'string' && receiptId.trim().length > 0) &&
        new Set(value.receiptIds).size === value.receiptIds.length
        ? { type: 'receipt.undo_many', receiptIds: value.receiptIds.map(String) }
        : null;
    case 'receipt.undo':
    case 'receipt.open':
      return hasText(value, 'receiptId')
        ? { type: value.type, receiptId: String(value.receiptId) }
        : null;
    case 'artifact.update':
      return hasText(value, 'artifactId') && hasText(value, 'title') &&
        typeof value.content === 'string' && value.content.trim().length > 0 && value.content.length <= 20_000 &&
        typeof value.expectedVersion === 'number' && Number.isInteger(value.expectedVersion) && value.expectedVersion > 0
        ? {
            type: 'artifact.update', artifactId: String(value.artifactId),
            expectedVersion: value.expectedVersion, title: String(value.title), content: value.content,
          }
        : null;
    case 'source.open':
      if (!hasText(value, 'url')) return null;
      try {
        const url = new URL(String(value.url));
        return url.protocol === 'https:' ? { type: 'source.open', url: url.toString() } : null;
      } catch {
        return null;
      }
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
