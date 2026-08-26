export type DurableRealtimeToolCall = {
  callId: string;
  name: string;
  argumentsJson: string;
};

export type DurableRealtimeRunRequest = {
  realtimeItemId: string;
  transcript: string;
  channelContextVersion: number;
};

export type DurableRealtimeToolResult = {
  status: 'complete' | 'partial' | 'stopped' | 'steered' | 'failed' | 'needs_input';
  message: string;
  runId?: string;
};

export function isDurableRealtimeStopUtterance(transcript: string): boolean {
  return /^(?:stop|cancel(?: that)?|never mind|nevermind)[.!?\s]*$/i.test(transcript.trim());
}

export function buildRealtimeToolResultEvents(
  callId: string,
  result: DurableRealtimeToolResult,
): [Record<string, unknown>, Record<string, unknown>] {
  return [
    {
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify(result),
      },
    },
    { type: 'response.create', response: { tool_choice: 'none' } },
  ];
}

type Dependencies = {
  run(request: DurableRealtimeRunRequest): Promise<DurableRealtimeToolResult>;
  transcriptionWaitMs?: number;
};

function parseArguments(argumentsJson: string): {
  realtimeItemId: string;
  channelContextVersion: number;
} | null {
  let value: unknown;
  try { value = JSON.parse(argumentsJson); } catch { return null; }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const realtimeItemId = typeof record.realtimeItemId === 'string'
    ? record.realtimeItemId.trim().slice(0, 200)
    : '';
  const channelContextVersion = record.channelContextVersion;
  if (!realtimeItemId || !Number.isSafeInteger(channelContextVersion) || (channelContextVersion as number) < 1) {
    return null;
  }
  return { realtimeItemId, channelContextVersion: channelContextVersion as number };
}

export function createDurableRealtimeTool(dependencies: Dependencies) {
  const transcripts = new Map<string, string>();
  const transcriptWaiters = new Map<string, Set<(transcript: string | null) => void>>();
  const executions = new Map<string, Promise<DurableRealtimeToolResult>>();
  const itemExecutions = new Map<string, Promise<DurableRealtimeToolResult>>();
  const transcriptionWaitMs = dependencies.transcriptionWaitMs ?? 2_500;

  const waitForTranscript = (itemId: string): Promise<string | null> => {
    const observed = transcripts.get(itemId);
    if (observed) return Promise.resolve(observed);
    return new Promise((resolve) => {
      const waiters = transcriptWaiters.get(itemId) ?? new Set();
      const finish = (transcript: string | null) => {
        clearTimeout(timeout);
        waiters.delete(finish);
        if (waiters.size === 0) transcriptWaiters.delete(itemId);
        resolve(transcript);
      };
      const timeout = setTimeout(() => finish(null), transcriptionWaitMs);
      waiters.add(finish);
      transcriptWaiters.set(itemId, waiters);
    });
  };

  return {
    observeFinalTranscript({ itemId, transcript }: { itemId: string; transcript: string }) {
      const normalizedItemId = itemId.trim().slice(0, 200);
      const normalizedTranscript = transcript.trim();
      if (!normalizedItemId || !normalizedTranscript) return;
      transcripts.set(normalizedItemId, normalizedTranscript);
      transcriptWaiters.get(normalizedItemId)?.forEach((resolve) => resolve(normalizedTranscript));
    },

    execute(call: DurableRealtimeToolCall): Promise<DurableRealtimeToolResult> {
      const existing = executions.get(call.callId);
      if (existing) return existing;
      const execution = (async (): Promise<DurableRealtimeToolResult> => {
        if (call.name !== 'kwilt.run') {
          return { status: 'failed', message: 'That Realtime tool is not available.' };
        }
        const args = parseArguments(call.argumentsJson);
        if (!args) return { status: 'failed', message: 'The Realtime tool request was invalid.' };
        const itemExecution = itemExecutions.get(args.realtimeItemId) ?? (async () => {
          const transcript = await waitForTranscript(args.realtimeItemId);
          if (!transcript) {
            return {
              status: 'needs_input' as const,
              message: 'I did not receive a finalized transcript. Please say that again.',
            };
          }
          try {
            return await dependencies.run({ ...args, transcript });
          } catch {
            return { status: 'failed' as const, message: 'Kwilt could not finish that request.' };
          }
        })();
        itemExecutions.set(args.realtimeItemId, itemExecution);
        return itemExecution;
      })();
      executions.set(call.callId, execution);
      return execution;
    },

    reset() {
      transcriptWaiters.forEach((waiters) => waiters.forEach((resolve) => resolve(null)));
      transcriptWaiters.clear();
      transcripts.clear();
      executions.clear();
      itemExecutions.clear();
    },
  };
}
