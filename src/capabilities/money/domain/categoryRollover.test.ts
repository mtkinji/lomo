import { projectCategoryRollover, validateRolloverPolicy } from './categoryRollover';
import type { MoneyTransaction } from '../data/moneySnapshot';

const policy = { startMonth: '2026-01', startingBalanceCents: 0, monthlyAmounts: { '2026-01': 40000 }, timeZone: 'America/Denver' };
const category = { id: 'household', sourceId: 'category-1', plannedCents: 40000 };
const transaction = (overrides: Partial<MoneyTransaction>): MoneyTransaction => ({
  id: 't', date: '2026-01-15', amountCents: 10000, direction: 'outflow', pending: false,
  categoryId: 'household', moneyMeaning: null, ...overrides,
} as MoneyTransaction);

describe('category rollover', () => {
  it('includes January through September when joining in October, then subtracts October spending once', () => {
    const result = projectCategoryRollover(category, policy, [transaction({ amountCents: 295000 }), transaction({ date: '2026-10-12', amountCents: 12000 })], '2026-10', 12000);
    expect(result).toEqual({ carriedInCents: 65000, availableCents: 93000 });
  });
  it('preserves a negative opening balance and overspending across months', () => {
    expect(projectCategoryRollover(category, { ...policy, startingBalanceCents: -5000 }, [transaction({ amountCents: 100000 })], '2026-02', 0))
      .toEqual({ carriedInCents: -65000, availableCents: -25000 });
  });
  it('does not rewrite old contributions when the current monthly amount changes', () => {
    expect(projectCategoryRollover({ ...category, plannedCents: 50000 }, { ...policy, monthlyAmounts: { '2026-01': 40000, '2026-03': 45000 } }, [], '2026-04', 0)?.availableCents).toBe(175000);
  });
  it('counts category credits and split plan coverage, excluding transfers and past pending charges', () => {
    const transactions = [
      transaction({ direction: 'inflow', moneyMeaning: 'category_credit', amountCents: 5000 }),
      transaction({ categoryId: null, amountCents: 20000, savedResourceCents: 10000, allocations: [{ categoryId: 'household', sourceCategoryId: 'category-1', amountCents: 10000 }, { categoryId: 'other', sourceCategoryId: 'other', amountCents: 10000 }] } as Partial<MoneyTransaction>),
      transaction({ moneyMeaning: 'transfer', amountCents: 900000 }),
      transaction({ pending: true, amountCents: 900000 }),
    ];
    expect(projectCategoryRollover(category, policy, transactions, '2026-02', 0)?.carriedInCents).toBe(40000);
  });
  it('does not project rollover before its start month', () => {
    expect(projectCategoryRollover(category, policy, [], '2025-12', 0)).toBeNull();
  });
  it.each([
    { ...policy, startMonth: '2026-13' }, { ...policy, startingBalanceCents: NaN },
    { ...policy, monthlyAmounts: {} }, { ...policy, monthlyAmounts: { '2026-01': -1 } },
    { ...policy, timeZone: 'not-a-zone' },
  ])('rejects malformed policy %j', (value) => expect(() => validateRolloverPolicy(value)).toThrow());
});

it('does not turn historical internal transfers or card repayments into category spending', () => {
  const transfers = [{ ...transaction({}), moneyMeaning: 'internal_transfer' }, transaction({ providerCategoryDetailed: 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT' })];
  expect(projectCategoryRollover(category, policy, transfers, '2026-02', 0)?.carriedInCents).toBe(40000);
});
