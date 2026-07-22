import { sendCoachChat as defaultSendCoachChat, type CoachChatTurn } from '../../services/ai';
import {
  createUnifiedChatRepository,
  type UnifiedChatRepository,
} from './threadRepository';
import type { UnifiedChatThreadAggregate } from './types';

export class UnifiedChatTurnError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnifiedChatTurnError';
  }
}

type TurnRepository = Pick<
  UnifiedChatRepository,
  'insertMessage' | 'createRun' | 'updateRun' | 'loadThread'
>;

type SendCoachChat = typeof defaultSendCoachChat;

export type RunUnifiedChatTurnInput = {
  aggregate: UnifiedChatThreadAggregate;
  prompt: string;
  clientRequestId?: string;
  onRunStarted?: (aggregate: UnifiedChatThreadAggregate) => void;
};

export type RunUnifiedChatTurnDependencies = {
  repository: TurnRepository;
  sendCoachChat: SendCoachChat;
};

export async function runUnifiedChatTurn(
  input: RunUnifiedChatTurnInput,
  dependencies?: RunUnifiedChatTurnDependencies,
): Promise<UnifiedChatThreadAggregate> {
  const repository = dependencies?.repository ?? createUnifiedChatRepository();
  const sendCoachChat = dependencies?.sendCoachChat ?? defaultSendCoachChat;
  const prompt = input.prompt.trim();
  if (!prompt) throw new UnifiedChatTurnError('Write a message first.');
  if (
    input.aggregate.runs.some((run) => run.status === 'queued' || run.status === 'active')
  ) {
    throw new UnifiedChatTurnError('A response is already in progress.');
  }

  const userMessage = await repository.insertMessage({
    threadId: input.aggregate.thread.id,
    role: 'user',
    body: prompt,
    clientRequestId: input.clientRequestId,
  });
  const run = await repository.createRun({
    threadId: input.aggregate.thread.id,
    userMessageId: userMessage.id,
  });
  input.onRunStarted?.({
    ...input.aggregate,
    messages: [...input.aggregate.messages, userMessage],
    runs: [...input.aggregate.runs, run],
  });
  const history: CoachChatTurn[] = [
    ...input.aggregate.messages.map((message) => ({
      role: message.role,
      content: message.body,
    })),
    { role: 'user', content: userMessage.body },
  ];

  try {
    const response = await sendCoachChat(history, {
      aiJob: 'default_chat',
      workflowInstanceId: input.aggregate.thread.id,
      launchContextSummary:
        'Launch source: unifiedChat. Intent: continue a durable standalone Kwilt conversation.',
      paywallSource: 'unknown',
    });
    const assistantMessage = await repository.insertMessage({
      threadId: input.aggregate.thread.id,
      role: 'assistant',
      body: response,
    });
    await repository.updateRun(run.id, {
      status: 'complete',
      assistantMessageId: assistantMessage.id,
      errorCode: null,
      errorMessage: null,
      completedAt: new Date().toISOString(),
    });
    return repository.loadThread(input.aggregate.thread.id);
  } catch {
    await repository.updateRun(run.id, {
      status: 'failed',
      errorCode: 'response_failed',
      errorMessage: 'Kwilt could not finish that response.',
      completedAt: new Date().toISOString(),
    });
    throw new UnifiedChatTurnError('Kwilt could not finish that response.');
  }
}
