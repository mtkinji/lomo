import type { AgentToolDefinition } from '@kwilt/agent-runtime';
import { runCoachRuntimeToolLoop } from './runCoachRuntimeToolLoop';

const tool: AgentToolDefinition = {
  id: 'activities.read', version: 1, capabilityId: 'todos', purpose: 'Read Activities.',
  providers: ['device'], effect: 'read', consequence: 'low', reversible: true,
  confirmation: 'none', canDeferToClient: true,
  inputSchema: { type: 'object' }, outputSchema: { type: 'object' },
};

test('uses the already-fetched first model step before requesting a continuation', async () => {
  const continueModel = jest.fn(async () => ({ content: 'Done.', toolCalls: [] }));
  const executeTool = jest.fn(async () => ({
    status: 'completed' as const, receipt: null, output: { count: 2 },
  }));
  const result = await runCoachRuntimeToolLoop({
    tools: [tool], initialMessages: [{ role: 'user', content: 'What is open?' }],
    initialStep: {
      content: null,
      toolCalls: [{ id: 'call-1', toolId: tool.id, arguments: {} }],
    },
    continueModel, executeTool,
  });

  expect(executeTool).toHaveBeenCalledTimes(1);
  expect(continueModel).toHaveBeenCalledTimes(1);
  expect(result).toMatchObject({ status: 'completed', content: 'Done.' });
});

test('accepts a target-derived tool-call budget instead of a fixed bulk-action limit', async () => {
  const calls = Array.from({ length: 17 }, (_, index) => ({
    id: `call-${index + 1}`, toolId: tool.id, arguments: { targetId: `activity-${index + 1}` },
  }));
  const result = await runCoachRuntimeToolLoop({
    tools: [tool], initialMessages: [{ role: 'user', content: 'Inspect every Activity.' }],
    initialStep: { content: null, toolCalls: calls },
    continueModel: async () => ({ content: 'Done.', toolCalls: [] }),
    executeTool: async () => ({ status: 'completed', receipt: null, output: {} }),
    maxToolCalls: calls.length,
  });

  expect(result).toMatchObject({ status: 'completed', content: 'Done.' });
});
