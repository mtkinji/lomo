import {
  projectMoneySnapshot,
  type MoneyCategoryRow,
  type MoneyPlanRow,
  type MoneySnapshot,
  type MoneyTransactionRow,
} from '../data/moneySnapshot';

const categories: Array<MoneyCategoryRow & { plannedCents: number; role: 'protected' | 'flexible' }> = [
  category('housing', 'Housing', 260_000, 'protected', 0),
  category('utilities', 'Utilities', 52_000, 'protected', 1),
  category('insurance', 'Insurance', 46_000, 'protected', 2),
  category('transportation', 'Transportation', 68_000, 'protected', 3),
  category('subscriptions', 'Subscriptions', 52_000, 'protected', 4),
  category('groceries', 'Groceries', 72_000, 'flexible', 5),
  category('dining', 'Dining out', 22_000, 'flexible', 6),
  category('shopping', 'Shopping', 18_000, 'flexible', 7),
  category('entertainment', 'Entertainment', 9_500, 'flexible', 8),
  category('personal', 'Personal', 18_000, 'flexible', 9),
];

export function buildMoneyOnboardingDemoBudget(now = new Date()): MoneySnapshot {
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const syncedAt = now.toISOString();
  const plans: MoneyPlanRow[] = categories.map(({ id, plannedCents, role }) => ({
    category_id: id,
    base_budget_cents: plannedCents,
    rollover_enabled: false,
    plan_role: role,
  }));
  const transactions: MoneyTransactionRow[] = [
    transaction('rent', 'housing', 'Property Management', 260_000, `${month}-01`),
    transaction('electric', 'utilities', 'City Utilities', 21_600, `${month}-06`),
    transaction('insurance', 'insurance', 'Home & Auto Insurance', 38_400, `${month}-03`),
    transaction('fuel', 'transportation', 'Neighborhood Fuel', 19_800, `${month}-12`),
    transaction('streaming', 'subscriptions', 'Streaming Services', 7_900, `${month}-08`),
    transaction('market', 'groceries', 'Neighborhood Market', 43_250, `${month}-16`),
    transaction('restaurant', 'dining', 'Corner Restaurant', 12_800, `${month}-15`),
    transaction('retail', 'shopping', 'Online Marketplace', 8_650, `${month}-11`),
    transaction('movies', 'entertainment', 'Cinema', 4_200, `${month}-09`),
    transaction('personal', 'personal', 'Pharmacy', 6_100, `${month}-14`),
  ];
  const snapshot = projectMoneySnapshot({
    categories,
    plans,
    connections: [{ id: 'demo-connection', institution_name: 'Chase', status: 'healthy', last_synced_at: syncedAt }],
    accounts: [
      account('demo-checking', 'Total Checking', '1842', 'depository', 'checking', syncedAt),
      account('demo-savings', 'Premier Savings', '6031', 'depository', 'savings', syncedAt),
      account('demo-card', 'Freedom Unlimited', '7719', 'credit', 'credit card', syncedAt),
    ],
    transactions,
  }, now);
  const flexibleSpentCents = snapshot.categories
    .filter((item) => item.planRole !== 'protected')
    .reduce((sum, item) => sum + item.spentCents, 0);

  return {
    ...snapshot,
    monthlyPlan: {
      periodId: month,
      regularPlanCents: 617_500,
      committedPlanCents: 478_000,
      flexiblePlanCents: 139_500,
      additionCents: 0,
      plannedOutflowCents: 617_500,
      derivation: 'user_set',
    },
    livingLimitAnswer: {
      state: 'supported',
      headlineAmountCents: 139_500 - flexibleSpentCents,
      limitLine: { livingPercent: 65, livingLimitCents: 617_500 },
      qualification: null,
      recoveryAction: null,
      reviewTransactionIds: [],
      facts: {
        periodId: month,
        planVersionId: 'money-onboarding-demo-v1',
        policyVersion: 'money-plan-limit-v3',
        resourceBasisCents: 950_000,
        resourceBasisKind: 'detected_income',
        resourceBasisUpdatedAtIso: syncedAt,
        livingPercent: 65,
        livingLimitCents: 617_500,
        protectedPlanCents: 478_000,
        protectedOverageCents: 0,
        flexibleCapacityCents: 139_500,
        countedFlexibleSpendCents: flexibleSpentCents,
        flexibleRoomCents: 139_500 - flexibleSpentCents,
        flexibleRoomLowCents: 139_500 - flexibleSpentCents,
        flexibleRoomHighCents: 139_500 - flexibleSpentCents,
        unresolvedInScopeCents: 0,
        plannedCents: 617_500,
        unassignedCents: 0,
        overLimitCents: 0,
        freshness: 'fresh',
        confidence: 'supported',
        qualificationReason: null,
      },
    },
  };
}

function category(slug: string, name: string, plannedCents: number, role: 'protected' | 'flexible', sortOrder: number) {
  return {
    id: `demo-${slug}`,
    slug,
    legacy_budget_id: null,
    name,
    description: null,
    accent_color: '#9A7A45',
    sort_order: sortOrder,
    mapping_tags: [],
    plannedCents,
    role,
  };
}

function transaction(id: string, categorySlug: string, merchant: string, amountCents: number, date: string): MoneyTransactionRow {
  return {
    id: `demo-${id}`,
    financial_account_id: id === 'market' || id === 'restaurant' || id === 'retail' || id === 'movies'
      ? 'demo-card'
      : 'demo-checking',
    name: merchant,
    merchant_name: merchant,
    amount_cents: amountCents,
    direction: 'outflow',
    date,
    pending: false,
    iso_currency_code: 'USD',
    budget_id: `demo-${categorySlug}`,
    budget_match_source: 'confirmed',
    money_meaning: null,
  };
}

function account(id: string, name: string, mask: string, type: string, subtype: string, syncedAt: string) {
  return {
    id,
    connection_id: 'demo-connection',
    name,
    official_name: name,
    mask,
    type,
    subtype,
    budget_financial_connections: {
      institution_name: 'Chase',
      status: 'healthy' as const,
      last_synced_at: syncedAt,
    },
  };
}
