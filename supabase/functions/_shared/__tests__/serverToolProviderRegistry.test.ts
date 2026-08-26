import { KWILT_TOOL_CONTRACTS } from '../../../../packages/kwilt-agent-runtime/src/kwiltToolContracts';
import { SERVER_AGENT_TOOL_CATALOG } from '../serverAgentCatalog';
import {
  createServerToolProviderRegistry,
  executeServerRegisteredTool,
} from '../serverToolProviderRegistry';

describe('server tool provider registry', () => {
  test('keeps a manifest-only tool out of the server catalog', () => {
    expect(KWILT_TOOL_CONTRACTS.some((tool) => tool.id === 'recipes.search')).toBe(true);
    expect(SERVER_AGENT_TOOL_CATALOG.some((tool) => tool.id === 'recipes.search')).toBe(false);
    expect(SERVER_AGENT_TOOL_CATALOG.some((tool) => tool.id === 'goals.read')).toBe(true);
  });

  test('returns unavailable instead of invoking an unregistered dispatcher', async () => {
    const dispatch = jest.fn();
    const registry = createServerToolProviderRegistry(SERVER_AGENT_TOOL_CATALOG);
    const tool = KWILT_TOOL_CONTRACTS.find((candidate) => candidate.id === 'recipes.search')!;

    await expect(executeServerRegisteredTool({
      registry,
      context: { dispatch },
      call: { id: 'call-1', toolId: tool.id, arguments: { query: 'soup' } },
      tool,
    })).resolves.toEqual({
      status: 'unavailable', reason: 'server_provider_unavailable', retryable: false,
    });
    expect(dispatch).not.toHaveBeenCalled();
  });
});
