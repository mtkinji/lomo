import type { MoneyRepository } from '../../capabilities/money/data/moneyRepository';
import type { UnifiedChatMutationReceipt, UnifiedChatProposal } from './types';
import { executeMoneyCategoryProposalDecision } from './executeMoneyCategoryProposalDecision';

const renameProposal = {
  id: 'proposal-1', threadId: 'thread-1', runId: 'run-1', messageId: 'message-1',
  capabilityId: 'money', title: 'Rename Groceries', body: 'Groceries will become 🛒 Groceries.',
  status: 'pending', version: 1, createdAt: 'now', updatedAt: 'now',
  operation: {
    id: 'operation-1', proposalId: 'proposal-1', summary: 'Rename Groceries', idempotencyKey: 'key-1', sequence: 1,
    capabilityId: 'money', type: 'rename_money_category', targetId: 'category-uuid',
    payload: { name: '🛒 Groceries', expectedName: 'Groceries' },
  },
} satisfies UnifiedChatProposal;

describe('executeMoneyCategoryProposalDecision', () => {
  it('checks the authoritative current name, renames, and finalizes an undoable receipt', async () => {
    const repository = {
      decideProposal: jest.fn().mockResolvedValue({ id: 'proposal-1', status: 'approved', version: 2 }),
      transitionProposalStatus: jest.fn()
        .mockResolvedValueOnce({ status: 'applying', version: 3 })
        .mockResolvedValueOnce({ status: 'applied', version: 4 }),
      persistMutationReceipt: jest.fn().mockResolvedValue({ id: 'receipt-1' } as UnifiedChatMutationReceipt),
      finalizeMutationReceipt: jest.fn().mockResolvedValue({ id: 'receipt-1' } as UnifiedChatMutationReceipt),
    };
    const moneyRepository = {
      loadSnapshot: jest.fn().mockResolvedValue({
        categories: [{ id: 'groceries', sourceId: 'category-uuid', name: 'Groceries' }],
      }),
      renameCategory: jest.fn().mockResolvedValue({ confirmedAt: 'applied', categoryId: 'category-uuid', changes: { name: '🛒 Groceries' } }),
    } as unknown as MoneyRepository;

    await executeMoneyCategoryProposalDecision({
      proposal: renameProposal, action: 'approve', repository, moneyRepository,
      now: () => '2026-08-04T16:00:00.000Z',
    });

    expect(moneyRepository.renameCategory).toHaveBeenCalledWith('category-uuid', '🛒 Groceries');
    expect(repository.finalizeMutationReceipt).toHaveBeenCalledWith('receipt-1', expect.objectContaining({
      capabilityId: 'money', resultingObjectType: 'money_category', resultingObjectId: 'category-uuid',
      resultState: expect.objectContaining({ name: '🛒 Groceries', previousName: 'Groceries' }),
      undoOperation: { type: 'restore_money_category_name', categoryId: 'category-uuid', name: 'Groceries', expectedName: '🛒 Groceries' },
    }));
  });
});
