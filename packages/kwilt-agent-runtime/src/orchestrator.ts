import type {
  AgentLoopMessage,
  AgentModelStep,
  AgentToolCall,
  AgentToolDefinition,
  AgentToolExecutionResult,
  AgentToolLoopEvent,
  AgentToolLoopResult,
} from './types';

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  }
  return value;
}

function callSignature(call: AgentToolCall): string {
  return `${call.toolId}:${JSON.stringify(stableValue(call.arguments))}`;
}

function failure(code: string, message: string): AgentToolExecutionResult {
  return { status: 'failed', code, message, retryable: false };
}

export async function runBoundedAgentToolLoop({
  tools,
  initialMessages,
  modelStep,
  executeTool,
  signal,
  maxRounds = 4,
  maxToolCalls = 12,
}: {
  tools: readonly AgentToolDefinition[];
  initialMessages: readonly AgentLoopMessage[];
  modelStep: (input: {
    messages: readonly AgentLoopMessage[];
    tools: readonly AgentToolDefinition[];
    round: number;
    signal?: AbortSignal;
  }) => Promise<AgentModelStep>;
  executeTool: (
    call: AgentToolCall,
    tool: AgentToolDefinition,
  ) => Promise<AgentToolExecutionResult>;
  signal?: AbortSignal;
  maxRounds?: number;
  maxToolCalls?: number;
}): Promise<AgentToolLoopResult> {
  const toolById = new Map(tools.map((tool) => [tool.id, tool]));
  const messages: AgentLoopMessage[] = [...initialMessages];
  const events: AgentToolLoopEvent[] = [];
  const executedSignatures = new Set<string>();
  let eventSequence = 0;
  let callCount = 0;

  const stopped = (round: number): AgentToolLoopResult => {
    events.push({ sequence: ++eventSequence, type: 'stopped', round });
    return { status: 'stopped', content: null, messages, events };
  };

  for (let round = 1; round <= maxRounds; round += 1) {
    if (signal?.aborted) return stopped(round);
    const step = await modelStep({ messages, tools, round, ...(signal ? { signal } : {}) });
    events.push({ sequence: ++eventSequence, type: 'model_step', round });

    if (step.toolCalls.length === 0) {
      const content = step.content?.trim();
      if (!content) {
        return { status: 'failed', content: null, errorCode: 'missing_final_content', messages, events };
      }
      messages.push({ role: 'assistant', content });
      return { status: 'completed', content, messages, events };
    }

    messages.push({ role: 'assistant', content: step.content, toolCalls: step.toolCalls });
    for (const call of step.toolCalls) {
      if (signal?.aborted) return stopped(round);
      callCount += 1;
      if (callCount > maxToolCalls) {
        return { status: 'partial', content: step.content, errorCode: 'max_tool_calls_reached', messages, events };
      }

      const tool = toolById.get(call.toolId);
      let result: AgentToolExecutionResult;
      let eventType: AgentToolLoopEvent['type'];
      if (!tool) {
        result = failure('unknown_tool', `Tool ${call.toolId} was not discovered for this run.`);
        eventType = 'unknown_tool';
      } else {
        const signature = callSignature(call);
        if (executedSignatures.has(signature)) {
          result = failure('repeated_tool_call', `Tool ${call.toolId} already ran with these arguments.`);
          eventType = 'repeated_tool_call';
        } else {
          executedSignatures.add(signature);
          result = await executeTool(call, tool);
          eventType = 'tool_completed';
        }
      }
      events.push({
        sequence: ++eventSequence,
        type: eventType,
        round,
        toolCallId: call.id,
        toolId: call.toolId,
        resultStatus: result.status,
      });
      messages.push({
        role: 'tool',
        toolCallId: call.id,
        toolId: call.toolId,
        content: JSON.stringify(result),
      });
    }
  }

  return { status: 'partial', content: null, errorCode: 'max_rounds_reached', messages, events };
}
