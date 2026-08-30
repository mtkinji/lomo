import { KWILT_TOOL_CONTRACTS } from '../../../../packages/kwilt-agent-runtime/src/kwiltToolContracts';
import { SERVER_AGENT_TOOL_CATALOG } from '../serverAgentCatalog';
import {
  createServerToolProviderRegistry,
  executeServerRegisteredTool,
  serverToolResultFromActionReceipt,
} from '../serverToolProviderRegistry';

describe('server tool provider registry', () => {
  test('registers the remaining Food review and handoff tools', () => {
    const foodReviewTools = [
      'recipes.publication.prepare', 'recipes.publication.publish',
      'store_opportunity.capture', 'food_scenario.prepare', 'food_scenario.accept',
      'savings.review', 'savings.accept', 'savings.coupon.open',
      'receipt.extract', 'receipt.reconcile',
    ];
    expect(foodReviewTools.every((id) => KWILT_TOOL_CONTRACTS.some((tool) => tool.id === id))).toBe(true);
    expect(foodReviewTools.every((id) => SERVER_AGENT_TOOL_CATALOG.some((tool) => tool.id === id))).toBe(true);
    expect(SERVER_AGENT_TOOL_CATALOG.some((tool) => tool.id === 'goals.read')).toBe(true);
  });

  test('registers Plan availability for bounded reads and native review handoff', () => {
    expect(['plan.availability.read', 'plan.availability.update'].every((id) =>
      SERVER_AGENT_TOOL_CATALOG.some((tool) => tool.id === id))).toBe(true);
  });

  test('dispatches a registered Food review handoff', async () => {
    const result = { status: 'pending_client_action' as const, provider: 'device' as const, request: {} };
    const dispatch = jest.fn(async () => result);
    const registry = createServerToolProviderRegistry(SERVER_AGENT_TOOL_CATALOG);
    const tool = SERVER_AGENT_TOOL_CATALOG.find((candidate) => candidate.id === 'recipes.publication.prepare')!;
    const call = { id: 'call-1', toolId: tool.id, arguments: {
      recipeVersionId: 'recipe-version-1', publicProfileId: 'profile-1', distributionScopes: ['kwilt_mobile'],
    } };

    await expect(executeServerRegisteredTool({
      registry,
      context: { dispatch },
      call,
      tool,
    })).resolves.toEqual(result);
    expect(dispatch).toHaveBeenCalledWith(call, tool);
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
