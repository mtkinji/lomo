import { executeGroceryProposalDecision, type GroceryProposal } from './executeGroceryProposalDecision';

function proposal(type: 'food_stock.observe' | 'food_stock.deplete'): GroceryProposal {
  const operation = type === 'food_stock.observe'
    ? { type, targetId: 'stock-1', expectedObservationId: 'stock-1', payload: { observation: {
      concept: 'Rice', state: 'confirmed' as const, quantityMin: 1, quantityMax: 2, unit: 'bags',
      source: 'voice' as const, confidence: 0.9, observedAt: '2026-08-27T12:00:00.000Z', expiresAt: null,
    } } }
    : { type, targetId: 'stock-2', expectedObservationId: 'stock-2', payload: {
      concept: 'Rice', observedAt: '2026-08-28T12:00:00.000Z',
    } };
  return { id: 'proposal-1', threadId: 'thread-1', runId: 'run-1', messageId: 'message-1',
    title: 'Stock', body: 'Review', status: 'pending', version: 1, createdAt: 'now', updatedAt: 'now',
    capabilityId: 'groceries', operation: { id: 'operation-1', proposalId: 'proposal-1', summary: 'Stock',
      idempotencyKey: 'request-1', sequence: 1, capabilityId: 'groceries', ...operation } } as GroceryProposal;
}

describe('execute Grocery proposal decision', () => {
  test.each(['food_stock.observe', 'food_stock.deplete'] as const)('applies %s with a durable receipt', async (type) => {
    const repository = { decideProposal: jest.fn(async () => ({ status: 'approved' as const, version: 2 })),
      transitionProposalStatus: jest.fn(async () => ({ status: 'applying' as const, version: 3 })),
      persistMutationReceipt: jest.fn(async () => ({ id: 'receipt-1' })), finalizeMutationReceipt: jest.fn(async () => ({})),
      failMutationReceipt: jest.fn(async () => ({})) };
    const actions = { observe: jest.fn(async () => ({ observationId: 'stock-2', operationId: 'food_stock.observe' as const, replayed: false })),
      deplete: jest.fn(async () => ({ observationId: 'stock-3', operationId: 'food_stock.deplete' as const, replayed: false })) };
    await executeGroceryProposalDecision({ proposal: proposal(type), action: 'approve', repository: repository as never,
      actions, now: () => '2026-08-28T13:00:00.000Z' });
    expect(type === 'food_stock.observe' ? actions.observe : actions.deplete).toHaveBeenCalledWith(expect.objectContaining({
      requestId: 'request-1', confirmed: true, expectedObservationId: type === 'food_stock.observe' ? 'stock-1' : 'stock-2',
    }));
    expect(repository.finalizeMutationReceipt).toHaveBeenCalledWith('receipt-1', expect.objectContaining({
      capabilityId: 'groceries', resultingObjectType: 'food_stock_observation', resultingObjectId: type === 'food_stock.observe' ? 'stock-2' : 'stock-3',
    }));
  });

  test('applies an exact Grocery compilation through the edge-function action boundary', async () => {
    const base = proposal('food_stock.deplete');
    const groceryProposal = { ...base, operation: { ...base.operation, capabilityId: 'groceries' as const,
      type: 'groceries.compile' as const, targetId: 'plan-1', expectedVersion: 7,
      payload: { mealPlanVersion: 7 } } } as GroceryProposal;
    const repository = { decideProposal: jest.fn(async () => ({ status: 'approved' as const, version: 2 })),
      transitionProposalStatus: jest.fn(async () => ({ status: 'applying' as const, version: 3 })),
      persistMutationReceipt: jest.fn(async () => ({ id: 'receipt-1' })), finalizeMutationReceipt: jest.fn(async () => ({})),
      failMutationReceipt: jest.fn(async () => ({})) };
    const listActions = { compile: jest.fn(async () => ({ groceryListId: 'list-1', revision: 1, replayed: false })),
      addItem: jest.fn(), updateItem: jest.fn(), setItemState: jest.fn() };
    await executeGroceryProposalDecision({ proposal: groceryProposal, action: 'approve', repository: repository as never,
      listActions: listActions as never });
    expect(listActions.compile).toHaveBeenCalledWith({ requestId: 'request-1', confirmed: true,
      mealPlanId: 'plan-1', mealPlanVersion: 7 });
    expect(repository.finalizeMutationReceipt).toHaveBeenCalledWith('receipt-1', expect.objectContaining({
      resultingObjectType: 'grocery_list', resultingObjectId: 'list-1',
    }));
  });
});
