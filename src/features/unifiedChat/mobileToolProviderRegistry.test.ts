import { KWILT_TOOL_CONTRACTS, type KwiltActionReceipt } from '@kwilt/agent-runtime';
import { UNIFIED_CHAT_TOOL_CATALOG } from './toolCatalog';
import {
  createMobileToolProviderRegistry,
  executeMobileRegisteredTool,
} from './mobileToolProviderRegistry';

describe('mobile tool provider registry', () => {
  test('registers the remaining Food review and handoff tools', () => {
    const foodReviewTools = [
      'recipes.publication.prepare', 'recipes.publication.publish',
      'store_opportunity.capture', 'food_scenario.prepare', 'food_scenario.accept',
      'savings.review', 'savings.accept', 'savings.coupon.open',
      'receipt.extract', 'receipt.reconcile',
    ];
    expect(foodReviewTools.every((id) => KWILT_TOOL_CONTRACTS.some((tool) => tool.id === id))).toBe(true);
    expect(foodReviewTools.every((id) => UNIFIED_CHAT_TOOL_CATALOG.some((tool) => tool.id === id))).toBe(true);
    expect(UNIFIED_CHAT_TOOL_CATALOG.some((tool) => tool.id === 'goals.read')).toBe(true);
  });

  test('registers and dispatches Plan availability reads and reviewed updates', async () => {
    const registry = createMobileToolProviderRegistry(UNIFIED_CHAT_TOOL_CATALOG);
    const execute = jest.fn(async () => ({
      status: 'completed' as const, output: { version: 3, timeZone: 'America/Denver', windows: [] }, receipt: null,
    }));
    for (const toolId of ['plan.availability.read', 'plan.availability.update']) {
      const tool = UNIFIED_CHAT_TOOL_CATALOG.find((candidate) => candidate.id === toolId)!;
      expect(tool).toBeDefined();
      await executeMobileRegisteredTool({
        registry, context: { execute }, tool,
        call: { id: `call-${toolId}`, toolId, arguments: toolId.endsWith('update')
          ? { expectedVersion: 3, timeZone: 'America/Denver', windows: [] }
          : {} },
      });
    }
    expect(execute).toHaveBeenCalledTimes(2);
  });

  test('dispatches a Food review handoff through the registered mobile handler', async () => {
    const result = { status: 'pending_client_action' as const, provider: 'device' as const, request: {} };
    const execute = jest.fn(async () => result);
    const registry = createMobileToolProviderRegistry(UNIFIED_CHAT_TOOL_CATALOG);
    const tool = UNIFIED_CHAT_TOOL_CATALOG.find((candidate) => candidate.id === 'recipes.publication.prepare')!;
    const call = { id: 'call-1', toolId: tool.id, arguments: {
      recipeVersionId: 'recipe-version-1', publicProfileId: 'profile-1', distributionScopes: ['kwilt_mobile'],
    } };

    await expect(executeMobileRegisteredTool({
      registry,
      context: { execute },
      call,
      tool,
    })).resolves.toEqual(result);
    expect(execute).toHaveBeenCalledWith(call, tool);
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

  test('uses the canonical receipt envelope and replays duplicate mobile requests', async () => {
    const receipts: KwiltActionReceipt[] = [];
    const execute = jest.fn(async () => ({
      status: 'completed' as const,
      output: { resultRefs: [{ kind: 'goal', id: 'goal-1' }] },
      receipt: null,
    }));
    const registry = createMobileToolProviderRegistry(UNIFIED_CHAT_TOOL_CATALOG);
    const tool = UNIFIED_CHAT_TOOL_CATALOG.find((candidate) => candidate.id === 'goals.read')!;
    const call = { id: 'call-1', toolId: tool.id, arguments: {} };
    const context = {
      execute,
      actionExecution: {
        envelope: () => ({
          actorId: 'actor-1', householdId: 'household-1', source: 'mobile_chat' as const,
          operationId: tool.id, requestId: call.id, target: null,
          authorization: { decision: 'authorized' as const, reason: null },
          confirmation: { state: 'not_required' as const }, arguments: call.arguments,
          reversible: tool.reversible,
        }),
        store: {
          load: async ({ actorId, operationId, requestId }: { actorId: string; operationId: string; requestId: string }) =>
            receipts.find((receipt) => receipt.actorId === actorId && receipt.operationId === operationId
              && receipt.requestId === requestId) ?? null,
          save: async (receipt: KwiltActionReceipt) => { receipts.splice(0, receipts.length, receipt); },
        },
        createReceiptId: () => 'receipt-1',
        now: () => '2026-08-27T18:00:00.000Z',
      },
    };

    await expect(executeMobileRegisteredTool({ registry, context, call, tool })).resolves.toMatchObject({
      status: 'completed',
      receipt: { receiptId: 'receipt-1', operationId: 'goals.read', source: 'mobile_chat' },
    });
    await expect(executeMobileRegisteredTool({ registry, context, call, tool })).resolves.toMatchObject({
      status: 'completed', receipt: { replayed: true },
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
