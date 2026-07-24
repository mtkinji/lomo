import type {
  UnifiedChatCapabilityId,
  UnifiedChatRequestClass,
} from './requestPolicy';
import type { ActivityMutationPatch, ActivityProposalOperation } from './activityProposal';
import type { GoalProposalOperation } from './goalProposal';
import type { ArcProposalOperation } from './arcProposal';
import type { ProfileProposalOperation } from './profileProposal';
import type { ChapterProposalOperation } from './chapterProposal';
import type { UnifiedChatTextAttachment } from './unifiedChatAttachmentPolicy';

export type UnifiedChatThreadStatus = 'active' | 'archived';
export type UnifiedChatThreadTitleSource = 'default' | 'generated' | 'user';

export type UnifiedChatThread = {
  id: string;
  title: string;
  titleSource: UnifiedChatThreadTitleSource;
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
  clientActions?: UnifiedChatClientAction[];
  contextRefs?: UnifiedChatContextRef[];
};

export type UnifiedChatClientActionStatus =
  | 'pending_client_action' | 'presenting' | 'completed' | 'declined' | 'failed';

export type UnifiedChatClientAction = {
  id: string;
  threadId: string;
  runId: string;
  messageId: string | null;
  capabilityId: UnifiedChatCapabilityId;
  actionType: string;
  targetType: string | null;
  targetId: string | null;
  title: string;
  consequenceSummary: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  status: UnifiedChatClientActionStatus;
  result: Record<string, unknown> | null;
  errorCode: string | null;
  errorMessage: string | null;
  version: number;
  presentedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateUnifiedChatClientActionInput = {
  threadId: string;
  runId: string;
  messageId: string;
  capabilityId: UnifiedChatCapabilityId;
  actionType: string;
  targetType?: string | null;
  targetId?: string | null;
  title: string;
  consequenceSummary: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
};

export type TransitionUnifiedChatClientActionInput = {
  actionId: string;
  fromStatus: UnifiedChatClientActionStatus;
  toStatus: UnifiedChatClientActionStatus;
  expectedVersion: number;
  result?: Record<string, unknown> | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  presentedAt?: string | null;
  completedAt?: string | null;
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
  payload?: Record<string, unknown>;
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
  capabilityId: 'todos' | 'plan' | 'goals' | 'arcs' | 'profile' | 'chapters' | 'relationships';
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
  capabilityId?: 'todos' | 'plan' | 'goals' | 'arcs' | 'profile' | 'chapters';
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
  summary: string;
  idempotencyKey: string;
  sequence: number;
};

export type PlanScheduleActivityPayload = {
  activityId: string;
  expectedUpdatedAt: string;
  startDate: string;
  endDate: string;
  targetDateKey: string;
  writeCalendarRef: {
    provider: 'google' | 'microsoft';
    accountId: string;
    calendarId: string;
  };
};

export type PlanScheduleChunkPayload = PlanScheduleActivityPayload & {
  groupId: string;
  chunkId: string;
  title: string;
};

export type PlanRescheduleActivityPayload = {
  activityId: string;
  expectedUpdatedAt: string;
  startDate: string;
  endDate: string;
  targetDateKey: string;
  previousStartDate: string;
  previousEndDate: string;
  previousTargetDateKey: string;
};

export type PlanRemoveActivityPayload = {
  activityId: string;
  expectedUpdatedAt: string;
  previousStartDate: string;
  previousEndDate: string;
  previousTargetDateKey: string;
  previousBinding: Extract<import('../../domain/types').ActivityCalendarBinding, { kind: 'provider' }>;
};

export type UnifiedChatProposalOperation = UnifiedChatProposalOperationBase & (
  | {
      capabilityId: 'relationships';
      type: 'remember_relationship' | 'correct_relationship' | 'forget_relationship';
      targetId: string;
      payload: Record<string, unknown>;
    }
  | {
      capabilityId: 'chapters'; type: 'update_chapter_note'; targetId: string;
      payload: ChapterProposalOperation['payload'] & { expectedUpdatedAt: string };
    }
  | {
      capabilityId: 'profile'; type: 'update_profile'; targetId: string;
      payload: ProfileProposalOperation['payload'] & { expectedUpdatedAt: string };
    }
  | {
      capabilityId: 'arcs'; type: 'create_arc'; targetId: null;
      payload: Extract<ArcProposalOperation, { type: 'create_arc' }>['payload'] & { expectedUpdatedAt?: null };
    }
  | {
      capabilityId: 'arcs'; type: 'update_arc'; targetId: string;
      payload: Extract<ArcProposalOperation, { type: 'update_arc' }>['payload'] & { expectedUpdatedAt: string };
    }
  | {
      capabilityId: 'arcs'; type: 'delete_arc'; targetId: string;
      payload: { expectedUpdatedAt: string };
    }
  | {
      capabilityId: 'todos';
      type: 'create_activity';
      targetId: null;
      payload: ActivityMutationPatch & { title: string; expectedUpdatedAt?: null };
    }
  | {
      capabilityId: 'todos';
      type: 'update_activity';
      targetId: string;
      payload: ActivityMutationPatch & { expectedUpdatedAt: string };
    }
  | {
      capabilityId: 'todos';
      type: 'delete_activity';
      targetId: string;
      payload: { expectedUpdatedAt: string };
    }
  | {
      capabilityId: 'todos';
      type: 'create_activity_step';
      targetId: string;
      payload: Extract<ActivityProposalOperation, { type: 'create_activity_step' }>['payload'] & { expectedUpdatedAt: string };
    }
  | {
      capabilityId: 'todos';
      type: 'update_activity_step';
      targetId: string;
      payload: Extract<ActivityProposalOperation, { type: 'update_activity_step' }>['payload'] & { expectedUpdatedAt: string };
    }
  | {
      capabilityId: 'todos';
      type: 'complete_activity_step';
      targetId: string;
      payload: Extract<ActivityProposalOperation, { type: 'complete_activity_step' }>['payload'] & { expectedUpdatedAt: string };
    }
  | {
      capabilityId: 'todos';
      type: 'delete_activity_step';
      targetId: string;
      payload: Extract<ActivityProposalOperation, { type: 'delete_activity_step' }>['payload'] & { expectedUpdatedAt: string };
    }
  | {
      capabilityId: 'todos';
      type: 'reorder_activity_steps';
      targetId: string;
      payload: Extract<ActivityProposalOperation, { type: 'reorder_activity_steps' }>['payload'] & { expectedUpdatedAt: string };
    }
  | {
      capabilityId: 'plan';
      type: 'schedule_activity';
      targetId: string;
      payload: PlanScheduleActivityPayload;
    }
  | {
      capabilityId: 'plan';
      type: 'schedule_activity_chunk';
      targetId: string;
      payload: PlanScheduleChunkPayload;
    }
  | {
      capabilityId: 'plan';
      type: 'reschedule_activity';
      targetId: string;
      payload: PlanRescheduleActivityPayload;
    }
  | {
      capabilityId: 'plan';
      type: 'remove_activity_from_plan';
      targetId: string;
      payload: PlanRemoveActivityPayload;
    }
  | {
      capabilityId: 'goals';
      type: 'update_goal';
      targetId: string;
      payload: Extract<GoalProposalOperation, { type: 'update_goal' }>['payload'] & { expectedUpdatedAt: string };
    }
  | {
      capabilityId: 'goals';
      type: 'create_goal';
      targetId: null;
      payload: Extract<GoalProposalOperation, { type: 'create_goal' }>['payload'] & { expectedUpdatedAt?: null };
    }
  | {
      capabilityId: 'goals';
      type: 'delete_goal';
      targetId: string;
      payload: { expectedUpdatedAt: string };
    }
);

type UnifiedChatProposalBase = {
  id: string;
  threadId: string;
  runId: string;
  messageId: string | null;
  title: string;
  body: string;
  status: 'pending' | 'edited' | 'rejected' | 'deferred' | 'approved' | 'applying' | 'applied' | 'failed' | 'undone';
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type UnifiedChatProposal = UnifiedChatProposalBase & (
  | {
      capabilityId: 'relationships';
      operation: Extract<UnifiedChatProposalOperation, { capabilityId: 'relationships' }>;
    }
  | {
      capabilityId: 'chapters';
      operation: Extract<UnifiedChatProposalOperation, { capabilityId: 'chapters' }>;
    }
  | {
      capabilityId: 'profile';
      operation: Extract<UnifiedChatProposalOperation, { capabilityId: 'profile' }>;
    }
  | {
      capabilityId: 'arcs';
      operation: Extract<UnifiedChatProposalOperation, { capabilityId: 'arcs' }>;
    }
  | {
      capabilityId: 'todos';
      operation: Extract<UnifiedChatProposalOperation, { capabilityId: 'todos' }>;
    }
  | {
      capabilityId: 'plan';
      operation: Extract<UnifiedChatProposalOperation, { capabilityId: 'plan' }>;
    }
  | {
      capabilityId: 'goals';
      operation: Extract<UnifiedChatProposalOperation, { capabilityId: 'goals' }>;
    }
);

type CreateUnifiedChatProposalInputBase = {
  threadId: string;
  runId: string;
  messageId: string;
  title: string;
  body: string;
  permissionPolicy: { requiresExplicitApproval: true };
};

type CreatePlanProposalOperationInput = (
  | { type: 'schedule_activity'; targetId: string; expectedUpdatedAt: string; payload: PlanScheduleActivityPayload }
  | { type: 'schedule_activity_chunk'; targetId: string; expectedUpdatedAt: string; payload: PlanScheduleChunkPayload }
  | { type: 'reschedule_activity'; targetId: string; expectedUpdatedAt: string; payload: PlanRescheduleActivityPayload }
  | { type: 'remove_activity_from_plan'; targetId: string; expectedUpdatedAt: string; payload: PlanRemoveActivityPayload }
) & { summary: string; idempotencyKey: string };

export type CreateUnifiedChatProposalInput = CreateUnifiedChatProposalInputBase & (
  | {
      capabilityId: 'chapters';
      operation: ChapterProposalOperation & { summary: string; idempotencyKey: string };
    }
  | {
      capabilityId: 'profile';
      operation: ProfileProposalOperation & { summary: string; idempotencyKey: string };
    }
  | {
      capabilityId: 'arcs';
      operation: ArcProposalOperation & { summary: string; idempotencyKey: string };
    }
  | {
      capabilityId: 'todos';
      operation: ActivityProposalOperation & {
        summary: string;
        idempotencyKey: string;
      };
    }
  | {
      capabilityId: 'plan';
      operation: CreatePlanProposalOperationInput;
    }
  | {
      capabilityId: 'goals';
      operation: GoalProposalOperation & { summary: string; idempotencyKey: string };
    }
);

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
