export type ChatCompletionStreamUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

type StreamBatch = {
  textDeltas: string[];
  usage: ChatCompletionStreamUsage | null;
};

function parseUsage(value: unknown): ChatCompletionStreamUsage | null {
  if (!value || typeof value !== 'object') return null;
  const usage = value as Record<string, unknown>;
  return typeof usage.prompt_tokens === 'number' &&
    typeof usage.completion_tokens === 'number' &&
    typeof usage.total_tokens === 'number'
    ? {
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
      }
    : null;
}

export function createChatCompletionStreamAccumulator(): {
  push(chunk: Uint8Array): StreamBatch;
  finish(): StreamBatch;
} {
  const decoder = new TextDecoder();
  let pending = '';
  let latestUsage: ChatCompletionStreamUsage | null = null;

  const consume = (flush: boolean): StreamBatch => {
    const textDeltas: string[] = [];
    const normalized = pending.replace(/\r\n/g, '\n');
    const events = normalized.split('\n\n');
    pending = flush ? '' : events.pop() ?? '';
    const completeEvents = flush ? events.filter(Boolean) : events;

    for (const event of completeEvents) {
      const data = event.split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n');
      if (!data || data === '[DONE]') continue;
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(data) as Record<string, unknown>;
      } catch {
        throw new Error('Malformed chat completion stream event');
      }
      const choices = Array.isArray(parsed.choices) ? parsed.choices : [];
      const first = choices[0] as { delta?: { content?: unknown } } | undefined;
      if (typeof first?.delta?.content === 'string' && first.delta.content) {
        textDeltas.push(first.delta.content);
      }
      latestUsage = parseUsage(parsed.usage) ?? latestUsage;
    }
    return { textDeltas, usage: latestUsage };
  };

  return {
    push(chunk) {
      pending += decoder.decode(chunk, { stream: true });
      return consume(false);
    },
    finish() {
      pending += decoder.decode();
      if (pending.trim()) pending += '\n\n';
      return consume(true);
    },
  };
}
