import { MoneyBudgetOutcomeUnknownError } from '../../capabilities/money/actions/moneyBudgetActionCommand';
import type { MoneySnapshot } from '../../capabilities/money/data/moneySnapshot';
import type { MoneyControlOperation } from './executeMoneyControlProposalDecision';
import { isMoneyControlOperationApplied, recoverMoneyControlMutations } from './recoverMoneyControlMutations';

const snapshot = {
  generatedAt: '2026-08-27T12:00:00.000Z',
  categories: [{ id: 'food', sourceId: 'category-food', plannedCents: 50000 }],
  transactions: [
    { id: 'transaction-1', moneyMeaning: 'not_counted', categoryId: null },
    { id: 'transaction-default', moneyMeaning: 'spending', categoryId: 'food', planRoleOverride: null },
    { id: 'one', moneyMeaning: 'transfer', transferPair: { counterpartTransactionId: 'two' } },
    { id: 'two', moneyMeaning: 'transfer', transferPair: { counterpartTransactionId: 'one' } },
  ],
  connections: [{ id: 'connection-1', status: 'disconnected' }],
} as unknown as MoneySnapshot;

const operation = <T extends MoneyControlOperation>(
  value: Omit<T, 'id' | 'idempotencyKey' | 'summary' | 'proposalId' | 'sequence'>,
): T => ({
  ...value, id: `money:${value.type}`, idempotencyKey: `request:${value.type}`,
  summary: value.type, proposalId: 'proposal-1', sequence: 1,
} as T);

test('recognizes already-applied Money state after a receipt finalization interruption', () => {
  expect(isMoneyControlOperationApplied(operation({
    capabilityId: 'money', type: 'update_money_budget', targetId: 'category-food', expectedUpdatedAt: 'old',
    payload: { month: '2026-08', plannedCents: 50000 },
  }), snapshot)).toBe(false);
  expect(isMoneyControlOperationApplied(operation({
    capabilityId: 'money', type: 'update_money_transaction_meaning', targetId: 'transaction-1', expectedUpdatedAt: 'old',
    payload: { meaning: 'not_counted' },
  }), snapshot)).toBe(true);
  expect(isMoneyControlOperationApplied(operation({
    capabilityId: 'money', type: 'update_money_transaction_plan_treatment', targetId: 'transaction-default', expectedUpdatedAt: 'old',
    payload: { treatment: 'default' },
  }), snapshot)).toBe(true);
  expect(isMoneyControlOperationApplied(operation({
    capabilityId: 'money', type: 'review_money_transfer', targetId: 'one:two', expectedUpdatedAt: 'old',
    payload: { decision: 'confirm_pair' },
  }), snapshot)).toBe(true);
  expect(isMoneyControlOperationApplied(operation({
    capabilityId: 'money', type: 'disconnect_money_connection', targetId: 'connection-1', expectedUpdatedAt: 'old', payload: {},
  }), snapshot)).toBe(true);
});

test('does not mistake divergent Money state for a completed write', () => {
  expect(isMoneyControlOperationApplied(operation({
    capabilityId: 'money', type: 'update_money_budget', targetId: 'category-food', expectedUpdatedAt: 'old',
    payload: { month: '2026-08', plannedCents: 60000 },
  }), snapshot)).toBe(false);
});

test.each(['confirmed', 'unknown', 'finalization'] as const)('recovers Budget from its request receipt (%s), never from matching state', async (mode) => {
  const budget = operation({ capabilityId: 'money', type: 'update_money_budget', targetId: 'category-food', expectedUpdatedAt: 'old', payload: { month: '2026-08', plannedCents: 50000 } });
  const aggregate = { thread: { id: 'thread' }, proposals: [{ id: 'proposal-1', capabilityId: 'money', status: 'applying', version: 3, operation: budget }], receipts: [{ id: 'receipt', proposalId: 'proposal-1', status: 'reserved' }] };
  const repository = { finalizeMutationReceipt: jest.fn().mockResolvedValue({}), failMutationReceipt: jest.fn(), transitionProposalStatus: jest.fn(), loadThread: jest.fn().mockResolvedValue(aggregate) };
  const loadSnapshot = jest.fn().mockResolvedValue(snapshot);
  const actions = { updateBudget: jest.fn().mockResolvedValue({ result: { plannedCents: 50000, updatedAt: 'receipt-version' } }) };
  if (mode === 'unknown') actions.updateBudget.mockRejectedValue(new MoneyBudgetOutcomeUnknownError());
  if (mode === 'finalization') repository.finalizeMutationReceipt.mockRejectedValue(new Error('offline'));
  await recoverMoneyControlMutations({ aggregate: aggregate as never, repository: repository as never, actions: actions as never, loadSnapshot });
  expect(loadSnapshot).not.toHaveBeenCalled();
  expect(actions.updateBudget).toHaveBeenCalledTimes(1);
  expect(repository.failMutationReceipt).not.toHaveBeenCalled();
  if (mode === 'confirmed') expect(repository.transitionProposalStatus).toHaveBeenCalledWith(expect.objectContaining({ toStatus: 'applied' }));
  else expect(repository.transitionProposalStatus).not.toHaveBeenCalled();
});

test.each(['money_native_authentication_required', 'Money Pro required'])('does not fail an earlier uncertain Budget save when recovery is unavailable: %s', async (message) => {
  const budget = operation({ capabilityId: 'money', type: 'update_money_budget', targetId: 'category-food', expectedUpdatedAt: 'old', payload: { month: '2026-08', plannedCents: 50000 } });
  const aggregate = { thread: { id: 'thread' }, proposals: [{ id: 'proposal-1', capabilityId: 'money', status: 'applying', version: 3, operation: budget }], receipts: [{ id: 'receipt', proposalId: 'proposal-1', status: 'reserved' }] };
  const repository = { finalizeMutationReceipt: jest.fn(), failMutationReceipt: jest.fn(), transitionProposalStatus: jest.fn(), loadThread: jest.fn() };
  await recoverMoneyControlMutations({ aggregate: aggregate as never, repository: repository as never,
    actions: { updateBudget: jest.fn().mockRejectedValue(new Error(message)) } as never, loadSnapshot: jest.fn() });
  expect(repository.failMutationReceipt).not.toHaveBeenCalled();
  expect(repository.transitionProposalStatus).not.toHaveBeenCalled();
});
