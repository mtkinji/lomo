import type {
  AgentLoopMessage,
  AgentModelStep,
  AgentToolCall,
  AgentToolDefinition,
  AgentToolExecutionResult,
  AgentToolLoopEvent,
  AgentToolLoopResult,
  AppControlPlanResult,
  AppControlResultReference,
  AppControlStep,
} from './types';

function isResultReference(value: unknown): value is AppControlResultReference {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) &&
    Number.isInteger((value as AppControlResultReference).$fromStep) &&
    typeof (value as AppControlResultReference).path === 'string' &&
    (value as AppControlResultReference).path.length > 0;
}

function readPath(value: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[segment];
  }, value);
}

function resolveStepValue(value: unknown, stepIndex: number, results: readonly AgentToolExecutionResult[]): unknown {
  if (isResultReference(value)) {
    if (value.$fromStep < 0 || value.$fromStep >= stepIndex) {
      throw new Error(`Step ${stepIndex} cannot reference step ${value.$fromStep}.`);
    }
    const resolved = readPath(results[value.$fromStep], value.path);
    if (resolved === undefined) throw new Error(`Step ${stepIndex} could not resolve ${value.path} from step ${value.$fromStep}.`);
    return resolved;
  }
  if (Array.isArray(value)) return value.map((entry) => resolveStepValue(entry, stepIndex, results));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => [key, resolveStepValue(entry, stepIndex, results)]));
  }
  return value;
}

/** Executes a model-interpreted operation plan without allowing later steps to invent prior result ids. */
export async function runOrderedAppControlPlan({
  steps,
  executeOperation,
  answerText,
}: {
  steps: readonly AppControlStep[];
  executeOperation: (step: AppControlStep) => Promise<AgentToolExecutionResult>;
  answerText: string;
}): Promise<AppControlPlanResult> {
  const results: AgentToolExecutionResult[] = [];
  const receiptIds: string[] = [];

  for (const [index, step] of steps.entries()) {
    if (step.dependsOn !== undefined && (step.dependsOn < 0 || step.dependsOn >= index)) {
      return { outcome: { type: 'unsupported', reason: `Step ${index} has an invalid dependency.` }, results };
    }
    let resolvedArguments: Record<string, unknown>;
    try {
      resolvedArguments = resolveStepValue(step.arguments, index, results) as Record<string, unknown>;
    } catch (error) {
      return { outcome: { type: 'unsupported', reason: error instanceof Error ? error.message : 'A dependent result could not be resolved.' }, results };
    }
    const result = await executeOperation({ ...step, arguments: resolvedArguments });
    results.push(result);

    if (result.status === 'needs_input') {
      return { outcome: { type: 'clarification', question: result.prompt }, results };
    }
    if (result.status === 'proposed') {
      const proposalId = typeof result.proposal.id === 'string' ? result.proposal.id : `step:${index}`;
      return { outcome: { type: 'review', proposalIds: [proposalId] }, results };
    }
    if (result.status === 'pending_client_action') {
      const actionId = typeof result.request.actionId === 'string' ? result.request.actionId : `step:${index}`;
      return { outcome: { type: 'native_handoff', actionId }, results };
    }
    if (result.status === 'unavailable') {
      return { outcome: { type: 'unsupported', reason: result.reason }, results };
    }
    if (result.status === 'failed') {
      return { outcome: { type: 'unsupported', reason: result.message }, results };
    }
    if (result.receipt && typeof result.receipt.id === 'string') receiptIds.push(result.receipt.id);
  }

  return {
    outcome: receiptIds.length > 0 ? { type: 'applied', receiptIds } : { type: 'answer', text: answerText },
    results,
  };
}

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
