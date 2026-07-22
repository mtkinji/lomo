import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../services/backend/supabaseClient';
import type {
  CreateUnifiedChatMessageInput,
  CreateUnifiedChatRunInput,
  UnifiedChatMessage,
  UnifiedChatRun,
  UnifiedChatThread,
  UnifiedChatThreadAggregate,
  UpdateUnifiedChatRunInput,
} from './types';

const THREAD_COLUMNS = 'id,title,status,archived_at,created_at,updated_at';
const MESSAGE_COLUMNS =
  'id,thread_id,role,body,feedback,created_at,updated_at';
const RUN_COLUMNS =
  'id,thread_id,user_message_id,assistant_message_id,status,error_code,error_message,created_at,updated_at,completed_at';

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

function mapMessage(row: DbRow): UnifiedChatMessage {
  return {
    id: String(row.id),
    threadId: String(row.thread_id),
    role: row.role === 'assistant' ? 'assistant' : 'user',
    body: String(row.body),
    feedback:
      row.feedback === 'positive' || row.feedback === 'negative' ? row.feedback : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
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

      return {
        thread: mapThread(threadResult.data),
        messages: (messagesResult.data ?? []).map(mapMessage),
        runs: (runsResult.data ?? []).map(mapRun),
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

    async insertMessage(input: CreateUnifiedChatMessageInput): Promise<UnifiedChatMessage> {
      const userId = await requireUserId();
      const body = input.body.trim();
      if (!body) throw new UnifiedChatRepositoryError('Chat message cannot be empty.');
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
    ): Promise<UnifiedChatMessage> {
      const userId = await requireUserId();
      const { data, error } = await client
        .from('kwilt_agent_messages')
        .update({ feedback, updated_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('user_id', userId)
        .select(MESSAGE_COLUMNS)
        .single();
      assertNoError(error, 'Unable to save response feedback.');
      if (!data) throw new UnifiedChatRepositoryError('Message was not returned after feedback.');
      return mapMessage(data);
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
        })
        .select(RUN_COLUMNS)
        .single();
      assertNoError(error, 'Unable to start chat response.');
      if (!data) throw new UnifiedChatRepositoryError('Chat run was not returned after creation.');
      return mapRun(data);
    },

    async updateRun(runId: string, input: UpdateUnifiedChatRunInput): Promise<UnifiedChatRun> {
      const userId = await requireUserId();
      const patch = {
        status: input.status,
        assistant_message_id: input.assistantMessageId,
        error_code: input.errorCode,
        error_message: input.errorMessage,
        completed_at: input.completedAt,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await client
        .from('kwilt_agent_runs')
        .update(patch)
        .eq('id', runId)
        .eq('user_id', userId)
        .select(RUN_COLUMNS)
        .single();
      assertNoError(error, 'Unable to update chat response.');
      if (!data) throw new UnifiedChatRepositoryError('Chat run was not returned after update.');
      return mapRun(data);
    },
  };
}
