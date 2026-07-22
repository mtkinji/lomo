import type {
  UnifiedChatCapabilityId,
  UnifiedChatRequestClass,
} from './requestPolicy';
import type { ActivityMutationPatch } from './activityProposal';
import type { UnifiedChatTextAttachment } from './unifiedChatAttachmentPolicy';

export type UnifiedChatThreadStatus = 'active' | 'archived';

export type UnifiedChatThread = {
  id: string;
  title: string;
  status: UnifiedChatThreadStatus;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UnifiedChatMessageRole = 'user' | 'assistant';
export type UnifiedChatMessageFeedback = 'positive' | 'negative' | null;

export type UnifiedChatMessage = {
  id: string;
  threadId: string;
  role: UnifiedChatMessageRole;
  body: string;
  feedback: UnifiedChatMessageFeedback;
  createdAt: string;
  updatedAt: string;
  attachments: UnifiedChatMessageAttachment[];
};

export type UnifiedChatMessageAttachment = UnifiedChatTextAttachment & {
  messageId: string;
  createdAt: string;
};

export type UnifiedChatRunStatus =
  | 'queued'
  | 'active'
  | 'complete'
  | 'partial'
  | 'stopped'
  | 'steered'
  | 'failed';

export type UnifiedChatRun = {
  id: string;
  threadId: string;
  userMessageId: string | null;
  assistantMessageId: string | null;
  status: UnifiedChatRunStatus;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  requestClass: UnifiedChatRequestClass | null;
  participatingCapabilities: UnifiedChatCapabilityId[];
  contextPolicy: {
    usePrivateContext: boolean;
    reason: string;
    clarification: string | null;
  };
  version: number;
  stopRequestedAt: string | null;
  steerCount: number;
};

export type UnifiedChatThreadAggregate = {
  thread: UnifiedChatThread;
  messages: UnifiedChatMessage[];
  runs: UnifiedChatRun[];
  events?: UnifiedChatRunEvent[];
  evidence?: UnifiedChatEvidenceRef[];
  proposals?: UnifiedChatProposal[];
  receipts?: UnifiedChatMutationReceipt[];
  contextRefs?: UnifiedChatContextRef[];
};

export type UnifiedChatContextRef = {
  id: string;
  threadId: string;
  capabilityId: UnifiedChatCapabilityId;
  objectType: string;
  objectId: string;
  label: string;
  secondaryLabel: string | null;
  source: 'launch' | 'user_added' | 'retrieved_promoted';
  active: boolean;
  returnTarget: Record<string, unknown> | null;
  version: number;
};

export type AttachUnifiedChatContextInput = {
  threadId: string;
  capabilityId: UnifiedChatCapabilityId;
  objectType: string;
  objectId: string;
  label: string;
  secondaryLabel?: string | null;
  source: UnifiedChatContextRef['source'];
  returnTarget: Record<string, unknown>;
};

export type UnifiedChatRunEvent = {
  id: string;
  threadId: string;
  runId: string;
  sequence: number;
  type: string;
  status: 'pending' | 'active' | 'complete' | 'warning' | 'failed';
  visibility: 'internal' | 'user';
  label: string | null;
  detail: string | null;
};

export type UnifiedChatEvidenceRef = {
  id: string;
  threadId: string;
  runId: string;
  sequence: number;
  capabilityId: UnifiedChatCapabilityId;
  objectType: string;
  objectId: string;
  label: string;
  selectionStatus: 'included' | 'omitted';
  authority: 'authoritative' | 'derived' | 'user_supplied';
  freshness: 'current' | 'recent' | 'stale' | 'unknown';
  selectionReason: string;
  sufficient: boolean;
  coverageNote: string;
};

export type UnifiedChatMutationReceipt = {
  id: string;
  proposalId: string;
  operationId: string;
  capabilityId: 'todos';
  idempotencyKey: string;
  status: 'reserved' | 'applied' | 'failed' | 'undone';
  resultingObjectType: string | null;
  resultingObjectId: string | null;
  resultState: Record<string, unknown>;
  returnTarget: Record<string, unknown> | null;
  undoOperation: Record<string, unknown> | null;
  canUndo: boolean;
  appliedAt: string | null;
  undoneAt: string | null;
};

export type TransitionUnifiedChatProposalInput = {
  proposalId: string;
  fromStatus: UnifiedChatProposal['status'];
  toStatus: UnifiedChatProposal['status'];
  expectedVersion: number;
};

export type TransitionUnifiedChatRunInput = {
  runId: string;
  fromStatus: UnifiedChatRunStatus;
  toStatus: UnifiedChatRunStatus;
  expectedVersion: number;
  assistantMessageId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  completedAt?: string | null;
  stopRequestedAt?: string | null;
  steerCount?: number;
  event: {
    type: string;
    status: 'pending' | 'active' | 'complete' | 'warning' | 'failed';
    visibility: 'internal' | 'user';
    label?: string | null;
    detail?: string | null;
    payload?: Record<string, unknown>;
  };
};

export type PersistUnifiedChatMutationReceiptInput = {
  threadId: string;
  proposalId: string;
  operationId: string;
  idempotencyKey: string;
  status: 'reserved' | 'applied' | 'failed';
  resultingObjectType: string | null;
  resultingObjectId: string | null;
  resultState: Record<string, unknown>;
  returnTarget: Record<string, unknown> | null;
  undoOperation: Record<string, unknown> | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  appliedAt?: string | null;
};

export type FinalizeUnifiedChatMutationReceiptInput = Omit<
  PersistUnifiedChatMutationReceiptInput,
  'threadId' | 'proposalId' | 'operationId' | 'idempotencyKey' | 'status'
>;

export type CreateUnifiedChatMessageInput = {
  threadId: string;
  role: UnifiedChatMessageRole;
  body: string;
  clientRequestId?: string;
  attachments?: UnifiedChatTextAttachment[];
};

export type CreateUnifiedChatRunInput = {
  threadId: string;
  userMessageId: string;
  requestClass: UnifiedChatRequestClass;
  participatingCapabilities: UnifiedChatCapabilityId[];
  contextPolicy: {
    usePrivateContext: boolean;
    reason: string;
    clarification: string | null;
  };
};

export type AppendUnifiedChatRunEventsInput = {
  threadId: string;
  runId: string;
  events: Array<{
    sequence: number;
    type: string;
    status: 'pending' | 'active' | 'complete' | 'warning' | 'failed';
    visibility: 'internal' | 'user';
    label?: string | null;
    detail?: string | null;
    payload?: Record<string, unknown>;
  }>;
};

export type PersistUnifiedChatRunEvidenceInput = {
  threadId: string;
  runId: string;
  evidence: Array<{
    sequence: number;
    capabilityId: UnifiedChatCapabilityId;
    objectType: string;
    objectId: string;
    label: string;
    selectionStatus: 'included' | 'omitted';
    authority: 'authoritative' | 'derived' | 'user_supplied';
    freshness: 'current' | 'recent' | 'stale' | 'unknown';
    observedAt: string | null;
    provenance: Record<string, unknown>;
    selectionReason: string;
    sufficient: boolean;
    omittedCount: number;
    coverageNote: string;
  }>;
};

type UnifiedChatProposalOperationBase = {
  id: string;
  proposalId: string;
  capabilityId: 'todos';
  summary: string;
  idempotencyKey: string;
  sequence: number;
};

export type UnifiedChatProposalOperation = UnifiedChatProposalOperationBase & (
  | {
      type: 'create_activity';
      targetId: null;
      payload: ActivityMutationPatch & { title: string; expectedUpdatedAt?: null };
    }
  | {
      type: 'update_activity';
      targetId: string;
      payload: ActivityMutationPatch & { expectedUpdatedAt: string };
    }
);

export type UnifiedChatProposal = {
  id: string;
  threadId: string;
  runId: string;
  messageId: string | null;
  capabilityId: 'todos';
  title: string;
  body: string;
  status: 'pending' | 'edited' | 'rejected' | 'deferred' | 'approved' | 'applying' | 'applied' | 'failed' | 'undone';
  version: number;
  createdAt: string;
  updatedAt: string;
  operation: UnifiedChatProposalOperation;
};

export type CreateUnifiedChatProposalInput = {
  threadId: string;
  runId: string;
  messageId: string;
  capabilityId: 'todos';
  title: string;
  body: string;
  permissionPolicy: { requiresExplicitApproval: true };
  operation: {
    type: 'create_activity' | 'update_activity';
    targetId: string | null;
    expectedUpdatedAt: string | null;
    payload: ActivityMutationPatch;
    summary: string;
    idempotencyKey: string;
  };
};

export type DecideUnifiedChatProposalInput = {
  proposalId: string;
  action: 'edit' | 'reject' | 'defer' | 'approve';
  expectedVersion: number;
  patch?: ActivityMutationPatch;
  note?: string;
};

export type UnifiedChatProposalDecisionResult = {
  id: string;
  status: UnifiedChatProposal['status'];
  version: number;
};
