import type { UnifiedChatMutationReceipt } from './types';
import {
  executeMoneyControlProposalDecision,
  type MoneyControlProposal,
} from './executeMoneyControlProposalDecision';

const proposal = {
  id: 'proposal-1', threadId: 'thread-1', runId: 'run-1', messageId: 'message-1',
  capabilityId: 'money', title: 'Update Groceries', body: 'Change the monthly amount.',
  status: 'pending', version: 1, createdAt: 'now', updatedAt: 'now',
  operation: {
    id: 'operation-1', proposalId: 'proposal-1', summary: 'Update Groceries',
    idempotencyKey: 'money-budget-1', sequence: 1, capabilityId: 'money',
    type: 'update_money_budget', targetId: 'category-groceries', expectedUpdatedAt: 'budget-v1',
    payload: { month: '2026-08', plannedCents: 55_000 },
  },
} as MoneyControlProposal;

function repository() {
  return {
    decideProposal: jest.fn(async () => ({ id: 'proposal-1', status: 'approved' as const, version: 2 })),
    transitionProposalStatus: jest.fn()
      .mockResolvedValueOnce({ status: 'applying', version: 3 })
      .mockResolvedValueOnce({ status: 'applied', version: 4 }),
    persistMutationReceipt: jest.fn(async () => ({ id: 'receipt-1' } as UnifiedChatMutationReceipt)),
    finalizeMutationReceipt: jest.fn(async () => ({ id: 'receipt-1' } as UnifiedChatMutationReceipt)),
    failMutationReceipt: jest.fn(async () => ({ id: 'receipt-1' } as UnifiedChatMutationReceipt)),
  };
}

describe('executeMoneyControlProposalDecision', () => {
  it('reserves, applies the exact authenticated action, and finalizes its receipt', async () => {
    const repo = repository();
    const actions = {
      updateBudget: jest.fn(async () => ({ result: {
        categoryId: 'category-groceries', previousPlannedCents: 50_000,
        plannedCents: 55_000, updatedAt: 'budget-v2',
      } })),
    };
    await executeMoneyControlProposalDecision({
      proposal, action: 'approve', repository: repo, actions: actions as never,
      now: () => '2026-08-27T13:00:00.000Z',
    });
    expect(actions.updateBudget).toHaveBeenCalledWith({
      requestId: 'money-budget-1', confirmed: true, categoryId: 'category-groceries',
      expectedUpdatedAt: 'budget-v1', month: '2026-08', plannedCents: 55_000,
    });
    expect(repo.persistMutationReceipt).toHaveBeenCalledWith(expect.objectContaining({
      status: 'reserved', resultingObjectType: 'money_category', resultingObjectId: 'category-groceries',
    }));
    expect(repo.finalizeMutationReceipt).toHaveBeenCalledWith('receipt-1', expect.objectContaining({
      resultState: expect.objectContaining({ plannedCents: 55_000, updatedAt: 'budget-v2' }),
    }));
  });

  it('records an authentication failure as failed instead of applied', async () => {
    const repo = repository();
    const actions = { updateBudget: jest.fn(async () => { throw new Error('money_native_authentication_required'); }) };
    await expect(executeMoneyControlProposalDecision({
      proposal, action: 'approve', repository: repo, actions: actions as never,
    })).rejects.toThrow('money_native_authentication_required');
    expect(repo.failMutationReceipt).toHaveBeenCalledWith(
      'receipt-1', 'money_native_authentication_required', 'Kwilt could not confirm the Money change.',
    );
    expect(repo.transitionProposalStatus).toHaveBeenLastCalledWith(expect.objectContaining({ toStatus: 'failed' }));
  });
});
