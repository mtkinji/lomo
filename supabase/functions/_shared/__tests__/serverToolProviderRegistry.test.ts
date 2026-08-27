import { KWILT_TOOL_CONTRACTS } from '../../../../packages/kwilt-agent-runtime/src/kwiltToolContracts';
import { SERVER_AGENT_TOOL_CATALOG } from '../serverAgentCatalog';
import {
  createServerToolProviderRegistry,
  executeServerRegisteredTool,
  serverToolResultFromActionReceipt,
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

  test('maps canonical action receipts into the model-facing tool protocol', () => {
    const receipt = {
      receiptId: 'receipt-1', operationId: 'activities.capture', requestId: 'request-1',
      actorId: 'actor-1', householdId: 'house-1', source: 'mobile_chat' as const,
      status: 'completed' as const, resultRefs: [{ kind: 'activity', id: 'activity-1' }],
      reversible: true, targetVersion: null, provider: null, retryable: false,
      reason: null, candidateSummary: null, replayed: false,
      createdAt: '2026-08-26T12:00:00.000Z',
    };
    expect(serverToolResultFromActionReceipt(receipt)).toEqual({
      status: 'completed',
      output: { receiptId: 'receipt-1', resultRefs: receipt.resultRefs, replayed: false }, receipt,
    });
    expect(serverToolResultFromActionReceipt({ ...receipt, status: 'pending_client_action' })).toMatchObject({
      status: 'pending_client_action', provider: 'device', request: { receiptId: 'receipt-1' },
    });
    expect(serverToolResultFromActionReceipt({
      ...receipt, status: 'pending_client_action', provider: 'connector',
    })).toMatchObject({ status: 'pending_client_action', provider: 'connector' });
    expect(serverToolResultFromActionReceipt({
      ...receipt, status: 'refused', reason: 'wrong_household',
    })).toEqual({ status: 'refused', reason: 'wrong_household' });
  });
});
