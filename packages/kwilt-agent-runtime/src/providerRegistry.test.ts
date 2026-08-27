import type { AgentToolDefinition, AgentToolExecutionResult } from './types';
import {
  createRuntimeToolProviderRegistry,
  type RuntimeToolProviderRegistration,
} from './providerRegistry';

const inspectTool: AgentToolDefinition = {
  id: 'test.inspect', version: 1, capabilityId: 'test', purpose: 'Inspect a test record.',
  providers: ['device', 'server'], effect: 'read', consequence: 'low', reversible: true,
  confirmation: 'none', canDeferToClient: false,
  inputSchema: { type: 'object' }, outputSchema: { type: 'object' },
};

const completed: AgentToolExecutionResult = {
  status: 'completed', output: { ok: true }, receipt: null,
};

function registration(
  provider: 'device' | 'server' = 'device',
  execute = jest.fn(async () => completed),
): RuntimeToolProviderRegistration<{ actorId: string }> {
  return { toolId: inspectTool.id, provider, execute };
}

describe('runtime tool provider registry', () => {
  test('executes the exact registered tool/provider handler', async () => {
    const device = registration('device');
    const server = registration('server');
    const registry = createRuntimeToolProviderRegistry({
      tools: [inspectTool], registrations: [device, server],
    });
    const call = { id: 'call-1', toolId: inspectTool.id, arguments: {} };

    expect(registry.has(inspectTool.id, 'device')).toBe(true);
    await expect(registry.execute(inspectTool.id, 'device', { actorId: 'actor-1' }, call))
      .resolves.toEqual(completed);
    expect(device.execute).toHaveBeenCalledWith({
      context: { actorId: 'actor-1' }, call, tool: inspectTool,
    });
  });

  test('rejects unknown tools and duplicate tool/provider pairs', () => {
    expect(() => createRuntimeToolProviderRegistry({
      tools: [inspectTool],
      registrations: [{ ...registration(), toolId: 'test.unknown' }],
    })).toThrow('Registration references unknown tool: test.unknown');

    expect(() => createRuntimeToolProviderRegistry({
      tools: [{ ...inspectTool, providers: ['device'] }],
      registrations: [registration(), registration()],
    })).toThrow('Duplicate tool/provider registration: test.inspect:device');
  });

  test('rejects every advertised provider that lacks a handler', () => {
    expect(() => createRuntimeToolProviderRegistry({
      tools: [inspectTool], registrations: [registration('device')],
    })).toThrow('Advertised provider has no handler: test.inspect:server');
  });

  test('rejects registration for a provider the tool does not advertise', () => {
    expect(() => createRuntimeToolProviderRegistry({
      tools: [{ ...inspectTool, providers: ['device'] }],
      registrations: [registration('device'), registration('server')],
    })).toThrow('Tool does not advertise registered provider: test.inspect:server');
  });

  test('refuses calls whose tool identity does not match the selected handler', async () => {
    const registry = createRuntimeToolProviderRegistry({
      tools: [{ ...inspectTool, providers: ['device'] }],
      registrations: [registration('device')],
    });

    await expect(registry.execute(
      inspectTool.id,
      'device',
      { actorId: 'actor-1' },
      { id: 'call-1', toolId: 'test.other', arguments: {} },
    )).rejects.toThrow('Tool call identity mismatch: test.inspect:test.other');
  });
});
