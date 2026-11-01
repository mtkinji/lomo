import { projectMoneySnapshot, type MoneyRuleRow, type MoneySnapshotRows } from './moneySnapshot';

const now = new Date(2026, 10, 15, 12);
function rule(text: string, mode: 'exact' | 'partial', budgetId = 'first'): MoneyRuleRow {
  return { id: text, budget_id: budgetId, merchant_contains: text, merchant_match_mode: mode,
    label: text, created_from_transaction_id: null };
}
function fixture(rules: MoneyRuleRow[], merchants: string[]): MoneySnapshotRows {
  return { rules, plans: [], accounts: [], connections: [],
    categories: ['first', 'second'].map((id, sort_order) => ({
      id, slug: id, legacy_budget_id: null, name: id, description: null, accent_color: null, sort_order,
    })),
    transactions: merchants.map((name, index) => ({
      id: `${index}`, name, merchant_name: null, financial_account_id: null,
      amount_cents: 1000, direction: 'outflow', date: '2026-11-12', pending: false,
      iso_currency_code: 'USD', budget_id: null, money_meaning: null,
    })),
  };
}

it('does not repeatedly prepare each merchant rule for every transaction in a large history', () => {
  const readRuleText = jest.fn(() => 'Not a match');
  const repeatedRule = rule('unused', 'partial');
  Object.defineProperty(repeatedRule, 'merchant_contains', { get: readRuleText });
  const rows = fixture([repeatedRule], Array.from({ length: 4000 }, (_, index) => `Merchant ${index}`));
  expect(projectMoneySnapshot(rows, now).transactions).toHaveLength(4000);
  expect(readRuleText).toHaveBeenCalledTimes(1);
});

it.each([
  ['exact case and punctuation', [rule('costco 01234', 'exact')], 'COSTCO #01234', 'first'],
  ['exact retains store number', [rule('costco 01234', 'exact')], 'COSTCO #05678', null],
  ['partial removes generic words and numbers', [rule('The Whole Foods Market 44', 'partial')], 'WHOLE FOODS #800', 'first'],
  ['partial uses first two meaningful words', [rule('Blue River Grocery', 'partial')], 'Blue River Outlet', 'first'],
  ['partial matches substrings', [rule('art', 'partial')], 'Cart Supplies', 'first'],
  ['generic partial matches nothing', [rule('The Store 123 LLC', 'partial')], 'The Store', null],
  ['empty exact preserves historical behavior', [rule('', 'exact')], '!!!', 'first'],
  ['earlier partial beats later exact', [rule('costco', 'partial'), rule('costco 123', 'exact', 'second')], 'Costco #123', 'first'],
  ['earlier exact beats later partial', [rule('costco 123', 'exact', 'second'), rule('costco', 'partial')], 'Costco #123', 'second'],
  ['missing category stops at the first rule', [rule('costco', 'partial', 'deleted'), rule('costco 123', 'exact')], 'Costco #123', null],
] as const)('preserves %s', (_description, rules, merchant, expected) => {
  expect(projectMoneySnapshot(fixture([...rules], [merchant]), now).transactions[0].merchantRuleCategoryId).toBe(expected);
});

it('refreshes matching and unmatched merchants when the next snapshot changes rules', () => {
  const merchants = ['Costco 123', 'Costco 123', 'Neighborhood shop'];
  const first = projectMoneySnapshot(fixture([rule('costco', 'partial')], merchants), now);
  const second = projectMoneySnapshot(fixture([
    rule('costco', 'partial', 'second'), rule('neighborhood', 'partial'),
  ], merchants), now);
  expect(first.transactions.map((row) => row.merchantRuleCategoryId)).toEqual(['first', 'first', null]);
  expect(second.transactions.map((row) => row.merchantRuleCategoryId)).toEqual(['second', 'second', 'first']);
});
