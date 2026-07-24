import { runBoundedAgentToolLoop } from './orchestrator';
import type { AgentModelStep, AgentToolDefinition, AgentToolExecutionResult } from './types';

const readTool: AgentToolDefinition = {
  id: 'goals.read', version: 1, capabilityId: 'goals', purpose: 'Read Goals.',
  providers: ['server'], effect: 'read', consequence: 'low', reversible: true,
  confirmation: 'none', canDeferToClient: false,
  inputSchema: { type: 'object' }, outputSchema: { type: 'object' },
};
const writeTool: AgentToolDefinition = {
  id: 'goals.update', version: 1, capabilityId: 'goals', purpose: 'Update a Goal.',
  providers: ['server'], effect: 'write', consequence: 'low', reversible: true,
  confirmation: 'explicit', canDeferToClient: false,
  inputSchema: { type: 'object' }, outputSchema: { type: 'object' },
};
const completed = (output: Record<string, unknown>): AgentToolExecutionResult => ({
  status: 'completed', output, receipt: null,
});

describe('runBoundedAgentToolLoop', () => {
  it('returns an ordinary model answer without executing a tool', async () => {
    const modelStep = jest.fn(async (): Promise<AgentModelStep> => ({ content: 'A direct answer.', toolCalls: [] }));
    const executeTool = jest.fn();
    const result = await runBoundedAgentToolLoop({
      tools: [readTool], initialMessages: [{ role: 'user', content: 'Hello' }], modelStep, executeTool,
    });
    expect(result.status).toBe('completed');
    expect(result.content).toBe('A direct answer.');
    expect(executeTool).not.toHaveBeenCalled();
  });

  it('executes a discovered read and returns its result to the model', async () => {
    const modelStep = jest.fn()
      .mockResolvedValueOnce({ content: null, toolCalls: [{ id: 'call-1', toolId: 'goals.read', arguments: { status: 'active' } }] })
      .mockResolvedValueOnce({ content: 'Your active goal is Read together.', toolCalls: [] });
    const executeTool = jest.fn(async () => completed({ goals: [{ title: 'Read together' }] }));
    const result = await runBoundedAgentToolLoop({
      tools: [readTool], initialMessages: [{ role: 'user', content: 'What goal is active?' }], modelStep, executeTool,
    });
    expect(result.status).toBe('completed');
    expect(executeTool).toHaveBeenCalledWith(expect.objectContaining({ toolId: 'goals.read' }), readTool);
    expect(modelStep).toHaveBeenLastCalledWith(expect.objectContaining({
      messages: expect.arrayContaining([expect.objectContaining({ role: 'tool', toolCallId: 'call-1' })]),
    }));
  });

  it('executes model-requested writes sequentially', async () => {
    const order: string[] = [];
    const modelStep = jest.fn()
      .mockResolvedValueOnce({ content: null, toolCalls: [
        { id: 'call-1', toolId: 'goals.update', arguments: { goalId: 'one' } },
        { id: 'call-2', toolId: 'goals.update', arguments: { goalId: 'two' } },
      ] })
      .mockResolvedValueOnce({ content: 'Both changes are ready for review.', toolCalls: [] });
    const executeTool = jest.fn(async (call: { id: string }) => {
      order.push(`start:${call.id}`); await Promise.resolve(); order.push(`end:${call.id}`);
      return { status: 'proposed' as const, proposal: { callId: call.id } };
    });
    await runBoundedAgentToolLoop({
      tools: [writeTool], initialMessages: [{ role: 'user', content: 'Rename both.' }], modelStep, executeTool,
    });
    expect(order).toEqual(['start:call-1', 'end:call-1', 'start:call-2', 'end:call-2']);
  });

  it('never executes unknown or repeated calls', async () => {
    const repeated = { id: 'call-1', toolId: 'goals.read', arguments: { status: 'active' } };
    const modelStep = jest.fn()
      .mockResolvedValueOnce({ content: null, toolCalls: [{ id: 'unknown', toolId: 'money.transfer', arguments: {} }] })
      .mockResolvedValueOnce({ content: null, toolCalls: [repeated] })
      .mockResolvedValueOnce({ content: null, toolCalls: [{ ...repeated, id: 'call-2' }] })
      .mockResolvedValueOnce({ content: 'I could not safely repeat that read.', toolCalls: [] });
    const executeTool = jest.fn(async () => completed({ goals: [] }));
    const result = await runBoundedAgentToolLoop({
      tools: [readTool], initialMessages: [{ role: 'user', content: 'Try it.' }], modelStep, executeTool, maxRounds: 5,
    });
    expect(result.status).toBe('completed');
    expect(executeTool).toHaveBeenCalledTimes(1);
    expect(result.events.map((event) => event.type)).toEqual(expect.arrayContaining(['unknown_tool', 'tool_completed', 'repeated_tool_call']));
  });

  it('stops before another model or tool step when aborted', async () => {
    const controller = new AbortController(); controller.abort();
    const modelStep = jest.fn(); const executeTool = jest.fn();
    const result = await runBoundedAgentToolLoop({
      tools: [readTool], initialMessages: [{ role: 'user', content: 'Stop.' }], modelStep, executeTool, signal: controller.signal,
    });
    expect(result.status).toBe('stopped');
    expect(modelStep).not.toHaveBeenCalled();
    expect(executeTool).not.toHaveBeenCalled();
  });

  it('returns a bounded partial result instead of looping forever', async () => {
    let nonce = 0;
    const modelStep = jest.fn(async () => ({
      content: null, toolCalls: [{ id: `call-${nonce}`, toolId: 'goals.read', arguments: { nonce: nonce++ } }],
    }));
    const result = await runBoundedAgentToolLoop({
      tools: [readTool], initialMessages: [{ role: 'user', content: 'Keep going.' }],
      modelStep, executeTool: async () => completed({}), maxRounds: 2,
    });
    expect(result.status).toBe('partial');
    expect(result.errorCode).toBe('max_rounds_reached');
    expect(modelStep).toHaveBeenCalledTimes(2);
  });
});
