import { KWILT_TOOL_CONTRACTS } from '@kwilt/agent-runtime';
import { UNIFIED_CHAT_TOOL_CATALOG } from './toolCatalog';
import {
  createMobileToolProviderRegistry,
  executeMobileRegisteredTool,
} from './mobileToolProviderRegistry';

describe('mobile tool provider registry', () => {
  test('keeps a manifest-only tool out of the mobile catalog', () => {
    expect(KWILT_TOOL_CONTRACTS.some((tool) => tool.id === 'recipes.search')).toBe(true);
    expect(UNIFIED_CHAT_TOOL_CATALOG.some((tool) => tool.id === 'recipes.search')).toBe(false);
    expect(UNIFIED_CHAT_TOOL_CATALOG.some((tool) => tool.id === 'goals.read')).toBe(true);
  });

  test('returns unavailable instead of invoking an unregistered handler', async () => {
    const execute = jest.fn();
    const registry = createMobileToolProviderRegistry(UNIFIED_CHAT_TOOL_CATALOG);
    const tool = KWILT_TOOL_CONTRACTS.find((candidate) => candidate.id === 'recipes.search')!;

    await expect(executeMobileRegisteredTool({
      registry,
      context: { execute },
      call: { id: 'call-1', toolId: tool.id, arguments: { query: 'soup' } },
      tool,
    })).resolves.toEqual({
      status: 'unavailable', reason: 'mobile_provider_unavailable', retryable: false,
    });
    expect(execute).not.toHaveBeenCalled();
  });

  test('dispatches a registered tool through the named handler', async () => {
    const result = { status: 'completed' as const, output: { goals: [] }, receipt: null };
    const execute = jest.fn(async () => result);
    const registry = createMobileToolProviderRegistry(UNIFIED_CHAT_TOOL_CATALOG);
    const tool = UNIFIED_CHAT_TOOL_CATALOG.find((candidate) => candidate.id === 'goals.read')!;
    const call = { id: 'call-1', toolId: tool.id, arguments: {} };

    await expect(executeMobileRegisteredTool({ registry, context: { execute }, call, tool }))
      .resolves.toEqual(result);
    expect(execute).toHaveBeenCalledWith(call, tool);
  });
});
