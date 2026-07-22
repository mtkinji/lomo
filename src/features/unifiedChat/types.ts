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
};

export type UnifiedChatThreadAggregate = {
  thread: UnifiedChatThread;
  messages: UnifiedChatMessage[];
  runs: UnifiedChatRun[];
};

export type CreateUnifiedChatMessageInput = {
  threadId: string;
  role: UnifiedChatMessageRole;
  body: string;
  clientRequestId?: string;
};

export type CreateUnifiedChatRunInput = {
  threadId: string;
  userMessageId: string;
};

export type UpdateUnifiedChatRunInput = {
  status: UnifiedChatRunStatus;
  assistantMessageId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  completedAt?: string | null;
};
