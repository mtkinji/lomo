import type { MoneySnapshot } from '../../capabilities/money/data/moneySnapshot';
import type { MoneyControlOperation } from './executeMoneyControlProposalDecision';
import { isMoneyControlOperationApplied } from './recoverMoneyControlMutations';

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
  }), snapshot)).toBe(true);
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
