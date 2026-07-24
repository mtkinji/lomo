import type {
  AgentLoopMessage,
  AgentModelStep,
  AgentToolCall,
  AgentToolDefinition,
} from '@kwilt/agent-runtime';

type RawModelToolCall = {
  id: unknown;
  function?: { name?: unknown; arguments?: unknown };
};

export function toModelToolName(toolId: string): string {
  return toolId.replace(/\./g, '__');
}

export function fromModelToolName(
  modelName: string,
  tools: readonly AgentToolDefinition[],
): string {
  return tools.find((tool) => toModelToolName(tool.id) === modelName)?.id ?? modelName;
}

export function toOpenAiRuntimeTools(
  tools: readonly AgentToolDefinition[],
): Array<Record<string, unknown>> {
  const names = new Set<string>();
  return tools.map((tool) => {
    const name = toModelToolName(tool.id);
    if (names.has(name)) throw new Error(`Runtime tool model-name collision: ${name}`);
    names.add(name);
    return {
      type: 'function',
      function: {
        name,
        description: tool.purpose,
        parameters: tool.inputSchema,
        // Capability providers validate arguments authoritatively. Optional tool
        // fields cannot satisfy Chat Completions strict-mode's all-required rule.
        strict: false,
      },
    };
  });
}

export function parseRuntimeToolCalls(
  value: unknown,
  tools: readonly AgentToolDefinition[],
): AgentToolCall[] | null {
  if (!Array.isArray(value)) return null;
  const calls: AgentToolCall[] = [];
  for (const item of value as RawModelToolCall[]) {
    if (
      !item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id.trim() ||
      !item.function || typeof item.function.name !== 'string' ||
      typeof item.function.arguments !== 'string'
    ) return null;
    let args: unknown;
    try {
      args = JSON.parse(item.function.arguments);
    } catch {
      return null;
    }
    if (!args || typeof args !== 'object' || Array.isArray(args)) return null;
    calls.push({
      id: item.id,
      toolId: fromModelToolName(item.function.name, tools),
      arguments: args as Record<string, unknown>,
    });
  }
  return calls;
}

export async function parseOpenAiRuntimeStepResponse(
  response: Response,
  tools: readonly AgentToolDefinition[],
  onHttpError: (status: number, body: string) => Error,
): Promise<AgentModelStep> {
  if (!response.ok) {
    const body = await response.text();
    throw onHttpError(response.status, body);
  }
  const data = await response.json();
  const message = data.choices?.[0]?.message as {
    content?: string | null;
    tool_calls?: unknown;
  } | undefined;
  if (!message) throw new Error('OpenAI runtime tool response malformed.');
  const toolCalls = message.tool_calls ? parseRuntimeToolCalls(message.tool_calls, tools) : [];
  if (!toolCalls) throw new Error('OpenAI runtime tool calls were malformed.');
  return { content: message.content ?? null, toolCalls };
}

export function toOpenAiLoopMessages(
  messages: readonly AgentLoopMessage[],
): Array<Record<string, unknown>> {
  return messages.map((message) => {
    if (message.role === 'assistant' && message.toolCalls) {
      return {
        role: 'assistant',
        content: message.content,
        tool_calls: message.toolCalls.map((call) => ({
          id: call.id,
          type: 'function',
          function: {
            name: toModelToolName(call.toolId),
            arguments: JSON.stringify(call.arguments),
          },
        })),
      };
    }
    if (message.role === 'tool') {
      return {
        role: 'tool',
        tool_call_id: message.toolCallId,
        name: toModelToolName(message.toolId),
        content: message.content,
      };
    }
    return { role: message.role, content: message.content };
  });
}
