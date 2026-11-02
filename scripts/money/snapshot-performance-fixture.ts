import type { MoneySnapshotRows } from '../../src/capabilities/money/data/moneySnapshot';

/** Synthetic only: six accounts, 24 categories, two years of dated history. */
export function snapshotPerformanceFixture(count: number, ruleCount = 40, uniqueMerchants = false): MoneySnapshotRows {
  const categories = Array.from({ length: 24 }, (_, index) => ({
    id: `category-${index}`, slug: `category-${index}`, legacy_budget_id: null,
    name: `Category ${index}`, description: null, accent_color: null, sort_order: index,
  }));
  const rows: MoneySnapshotRows = {
    categories,
    plans: categories.map((category, index) => ({
      category_id: category.id, base_budget_cents: 20000 + index * 1000,
      rollover_enabled: index % 3 === 0, funding_rhythm: index % 4 === 0 ? 'reserve' : 'monthly',
      reserve_balance_cents: 50000, reserve_balance_period_id: '2025-01',
      rollover_policy: index % 3 === 0 ? {
        startMonth: '2025-01', startingBalanceCents: 10000,
        monthlyAmounts: { '2025-01': 20000 + index * 1000, '2026-07': 30000 }, timeZone: 'America/Denver',
      } : null,
    })),
    connections: [{ id: 'connection', institution_name: 'Synthetic Bank', status: 'healthy', last_synced_at: '2026-11-15T12:00:00Z' }],
    accounts: Array.from({ length: 6 }, (_, index) => ({
      id: `account-${index}`, connection_id: 'connection', name: `Account ${index}`,
      official_name: null, mask: `100${index}`, type: index < 3 ? 'depository' : 'credit',
      subtype: index < 3 ? 'checking' : 'credit card',
    })),
    rules: Array.from({ length: ruleCount }, (_, index) => ({
      id: `rule-${index}`, budget_id: `category-${index % 24}`,
      merchant_contains: `Synthetic vendor${index} store`,
      merchant_match_mode: index % 2 === 0 ? 'exact' : 'partial',
      label: `Rule ${index}`, created_from_transaction_id: null,
    })),
    transactions: [], allocations: [],
  };
  for (let index = 0; index < count; index += 1) {
    const date = new Date(Date.UTC(2026, 10, 15 - (index * 17 % 684))).toISOString().slice(0, 10);
    const split = index % 11 === 0;
    const credit = index % 13 === 0;
    const transfer = index % 19 === 0;
    rows.transactions.push({
      id: `transaction-${index}`, financial_account_id: `account-${index % 6}`,
      name: `Synthetic vendor${uniqueMerchants ? index : index % 80} store`, merchant_name: null,
      amount_cents: 1000 + index % 9000, direction: credit ? 'inflow' : 'outflow',
      date, pending: index % 29 === 0, iso_currency_code: 'USD',
      budget_id: split ? null : `category-${index % 24}`,
      money_meaning: transfer ? 'transfer' : credit ? 'category_credit' : null,
      saved_resource_cents: index % 7 === 0 ? 500 : 0,
    });
    if (split) {
      const amount = 1000 + index % 9000;
      rows.allocations!.push(
        { transaction_id: `transaction-${index}`, budget_id: `category-${index % 24}`, amount_cents: Math.floor(amount / 2) },
        { transaction_id: `transaction-${index}`, budget_id: `category-${(index + 1) % 24}`, amount_cents: amount - Math.floor(amount / 2) },
      );
    }
  }
  return rows;
}
