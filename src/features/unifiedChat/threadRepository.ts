import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../services/backend/supabaseClient';
import type {
  CreateUnifiedChatMessageInput,
  CreateUnifiedChatRunInput,
  CreateUnifiedChatProposalInput,
  DecideUnifiedChatProposalInput,
  AppendUnifiedChatRunEventsInput,
  PersistUnifiedChatRunEvidenceInput,
  UnifiedChatMessage,
  UnifiedChatRun,
  UnifiedChatThread,
  UnifiedChatThreadAggregate,
  TransitionUnifiedChatRunInput,
  UnifiedChatProposal,
  UnifiedChatProposalOperation,
  UnifiedChatRunEvent,
  UnifiedChatEvidenceRef,
  UnifiedChatMutationReceipt,
  UnifiedChatProposalDecisionResult,
  TransitionUnifiedChatProposalInput,
  PersistUnifiedChatMutationReceiptInput,
  FinalizeUnifiedChatMutationReceiptInput,
  AttachUnifiedChatContextInput,
  UnifiedChatContextRef,
  UnifiedChatMessageAttachment,
} from './types';
import { validateUnifiedChatAttachmentSet } from './unifiedChatAttachmentPolicy';

const THREAD_COLUMNS = 'id,title,status,archived_at,created_at,updated_at';
const MESSAGE_COLUMNS =
  'id,thread_id,role,body,feedback,created_at,updated_at,attachments:kwilt_agent_message_attachments(id,message_id,name,mime_type,size_bytes,content_text,created_at)';
const RUN_COLUMNS =
  'id,thread_id,user_message_id,assistant_message_id,status,error_code,error_message,created_at,updated_at,completed_at,request_class,participating_capabilities,context_policy,version,stop_requested_at,steer_count';
const PROPOSAL_COLUMNS =
  'id,thread_id,run_id,message_id,capability_id,title,body,status,version,created_at,updated_at';
const PROPOSAL_OPERATION_COLUMNS =
  'id,proposal_id,capability_id,operation_type,target_id,summary,payload,idempotency_key,sequence';
const RUN_EVENT_COLUMNS =
  'id,thread_id,run_id,sequence,event_type,status,visibility,label,detail';
const EVIDENCE_COLUMNS =
  'id,thread_id,run_id,sequence,capability_id,object_type,object_id,label,selection_status,authority,freshness_class,selection_reason,sufficient,coverage_note';
const RECEIPT_COLUMNS =
  'id,proposal_id,operation_id,capability_id,idempotency_key,status,resulting_object_type,resulting_object_id,result_state,return_target,undo_operation,applied_at,undone_at';
const CONTEXT_COLUMNS =
  'id,thread_id,capability_id,object_type,object_id,label,secondary_label,source,active,return_target,version';

type DbError = { message?: string; code?: string } | null;
type DbRow = Record<string, unknown>;

export class UnifiedChatAuthError extends Error {
  constructor() {
    super('Sign in to use Unified Chat.');
    this.name = 'UnifiedChatAuthError';
  }
}

export class UnifiedChatRepositoryError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'UnifiedChatRepositoryError';
    this.code = code;
  }
}

function assertNoError(error: DbError, fallback: string): void {
  if (!error) return;
  throw new UnifiedChatRepositoryError(error.message || fallback, error.code);
}

