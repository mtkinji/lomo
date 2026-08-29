import type { ServerAgentLoopMessage, ServerAgentToolDefinition } from '../agentRuntime';
import {
  parseServerAgentResponse,
  requestServerAgentResponse,
  toServerProviderToolName,
  toServerResponsesInput,
  toServerResponsesTools,
} from '../serverAgentResponses';

const tools: ServerAgentToolDefinition[] = [{
  id: 'goals.update', version: 1, capabilityId: 'goals', purpose: 'Update one goal.',
  providers: ['server'], effect: 'write', consequence: 'low', reversible: true,
  confirmation: 'none', canDeferToClient: false,
  inputSchema: {
    type: 'object',
    properties: { goalId: { type: 'string' }, title: { type: 'string' } },
    required: ['goalId'],
    additionalProperties: false,
  },
  outputSchema: { type: 'object' },
}];

const messages: ServerAgentLoopMessage[] = [
  { role: 'system', content: 'Server-owned policy must not become client input.' },
  { role: 'user', content: 'Rename my goal.' },
  {
    role: 'assistant', content: null,
    toolCalls: [{
      id: 'kwilt-call-1', providerCallId: 'call-1', toolId: 'goals.update',
      arguments: { goalId: 'g1', title: 'Fitness' },
    }],
  },
  { role: 'tool', toolCallId: 'kwilt-call-1', toolId: 'goals.update', content: '{"status":"proposed"}' },
];

const completedResponse = {
  id: 'resp-1', model: 'gpt-5.6-terra', status: 'completed',
  output: [{
    type: 'message', role: 'assistant',
    content: [{ type: 'output_text', text: 'I prepared that change.' }],
  }],
  usage: { input_tokens: 20, output_tokens: 8, total_tokens: 28 },
};

