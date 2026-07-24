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
