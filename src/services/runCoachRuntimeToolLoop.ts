import {
  runBoundedAgentToolLoop,
  type AgentLoopMessage,
  type AgentModelStep,
  type AgentToolCall,
  type AgentToolDefinition,
  type AgentToolExecutionResult,
  type AgentToolLoopResult,
} from '@kwilt/agent-runtime';

export async function runCoachRuntimeToolLoop(input: {
  tools: readonly AgentToolDefinition[];
  initialMessages: readonly AgentLoopMessage[];
  initialStep: AgentModelStep;
  continueModel: (messages: readonly AgentLoopMessage[]) => Promise<AgentModelStep>;
  executeTool: (call: AgentToolCall, tool: AgentToolDefinition) => Promise<AgentToolExecutionResult>;
  signal?: AbortSignal;
  maxRounds?: number;
}): Promise<AgentToolLoopResult> {
  let first = true;
  return runBoundedAgentToolLoop({
    tools: input.tools,
    initialMessages: input.initialMessages,
    signal: input.signal,
    maxRounds: input.maxRounds ?? 4,
    modelStep: async ({ messages }) => {
      if (first) {
        first = false;
        return input.initialStep;
      }
      return input.continueModel(messages);
    },
    executeTool: input.executeTool,
  });
}
