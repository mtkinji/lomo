import type { AgentToolDefinition } from '@kwilt/agent-runtime';
import {
  fromModelToolName,
  parseRuntimeToolCalls,
  toModelToolName,
  toOpenAiLoopMessages,
  toOpenAiRuntimeTools,
} from '../../services/aiRuntimeToolTransport';

const tools: AgentToolDefinition[] = [
  {
    id: 'goals.read', version: 1, capabilityId: 'goals', purpose: 'Read bounded Goals.',
    providers: ['server'], effect: 'read', consequence: 'low', reversible: true,
    confirmation: 'none', canDeferToClient: false,
    inputSchema: { type: 'object', properties: { status: { type: 'string' } }, additionalProperties: false },
    outputSchema: { type: 'object' },
  },
  {
    id: 'activities.steps.update', version: 1, capabilityId: 'todos', purpose: 'Update one Activity step.',
    providers: ['server', 'device'], effect: 'write', consequence: 'low', reversible: true,
    confirmation: 'explicit', canDeferToClient: true,
    inputSchema: { type: 'object', properties: { stepId: { type: 'string' } }, required: ['stepId'], additionalProperties: false },
    outputSchema: { type: 'object' },
  },
];

describe('runtimeToolTransport', () => {
  it('maps dotted versioned ids to reversible model-safe function names', () => {
    expect(toModelToolName('activities.steps.update')).toBe('activities__steps__update');
    expect(fromModelToolName('activities__steps__update', tools)).toBe('activities.steps.update');
    expect(fromModelToolName('unknown__tool', tools)).toBe('unknown__tool');
  });

  it('projects discovered definitions into OpenAI function tools', () => {
    expect(toOpenAiRuntimeTools(tools)).toEqual([
      {
        type: 'function',
        function: {
          name: 'goals__read',
          description: 'Read bounded Goals.',
          parameters: tools[0].inputSchema,
          strict: false,
        },
      },
      expect.objectContaining({
        function: expect.objectContaining({ name: 'activities__steps__update' }),
      }),
    ]);
  });

  it('strictly parses tool calls and preserves unknown names for coordinator rejection', () => {
    expect(parseRuntimeToolCalls([
      { id: 'call-1', function: { name: 'goals__read', arguments: '{"status":"active"}' } },
      { id: 'call-2', function: { name: 'money__transfer', arguments: '{}' } },
    ], tools)).toEqual([
      { id: 'call-1', toolId: 'goals.read', arguments: { status: 'active' } },
      { id: 'call-2', toolId: 'money__transfer', arguments: {} },
    ]);
    expect(parseRuntimeToolCalls([
      { id: 'call-1', function: { name: 'goals__read', arguments: 'not-json' } },
    ], tools)).toBeNull();
  });

  it('serializes loop messages back to Chat Completions tool chronology', () => {
    expect(toOpenAiLoopMessages([
      { role: 'user', content: 'Read my goals.' },
      { role: 'assistant', content: null, toolCalls: [{ id: 'call-1', toolId: 'goals.read', arguments: { status: 'active' } }] },
      { role: 'tool', toolCallId: 'call-1', toolId: 'goals.read', content: '{"status":"completed"}' },
    ])).toEqual([
      { role: 'user', content: 'Read my goals.' },
      { role: 'assistant', content: null, tool_calls: [{ id: 'call-1', type: 'function', function: { name: 'goals__read', arguments: '{"status":"active"}' } }] },
      { role: 'tool', tool_call_id: 'call-1', name: 'goals__read', content: '{"status":"completed"}' },
    ]);
  });
});
