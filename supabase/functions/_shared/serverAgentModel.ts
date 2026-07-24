import type {
  ServerAgentLoopMessage,
  ServerAgentToolCall,
  ServerAgentToolDefinition,
} from './agentRuntime.ts';

export function toServerModelToolName(toolId: string): string {
  return toolId.replace(/\./g, '__');
}

export function toServerOpenAiTools(tools: readonly ServerAgentToolDefinition[]) {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: toServerModelToolName(tool.id),
      description: tool.purpose,
      parameters: tool.inputSchema,
      strict: false,
    },
  }));
}

export function toServerOpenAiMessages(messages: readonly ServerAgentLoopMessage[]) {
  return messages.map((message) => {
    if (message.role === 'assistant' && message.toolCalls) {
      return {
        role: 'assistant', content: message.content,
        tool_calls: message.toolCalls.map((call) => ({
          id: call.id, type: 'function',
          function: { name: toServerModelToolName(call.toolId), arguments: JSON.stringify(call.arguments) },
        })),
      };
    }
    if (message.role === 'tool') {
      return {
        role: 'tool', tool_call_id: message.toolCallId,
        name: toServerModelToolName(message.toolId), content: message.content,
      };
    }
    return { role: message.role, content: message.content };
  });
}

export function parseServerAgentModelStep(raw: unknown, tools: readonly ServerAgentToolDefinition[]) {
  const asRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const body = asRecord(raw);
  const choice = Array.isArray(body.choices) ? asRecord(body.choices[0]) : {};
  const message = asRecord(choice.message);
  if (Object.keys(message).length === 0) throw new Error('model_response_malformed');
  const toolByName = new Map(tools.map((tool) => [toServerModelToolName(tool.id), tool.id]));
  const calls: ServerAgentToolCall[] = [];
  if (message.tool_calls != null) {
    if (!Array.isArray(message.tool_calls)) throw new Error('model_tool_calls_malformed');
    for (const rawCallValue of message.tool_calls) {
      const rawCall = asRecord(rawCallValue);
      const functionCall = asRecord(rawCall.function);
      const id = typeof rawCall.id === 'string' ? rawCall.id : '';
      const name = typeof functionCall.name === 'string' ? functionCall.name : '';
      const argsText = typeof functionCall.arguments === 'string' ? functionCall.arguments : '';
      if (!id || !name || !argsText) throw new Error('model_tool_call_malformed');
      let args;
      try { args = JSON.parse(argsText); } catch { throw new Error('model_tool_arguments_malformed'); }
      if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('model_tool_arguments_malformed');
      calls.push({ id, toolId: toolByName.get(name) ?? name, arguments: args });
    }
  }
  return { content: typeof message.content === 'string' ? message.content : null, toolCalls: calls };
}

export async function requestServerAgentModel({
  supabaseUrl,
  anonKey,
  token,
  quotaIdentity,
  isPro,
  messages,
  tools,
  fetcher = fetch,
}: {
  supabaseUrl: string;
  anonKey: string;
  token: string;
  quotaIdentity: string;
  isPro: boolean;
  messages: readonly ServerAgentLoopMessage[];
  tools: readonly ServerAgentToolDefinition[];
  fetcher?: typeof fetch;
}) {
  const response = await fetcher(`${supabaseUrl}/functions/v1/ai-chat/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', apikey: anonKey, Authorization: `Bearer ${token}`,
      'x-kwilt-install-id': `agent:${quotaIdentity}`,
      'x-kwilt-is-pro': String(isPro),
      'x-kwilt-client': 'kwilt-agent-run',
      'x-kwilt-ai-job': 'unified_chat_agent',
    },
    body: JSON.stringify({
      model: 'gpt-5-mini',
      messages: toServerOpenAiMessages(messages),
      tools: toServerOpenAiTools(tools),
      tool_choice: 'auto',
      temperature: 0.2,
    }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`model_request_failed:${response.status}:${text.slice(0, 300)}`);
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('model_response_malformed'); }
  return parseServerAgentModelStep(data, tools);
}