describe('serverAgentResponses', () => {
  test('derives exact strict Responses function tools', () => {
    expect(toServerResponsesTools(tools)).toEqual([{
      type: 'function',
      name: 'goals_d_update',
      description: 'Update one goal.',
      parameters: {
        type: 'object',
        properties: {
          goalId: { type: 'string' },
          title: { type: ['string', 'null'] },
        },
        required: ['goalId', 'title'],
        additionalProperties: false,
      },
      strict: true,
    }]);
  });

  test('translates bounded conversation and preserves call_id only as correlation', () => {
    expect(toServerResponsesInput(messages)).toEqual([
      { role: 'user', content: 'Rename my goal.' },
      { type: 'function_call', call_id: 'call-1', name: 'goals_d_update', arguments: '{"goalId":"g1","title":"Fitness"}' },
      { type: 'function_call_output', call_id: 'call-1', output: '{"status":"proposed"}' },
    ]);
  });

  test('parses text, function calls, multiple output items, and usage metadata', () => {
    expect(parseServerAgentResponse({
      ...completedResponse,
      output: [
        completedResponse.output[0],
        { type: 'function_call', call_id: 'call-2', name: 'goals_d_update', arguments: '{"goalId":"g2","title":null}' },
      ],
    }, tools, { latencyMs: 42, toolCatalogHash: 'fnv1a:test' })).toEqual({
      content: 'I prepared that change.',
      toolCalls: [{
        id: 'resp-1:tool:1', providerCallId: 'call-2', toolId: 'goals.update',
        arguments: { goalId: 'g2' },
      }],
      metadata: {
        responseId: 'resp-1', routedModel: 'gpt-5.6-terra', promptVersion: 'unified-chat-agent-v1',
        toolCatalogHash: 'fnv1a:test', latencyMs: 42,
        usage: { inputTokens: 20, outputTokens: 8, totalTokens: 28 },
      },
    });
  });

  test('rejects malformed arguments, refusals, and incomplete responses', () => {
    expect(() => parseServerAgentResponse({
      ...completedResponse,
      output: [{ type: 'function_call', call_id: 'call-2', name: 'goals_d_update', arguments: '{' }],
    }, tools, { latencyMs: 1, toolCatalogHash: 'h' })).toThrow('model_tool_arguments_malformed');
    expect(() => parseServerAgentResponse({
      ...completedResponse,
      output: [{ type: 'message', role: 'assistant', content: [{ type: 'refusal', refusal: 'No.' }] }],
    }, tools, { latencyMs: 1, toolCatalogHash: 'h' })).toThrow('model_response_refused');
    expect(() => parseServerAgentResponse({
      ...completedResponse, status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' },
    }, tools, { latencyMs: 1, toolCatalogHash: 'h' })).toThrow('model_response_incomplete:max_output_tokens');
  });

  test('posts only to the Responses job and keeps model/system policy out of the request', async () => {
    const fetcher = jest.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body).toMatchObject({
        store: false, parallel_tool_calls: false, max_output_tokens: 1_200,
        policy_context: { currentDate: '2026-08-26', timeZone: 'America/Denver' },
      });
      expect(body).not.toHaveProperty('model');
      expect(body).not.toHaveProperty('instructions');
      expect(body.input).not.toContainEqual(expect.objectContaining({ role: 'system' }));
      return new Response(JSON.stringify(completedResponse), { status: 200 });
    });

    await expect(requestServerAgentResponse({
      supabaseUrl: 'https://example.supabase.co', serviceRoleToken: 'service',
      quotaIdentity: 'user-1', isPro: true, messages, tools,
      policyContext: { currentDate: '2026-08-26', timeZone: 'America/Denver' }, fetcher,
    })).resolves.toMatchObject({ content: 'I prepared that change.', metadata: { responseId: 'resp-1' } });
    expect(fetcher.mock.calls[0][0]).toBe('https://example.supabase.co/functions/v1/ai-chat/v1/responses');
    expect(fetcher.mock.calls[0][1]?.headers).toEqual(expect.objectContaining({
      Authorization: 'Bearer service', 'x-kwilt-ai-job': 'unified_chat_agent',
    }));
    expect(fetcher.mock.calls[0][1]?.headers).not.toHaveProperty('apikey');
  });

  test('normalizes proxy failures and retryable timeouts', async () => {
    await expect(requestServerAgentResponse({
      supabaseUrl: 'https://example.supabase.co', serviceRoleToken: 'service',
      quotaIdentity: 'user-1', isPro: false, messages, tools,
      policyContext: { currentDate: '2026-08-26', timeZone: 'UTC' },
      fetcher: async () => new Response('upstream down', { status: 503 }),
    })).rejects.toThrow('model_request_failed:503');
    await expect(requestServerAgentResponse({
      supabaseUrl: 'https://example.supabase.co', serviceRoleToken: 'service',
      quotaIdentity: 'user-1', isPro: false, messages, tools,
      policyContext: { currentDate: '2026-08-26', timeZone: 'UTC' },
      fetcher: async () => { throw new DOMException('timed out', 'TimeoutError'); },
    })).rejects.toThrow('model_request_timeout:retryable');
  });

  test('resolves an authorized deferred function returned through bounded tool search', async () => {
    const deferred = { ...tools[0], id: 'goals.delete', purpose: 'Delete one goal.' };
    const fetcher = jest.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.tools).toEqual([
        expect.objectContaining({ type: 'function', name: 'goals_d_update' }),
        expect.objectContaining({ type: 'function', name: 'goals_d_delete', defer_loading: true }),
        { type: 'tool_search', execution: 'server' },
      ]);
      return new Response(JSON.stringify({
        ...completedResponse,
        output: [{ type: 'function_call', call_id: 'provider-deferred', name: 'goals_d_delete', arguments: '{"goalId":"g2"}' }],
      }), { status: 200 });
    });
    await expect(requestServerAgentResponse({
      supabaseUrl: 'https://example.supabase.co', serviceRoleToken: 'service',
      quotaIdentity: 'user-1', isPro: true, messages, tools,
      resolvedTools: [...tools, deferred], toolSearchNamespaces: ['life_structure'],
      policyContext: { currentDate: '2026-08-26', timeZone: 'America/Denver' }, fetcher,
    })).resolves.toMatchObject({
      toolCalls: [{ id: 'resp-1:tool:1', providerCallId: 'provider-deferred', toolId: 'goals.delete' }],
    });
  });

  test('encodes canonical IDs into provider-safe, collision-resistant function names', () => {
    expect(toServerProviderToolName('screen_time.personal_rule.update'))
      .toBe('screen_u_time_d_personal_u_rule_d_update');
    expect(toServerProviderToolName('screen.time_personal.rule'))
      .toBe('screen_d_time_u_personal_d_rule');
    expect(() => toServerProviderToolName('invalid tool')).toThrow('provider_tool_name_invalid');
  });
});