function mapThread(row: DbRow): UnifiedChatThread {
  return {
    id: String(row.id),
    title: String(row.title),
    status: row.status === 'archived' ? 'archived' : 'active',
    archivedAt: typeof row.archived_at === 'string' ? row.archived_at : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapMessageAttachment(row: DbRow): UnifiedChatMessageAttachment | null {
  if (!row.id || !row.message_id || !row.name || !row.mime_type) return null;
  const content = typeof row.content === 'string'
    ? row.content
    : typeof row.content_text === 'string' ? row.content_text : '';
  const sizeBytes = Number(row.size_bytes);
  if (!content || !Number.isFinite(sizeBytes) || sizeBytes <= 0) return null;
  return {
    id: String(row.id),
    messageId: String(row.message_id),
    name: String(row.name),
    mimeType: String(row.mime_type),
    sizeBytes,
    content,
    createdAt: String(row.created_at),
  };
}

function mapMessage(row: DbRow): UnifiedChatMessage {
  const attachments = Array.isArray(row.attachments)
    ? row.attachments
        .map((item) => item && typeof item === 'object' ? mapMessageAttachment(item as DbRow) : null)
        .filter((item): item is UnifiedChatMessageAttachment => Boolean(item))
    : [];
  return {
    id: String(row.id),
    threadId: String(row.thread_id),
    role: row.role === 'assistant' ? 'assistant' : 'user',
    body: String(row.body),
    feedback:
      row.feedback === 'positive' || row.feedback === 'negative' ? row.feedback : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    attachments,
  };
}

function mapRun(row: DbRow): UnifiedChatRun {
  const allowedStatuses = new Set([
    'queued',
    'active',
    'complete',
    'partial',
    'stopped',
    'steered',
    'failed',
  ]);
  const status =
    typeof row.status === 'string' && allowedStatuses.has(row.status)
      ? (row.status as UnifiedChatRun['status'])
      : 'failed';
  const allowedRequestClasses = new Set([
    'general',
    'general_with_kwilt_context',
    'capability_question',
    'capability_action',
    'native_control',
    'better_served_elsewhere',
  ]);
  const requestClass =
    typeof row.request_class === 'string' && allowedRequestClasses.has(row.request_class)
      ? (row.request_class as UnifiedChatRun['requestClass'])
      : null;
  const rawContextPolicy =
    row.context_policy && typeof row.context_policy === 'object'
      ? (row.context_policy as Record<string, unknown>)
      : {};
  return {
    id: String(row.id),
    threadId: String(row.thread_id),
    userMessageId: typeof row.user_message_id === 'string' ? row.user_message_id : null,
    assistantMessageId:
      typeof row.assistant_message_id === 'string' ? row.assistant_message_id : null,
    status,
    errorCode: typeof row.error_code === 'string' ? row.error_code : null,
    errorMessage: typeof row.error_message === 'string' ? row.error_message : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    completedAt: typeof row.completed_at === 'string' ? row.completed_at : null,
    requestClass,
    participatingCapabilities: Array.isArray(row.participating_capabilities)
      ? row.participating_capabilities.filter(
          (value): value is UnifiedChatRun['participatingCapabilities'][number] =>
            value === 'goals' ||
            value === 'todos' ||
            value === 'chapters' ||
            value === 'screenTime',
        )
      : [],
    contextPolicy: {
      usePrivateContext: rawContextPolicy.usePrivateContext === true,
      reason:
        typeof rawContextPolicy.reason === 'string'
          ? rawContextPolicy.reason
          : 'legacy-run-without-context-policy',
      clarification:
        typeof rawContextPolicy.clarification === 'string'
          ? rawContextPolicy.clarification
          : null,
    },
    version: typeof row.version === 'number' && row.version > 0 ? row.version : 1,
    stopRequestedAt:
      typeof row.stop_requested_at === 'string' ? row.stop_requested_at : null,
    steerCount: typeof row.steer_count === 'number' && row.steer_count >= 0 ? row.steer_count : 0,
  };
}

function mapRunEvent(row: DbRow): UnifiedChatRunEvent {
  const status = row.status === 'pending' || row.status === 'active' || row.status === 'complete' || row.status === 'warning' || row.status === 'failed'
    ? row.status
    : 'failed';
  return {
    id: String(row.id), threadId: String(row.thread_id), runId: String(row.run_id),
    sequence: Number(row.sequence) || 1, type: String(row.event_type), status,
    visibility: row.visibility === 'user' ? 'user' : 'internal',
    label: typeof row.label === 'string' ? row.label : null,
    detail: typeof row.detail === 'string' ? row.detail : null,
  };
}

function mapEvidence(row: DbRow): UnifiedChatEvidenceRef | null {
  const capabilityId = row.capability_id;
  if (capabilityId !== 'goals' && capabilityId !== 'todos' && capabilityId !== 'chapters' && capabilityId !== 'screenTime') return null;
  const authority = row.authority === 'derived' || row.authority === 'user_supplied' ? row.authority : 'authoritative';
  const freshness = row.freshness_class === 'current' || row.freshness_class === 'recent' || row.freshness_class === 'stale' ? row.freshness_class : 'unknown';
  return {
    id: String(row.id), threadId: String(row.thread_id), runId: String(row.run_id),
    sequence: Number(row.sequence) || 1, capabilityId, objectType: String(row.object_type),
    objectId: String(row.object_id), label: String(row.label),
    selectionStatus: row.selection_status === 'omitted' ? 'omitted' : 'included',
    authority, freshness, selectionReason: String(row.selection_reason),
    sufficient: row.sufficient === true,
    coverageNote: typeof row.coverage_note === 'string' ? row.coverage_note : '',
  };
}

function mapLoadedOperation(row: DbRow): UnifiedChatProposalOperation | null {
  const base = {
    id: String(row.id), proposalId: String(row.proposal_id), capabilityId: 'todos' as const,
    summary: String(row.summary), idempotencyKey: String(row.idempotency_key),
    sequence: Number(row.sequence) || 1,
  };
  const payload = row.payload && typeof row.payload === 'object'
    ? row.payload as Record<string, unknown>
    : {};
  if (row.operation_type === 'create_activity' && typeof payload.title === 'string') {
    return { ...base, type: 'create_activity', targetId: null, payload: { ...payload, title: payload.title, expectedUpdatedAt: null } } as UnifiedChatProposalOperation;
  }
  if (row.operation_type === 'update_activity' && typeof row.target_id === 'string' && typeof payload.expectedUpdatedAt === 'string') {
    return { ...base, type: 'update_activity', targetId: row.target_id, payload: { ...payload, expectedUpdatedAt: payload.expectedUpdatedAt } } as UnifiedChatProposalOperation;
  }
  return null;
}

function mapProposal(row: DbRow, operation: UnifiedChatProposalOperation): UnifiedChatProposal {
  const allowed = new Set(['pending', 'edited', 'rejected', 'deferred', 'approved', 'applying', 'applied', 'failed', 'undone']);
  return {
    id: String(row.id), threadId: String(row.thread_id), runId: String(row.run_id),
    messageId: typeof row.message_id === 'string' ? row.message_id : null,
    capabilityId: 'todos', title: String(row.title), body: String(row.body),
    status: typeof row.status === 'string' && allowed.has(row.status) ? row.status as UnifiedChatProposal['status'] : 'failed',
    version: Number(row.version) || 1, createdAt: String(row.created_at), updatedAt: String(row.updated_at),
    operation,
  };
}

function mapReceipt(row: DbRow): UnifiedChatMutationReceipt | null {
  if (row.capability_id !== 'todos') return null;
  const status = row.status === 'reserved' || row.status === 'undone' || row.status === 'failed'
    ? row.status
    : 'applied';
  return {
    id: String(row.id), proposalId: String(row.proposal_id), capabilityId: 'todos', status,
    operationId: String(row.operation_id), idempotencyKey: String(row.idempotency_key),
    resultingObjectType: typeof row.resulting_object_type === 'string' ? row.resulting_object_type : null,
    resultingObjectId: typeof row.resulting_object_id === 'string' ? row.resulting_object_id : null,
    resultState: row.result_state && typeof row.result_state === 'object' ? row.result_state as Record<string, unknown> : {},
    returnTarget: row.return_target && typeof row.return_target === 'object' ? row.return_target as Record<string, unknown> : null,
    undoOperation: row.undo_operation && typeof row.undo_operation === 'object' ? row.undo_operation as Record<string, unknown> : null,
    canUndo: status === 'applied' && Boolean(row.undo_operation),
    appliedAt: typeof row.applied_at === 'string' ? row.applied_at : null,
    undoneAt: typeof row.undone_at === 'string' ? row.undone_at : null,
  };
}

function mapContextRef(row: DbRow): UnifiedChatContextRef | null {
  const capabilityId = row.capability_id;
  if (capabilityId !== 'goals' && capabilityId !== 'todos' && capabilityId !== 'chapters' && capabilityId !== 'screenTime') return null;
  const source = row.source === 'user_added' || row.source === 'retrieved_promoted' ? row.source : 'launch';
  return {
    id: String(row.id), threadId: String(row.thread_id), capabilityId,
    objectType: String(row.object_type), objectId: String(row.object_id), label: String(row.label),
    secondaryLabel: typeof row.secondary_label === 'string' ? row.secondary_label : null,
    source, active: row.active === true,
    returnTarget: row.return_target && typeof row.return_target === 'object' ? row.return_target as Record<string, unknown> : null,
    version: Number(row.version) || 1,
  };
}

export type UnifiedChatRepository = ReturnType<typeof createUnifiedChatRepository>;

export function createUnifiedChatRepository(
  client: SupabaseClient = getSupabaseClient(),
) {
  const requireUserId = async (): Promise<string> => {
    const { data, error } = await client.auth.getUser();
    if (error || !data.user?.id) throw new UnifiedChatAuthError();
    return data.user.id;
  };

  const touchThread = async (threadId: string, userId: string): Promise<void> => {
    const { error } = await client
      .from('kwilt_agent_threads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', threadId)
      .eq('user_id', userId);
    assertNoError(error, 'Unable to update chat recency.');
  };

  return {
    async createThread(title = 'New chat'): Promise<UnifiedChatThread> {
      const userId = await requireUserId();
      const normalizedTitle = title.trim() || 'New chat';
      const { data, error } = await client
        .from('kwilt_agent_threads')
        .insert({ user_id: userId, title: normalizedTitle.slice(0, 160) })
        .select(THREAD_COLUMNS)
        .single();
      assertNoError(error, 'Unable to create chat.');
      if (!data) throw new UnifiedChatRepositoryError('Chat was not returned after creation.');
      return mapThread(data);
    },

    async listThreads(options?: { includeArchived?: boolean }): Promise<UnifiedChatThread[]> {
      const userId = await requireUserId();
      let query = client
        .from('kwilt_agent_threads')
        .select(THREAD_COLUMNS)
        .eq('user_id', userId);
      if (!options?.includeArchived) query = query.eq('status', 'active');
      const { data, error } = await query.order('updated_at', { ascending: false });
      assertNoError(error, 'Unable to load chats.');
      return (data ?? []).map(mapThread);
    },

    async loadThread(threadId: string): Promise<UnifiedChatThreadAggregate> {
      const userId = await requireUserId();
      const threadResult = await client
        .from('kwilt_agent_threads')
        .select(THREAD_COLUMNS)
        .eq('id', threadId)
        .eq('user_id', userId)
        .single();
      assertNoError(threadResult.error, 'Unable to load chat.');
      if (!threadResult.data) throw new UnifiedChatRepositoryError('Chat not found.');

      const messagesResult = await client
        .from('kwilt_agent_messages')
        .select(MESSAGE_COLUMNS)
        .eq('thread_id', threadId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      assertNoError(messagesResult.error, 'Unable to load chat messages.');

      const runsResult = await client
        .from('kwilt_agent_runs')
        .select(RUN_COLUMNS)
        .eq('thread_id', threadId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      assertNoError(runsResult.error, 'Unable to load chat activity.');

      const eventsResult = await client
        .from('kwilt_agent_run_events').select(RUN_EVENT_COLUMNS)
        .eq('thread_id', threadId).eq('user_id', userId)
        .order('created_at', { ascending: true }).order('sequence', { ascending: true });
      assertNoError(eventsResult.error, 'Unable to load chat progress.');
      const evidenceResult = await client
        .from('kwilt_agent_evidence_refs').select(EVIDENCE_COLUMNS)
        .eq('thread_id', threadId).eq('user_id', userId)
        .order('created_at', { ascending: true }).order('sequence', { ascending: true });
      assertNoError(evidenceResult.error, 'Unable to load chat evidence.');
      const proposalsResult = await client
        .from('kwilt_agent_proposals').select(PROPOSAL_COLUMNS)
        .eq('thread_id', threadId).eq('user_id', userId)
        .order('created_at', { ascending: true });
      assertNoError(proposalsResult.error, 'Unable to load chat proposals.');
      const proposalIds = (proposalsResult.data ?? []).map((row) => String(row.id));
      let operations: DbRow[] = [];
      if (proposalIds.length > 0) {
        const operationsResult = await client
          .from('kwilt_agent_proposal_operations').select(PROPOSAL_OPERATION_COLUMNS)
          .eq('user_id', userId).in('proposal_id', proposalIds)
          .order('sequence', { ascending: true });
        assertNoError(operationsResult.error, 'Unable to load chat proposal operations.');
        operations = (operationsResult.data ?? []) as DbRow[];
      }
      const receiptsResult = await client
        .from('kwilt_agent_mutation_receipts').select(RECEIPT_COLUMNS)
        .eq('thread_id', threadId).eq('user_id', userId)
        .order('created_at', { ascending: true });
      assertNoError(receiptsResult.error, 'Unable to load chat receipts.');
      const contextResult = await client
        .from('kwilt_agent_context_refs').select(CONTEXT_COLUMNS)
        .eq('thread_id', threadId).eq('user_id', userId).eq('active', true)
        .order('created_at', { ascending: true });
      assertNoError(contextResult.error, 'Unable to load chat context.');
      const operationByProposal = new Map(
        operations.map(mapLoadedOperation).filter((operation): operation is UnifiedChatProposalOperation => Boolean(operation))
          .map((operation) => [operation.proposalId, operation]),
      );

      return {
        thread: mapThread(threadResult.data),
        messages: (messagesResult.data ?? []).map(mapMessage),
        runs: (runsResult.data ?? []).map(mapRun),
        events: (eventsResult.data ?? []).map(mapRunEvent),
        evidence: (evidenceResult.data ?? []).map(mapEvidence).filter((item): item is UnifiedChatEvidenceRef => Boolean(item)),
        proposals: (proposalsResult.data ?? []).flatMap((row) => {
          const operation = operationByProposal.get(String(row.id));
          return operation ? [mapProposal(row, operation)] : [];
        }),
        receipts: (receiptsResult.data ?? []).map(mapReceipt).filter((item): item is UnifiedChatMutationReceipt => Boolean(item)),
        contextRefs: (contextResult.data ?? []).map(mapContextRef).filter((item): item is UnifiedChatContextRef => Boolean(item)),
      };
    },

    async renameThread(threadId: string, title: string): Promise<UnifiedChatThread> {
      const userId = await requireUserId();
      const normalizedTitle = title.trim();
      if (!normalizedTitle) throw new UnifiedChatRepositoryError('Chat title cannot be empty.');
      const { data, error } = await client
        .from('kwilt_agent_threads')
        .update({ title: normalizedTitle.slice(0, 160), updated_at: new Date().toISOString() })
        .eq('id', threadId)
        .eq('user_id', userId)
        .select(THREAD_COLUMNS)
        .single();
      assertNoError(error, 'Unable to rename chat.');
      if (!data) throw new UnifiedChatRepositoryError('Chat was not returned after rename.');
      return mapThread(data);
    },

    async archiveThread(threadId: string): Promise<UnifiedChatThread> {
      const userId = await requireUserId();
      const now = new Date().toISOString();
      const { data, error } = await client
        .from('kwilt_agent_threads')
        .update({ status: 'archived', archived_at: now, updated_at: now })
        .eq('id', threadId)
        .eq('user_id', userId)
        .select(THREAD_COLUMNS)
        .single();
      assertNoError(error, 'Unable to archive chat.');
      if (!data) throw new UnifiedChatRepositoryError('Chat was not returned after archive.');
      return mapThread(data);
    },

    async attachContext(input: AttachUnifiedChatContextInput): Promise<UnifiedChatContextRef> {
      const userId = await requireUserId();
      const { data, error } = await client.from('kwilt_agent_context_refs').upsert({
        user_id: userId, thread_id: input.threadId, capability_id: input.capabilityId,
        object_type: input.objectType, object_id: input.objectId, label: input.label,
        secondary_label: input.secondaryLabel ?? null, source: input.source,
        active: true, return_target: input.returnTarget, updated_at: new Date().toISOString(),
      }, { onConflict: 'thread_id,capability_id,object_type,object_id' }).select(CONTEXT_COLUMNS).single();
      assertNoError(error, 'Unable to attach chat context.');
      const context = data ? mapContextRef(data) : null;
      if (!context) throw new UnifiedChatRepositoryError('Chat context was not returned after save.');
      const threadResult = await client.from('kwilt_agent_threads').update({
        scope_kind: input.objectType === 'capability' ? 'capability' : 'object',
        return_target: input.returnTarget,
        updated_at: new Date().toISOString(),
      }).eq('id', input.threadId).eq('user_id', userId);
      assertNoError(threadResult.error, 'Unable to update chat scope.');
      return context;
    },

    async removeContext(contextId: string, expectedVersion: number): Promise<void> {
      const userId = await requireUserId();
      const { data, error } = await client.from('kwilt_agent_context_refs')
        .update({ active: false, version: expectedVersion + 1, updated_at: new Date().toISOString() })
        .eq('id', contextId).eq('user_id', userId).eq('version', expectedVersion)
        .select('id').single();
      assertNoError(error, 'Unable to remove chat context.');
      if (!data) throw new UnifiedChatRepositoryError('Chat context changed before it could be removed.');
    },

    async insertMessage(input: CreateUnifiedChatMessageInput): Promise<UnifiedChatMessage> {
      const userId = await requireUserId();
      const body = input.body.trim();
      if (!body) throw new UnifiedChatRepositoryError('Chat message cannot be empty.');
      if (input.role === 'user') {
        const attachments = validateUnifiedChatAttachmentSet(input.attachments ?? []);
        const { data, error } = await client.rpc('create_kwilt_agent_user_message', {
          p_thread_id: input.threadId,
          p_body: body,
          p_client_request_id: input.clientRequestId ?? null,
          p_attachments: attachments.map((attachment) => ({
            id: attachment.id,
            name: attachment.name,
            mime_type: attachment.mimeType,
            size_bytes: attachment.sizeBytes,
            content: attachment.content,
          })),
        });
        assertNoError(error, 'Unable to save chat message.');
        if (!data) throw new UnifiedChatRepositoryError('Message was not returned after save.');
        return mapMessage(data as DbRow);
      }
      const { data, error } = await client
        .from('kwilt_agent_messages')
        .insert({
          user_id: userId,
          thread_id: input.threadId,
          role: input.role,
          body,
          client_request_id: input.clientRequestId ?? null,
        })
        .select(MESSAGE_COLUMNS)
        .single();
      assertNoError(error, 'Unable to save chat message.');
      if (!data) throw new UnifiedChatRepositoryError('Message was not returned after save.');
      await touchThread(input.threadId, userId);
      return mapMessage(data);
    },

    async setMessageFeedback(
      messageId: string,
      feedback: 'positive' | 'negative',
      reason?: string,
    ): Promise<UnifiedChatMessage> {
      await requireUserId();
      const { data, error } = await client.rpc('record_kwilt_agent_message_feedback', {
        p_message_id: messageId,
        p_sentiment: feedback,
        p_reason: reason?.trim() || null,
      });
      assertNoError(error, 'Unable to save response feedback.');
      if (!data) throw new UnifiedChatRepositoryError('Message was not returned after feedback.');
      return mapMessage(data as DbRow);
    },

    async createRun(input: CreateUnifiedChatRunInput): Promise<UnifiedChatRun> {
      const userId = await requireUserId();
      const { data, error } = await client
        .from('kwilt_agent_runs')
        .insert({
          user_id: userId,
          thread_id: input.threadId,
          user_message_id: input.userMessageId,
          status: 'active',
          request_class: input.requestClass,
          participating_capabilities: input.participatingCapabilities,
          context_policy: input.contextPolicy,
        })
        .select(RUN_COLUMNS)
        .single();
      assertNoError(error, 'Unable to start chat response.');
      if (!data) throw new UnifiedChatRepositoryError('Chat run was not returned after creation.');
      return mapRun(data);
    },

    async appendRunEvents(input: AppendUnifiedChatRunEventsInput): Promise<void> {
      if (input.events.length === 0) return;
      const userId = await requireUserId();
      const { error } = await client.from('kwilt_agent_run_events').insert(
        input.events.map((event) => ({
          user_id: userId,
          thread_id: input.threadId,
          run_id: input.runId,
          sequence: event.sequence,
          event_type: event.type,
          status: event.status,
          visibility: event.visibility,
          label: event.label ?? null,
          detail: event.detail ?? null,
          payload: event.payload ?? {},
        })),
      );
      assertNoError(error, 'Unable to save chat progress.');
    },

    async persistRunEvidence(input: PersistUnifiedChatRunEvidenceInput): Promise<void> {
      if (input.evidence.length === 0) return;
      const userId = await requireUserId();
      const { error } = await client.from('kwilt_agent_evidence_refs').insert(
        input.evidence.map((evidence) => ({
          user_id: userId,
          thread_id: input.threadId,
          run_id: input.runId,
          capability_id: evidence.capabilityId,
          object_type: evidence.objectType,
          object_id: evidence.objectId,
          label: evidence.label,
          selection_status: evidence.selectionStatus,
          authority: evidence.authority,
          freshness_class: evidence.freshness,
          observed_at: evidence.observedAt,
          provenance: evidence.provenance,
          selection_reason: evidence.selectionReason,
          sufficient: evidence.sufficient,
          omitted_count: evidence.omittedCount,
          coverage_note: evidence.coverageNote,
          sequence: evidence.sequence,
        })),
      );
      assertNoError(error, 'Unable to save chat evidence.');
    },

    async createProposal(input: CreateUnifiedChatProposalInput): Promise<UnifiedChatProposal> {
      const userId = await requireUserId();
      const proposalResult = await client
        .from('kwilt_agent_proposals')
        .insert({
          user_id: userId,
          thread_id: input.threadId,
          run_id: input.runId,
          message_id: input.messageId,
          capability_id: input.capabilityId,
          title: input.title,
          body: input.body,
          status: 'pending',
          permission_policy: input.permissionPolicy,
        })
        .select(PROPOSAL_COLUMNS)
        .single();
      assertNoError(proposalResult.error, 'Unable to save chat proposal.');
      if (!proposalResult.data) throw new UnifiedChatRepositoryError('Proposal was not returned after save.');
      const proposalId = String(proposalResult.data.id);
      const operationResult = await client
        .from('kwilt_agent_proposal_operations')
        .insert({
          user_id: userId,
          proposal_id: proposalId,
          capability_id: input.capabilityId,
          operation_type: input.operation.type,
          target_type: 'activity',
          target_id: input.operation.targetId,
          summary: input.operation.summary,
          payload: {
            ...input.operation.payload,
            expectedUpdatedAt: input.operation.expectedUpdatedAt,
          },
          idempotency_key: input.operation.idempotencyKey,
          sequence: 1,
        })
        .select(PROPOSAL_OPERATION_COLUMNS)
        .single();
      assertNoError(operationResult.error, 'Unable to save chat proposal operation.');
      if (!operationResult.data) throw new UnifiedChatRepositoryError('Proposal operation was not returned after save.');
      const proposal = proposalResult.data as DbRow;
      const operation = operationResult.data as DbRow;
      return {
        id: proposalId,
        threadId: String(proposal.thread_id),
        runId: String(proposal.run_id),
        messageId: typeof proposal.message_id === 'string' ? proposal.message_id : null,
        capabilityId: 'todos',
        title: String(proposal.title),
        body: String(proposal.body),
        status: 'pending',
        version: typeof proposal.version === 'number' ? proposal.version : 1,
        createdAt: String(proposal.created_at),
        updatedAt: String(proposal.updated_at),
        operation: input.operation.type === 'create_activity'
          ? {
              id: String(operation.id), proposalId, capabilityId: 'todos', type: 'create_activity',
              targetId: null, summary: String(operation.summary),
              payload: { ...input.operation.payload, title: String(input.operation.payload.title), expectedUpdatedAt: null },
              idempotencyKey: String(operation.idempotency_key),
              sequence: typeof operation.sequence === 'number' ? operation.sequence : 1,
            }
          : {
              id: String(operation.id), proposalId, capabilityId: 'todos', type: 'update_activity',
              targetId: String(input.operation.targetId), summary: String(operation.summary),
              payload: { ...input.operation.payload, expectedUpdatedAt: String(input.operation.expectedUpdatedAt) },
              idempotencyKey: String(operation.idempotency_key),
              sequence: typeof operation.sequence === 'number' ? operation.sequence : 1,
            },
      };
    },

    async decideProposal(
      input: DecideUnifiedChatProposalInput,
    ): Promise<UnifiedChatProposalDecisionResult> {
      await requireUserId();
      const { data, error } = await client.rpc('decide_kwilt_agent_proposal', {
        p_proposal_id: input.proposalId,
        p_action: input.action,
        p_expected_version: input.expectedVersion,
        p_patch: input.patch ?? {},
        p_note: input.note ?? null,
      });
      assertNoError(error, 'Unable to save proposal decision.');
      const result = data && typeof data === 'object' ? data as DbRow : null;
      const allowed = new Set(['edited', 'rejected', 'deferred', 'approved']);
      if (!result || typeof result.id !== 'string' || typeof result.status !== 'string' ||
          !allowed.has(result.status) || typeof result.version !== 'number') {
        throw new UnifiedChatRepositoryError('Proposal decision was not returned after save.');
      }
      return {
        id: result.id,
        status: result.status as UnifiedChatProposalDecisionResult['status'],
        version: result.version,
      };
    },

    async transitionProposalStatus(input: TransitionUnifiedChatProposalInput): Promise<{ status: UnifiedChatProposal['status']; version: number }> {
      await requireUserId();
      const { data, error } = await client.rpc('transition_kwilt_agent_proposal', {
        p_proposal_id: input.proposalId,
        p_from_status: input.fromStatus,
        p_to_status: input.toStatus,
        p_expected_version: input.expectedVersion,
      });
      assertNoError(error, 'Unable to advance proposal status.');
      const result = data && typeof data === 'object' ? data as DbRow : null;
      if (!result || result.status !== input.toStatus || typeof result.version !== 'number') {
        throw new UnifiedChatRepositoryError('Proposal changed before this operation could finish.');
      }
      return { status: input.toStatus, version: result.version };
    },

    async persistMutationReceipt(input: PersistUnifiedChatMutationReceiptInput): Promise<UnifiedChatMutationReceipt> {
      const userId = await requireUserId();
      const { data, error } = await client.from('kwilt_agent_mutation_receipts').insert({
        user_id: userId, thread_id: input.threadId, proposal_id: input.proposalId,
        operation_id: input.operationId, capability_id: 'todos', idempotency_key: input.idempotencyKey,
        status: input.status, resulting_object_type: input.resultingObjectType,
        resulting_object_id: input.resultingObjectId, result_state: input.resultState,
        return_target: input.returnTarget, undo_operation: input.undoOperation,
        error_code: input.errorCode ?? null, error_message: input.errorMessage ?? null,
        applied_at: input.appliedAt ?? null,
      }).select(RECEIPT_COLUMNS).single();
      assertNoError(error, 'Unable to save the capability receipt.');
      const receipt = data ? mapReceipt(data) : null;
      if (!receipt) throw new UnifiedChatRepositoryError('Capability receipt was not returned after save.');
      return receipt;
    },

    async finalizeMutationReceipt(
      receiptId: string,
      input: FinalizeUnifiedChatMutationReceiptInput,
    ): Promise<UnifiedChatMutationReceipt> {
      const userId = await requireUserId();
      const { data, error } = await client.from('kwilt_agent_mutation_receipts').update({
        status: 'applied', resulting_object_type: input.resultingObjectType,
        resulting_object_id: input.resultingObjectId, result_state: input.resultState,
        return_target: input.returnTarget, undo_operation: input.undoOperation,
        error_code: input.errorCode ?? null, error_message: input.errorMessage ?? null,
        applied_at: input.appliedAt ?? null, updated_at: new Date().toISOString(),
      }).eq('id', receiptId).eq('user_id', userId).eq('status', 'reserved')
        .select(RECEIPT_COLUMNS).single();
      assertNoError(error, 'Unable to finalize the capability receipt.');
      const receipt = data ? mapReceipt(data) : null;
      if (!receipt || receipt.status !== 'applied') {
        throw new UnifiedChatRepositoryError('Capability receipt changed before finalization.');
      }
      return receipt;
    },

    async failMutationReceipt(
      receiptId: string,
      errorCode: string,
      errorMessage: string,
    ): Promise<UnifiedChatMutationReceipt> {
      const userId = await requireUserId();
      const { data, error } = await client.from('kwilt_agent_mutation_receipts').update({
        status: 'failed', error_code: errorCode, error_message: errorMessage,
        updated_at: new Date().toISOString(),
      }).eq('id', receiptId).eq('user_id', userId).eq('status', 'reserved')
        .select(RECEIPT_COLUMNS).single();
      assertNoError(error, 'Unable to save capability recovery failure.');
      const receipt = data ? mapReceipt(data) : null;
      if (!receipt || receipt.status !== 'failed') {
        throw new UnifiedChatRepositoryError('Capability receipt changed during recovery.');
      }
      return receipt;
    },

    async markMutationReceiptUndone(receiptId: string, undoneAt: string): Promise<UnifiedChatMutationReceipt> {
      const userId = await requireUserId();
      const { data, error } = await client.from('kwilt_agent_mutation_receipts')
        .update({ status: 'undone', undone_at: undoneAt, updated_at: undoneAt })
        .eq('id', receiptId).eq('user_id', userId).eq('status', 'applied')
        .select(RECEIPT_COLUMNS).single();
      assertNoError(error, 'Unable to save undo receipt.');
      const receipt = data ? mapReceipt(data) : null;
      if (!receipt) throw new UnifiedChatRepositoryError('Undo receipt was not returned after save.');
      return receipt;
    },

    async transitionRunStatus(input: TransitionUnifiedChatRunInput): Promise<UnifiedChatRun> {
      await requireUserId();
      const { data, error } = await client.rpc('transition_kwilt_agent_run', {
        p_run_id: input.runId,
        p_from_status: input.fromStatus,
        p_to_status: input.toStatus,
        p_expected_version: input.expectedVersion,
        p_event_type: input.event.type,
        p_event_status: input.event.status,
        p_event_visibility: input.event.visibility,
        p_event_label: input.event.label ?? null,
        p_event_detail: input.event.detail ?? null,
        p_event_payload: input.event.payload ?? {},
        p_assistant_message_id: input.assistantMessageId ?? null,
        p_error_code: input.errorCode ?? null,
        p_error_message: input.errorMessage ?? null,
        p_completed_at: input.completedAt ?? null,
        p_stop_requested_at: input.stopRequestedAt ?? null,
        p_steer_count: input.steerCount ?? null,
      });
      assertNoError(error, 'Unable to update chat response.');
      const result = data && typeof data === 'object' ? data as DbRow : null;
      if (!result || result.status !== input.toStatus || typeof result.version !== 'number') {
        throw new UnifiedChatRepositoryError('Chat response changed before this transition could finish.');
      }
      return mapRun(result);
    },
  };
}
