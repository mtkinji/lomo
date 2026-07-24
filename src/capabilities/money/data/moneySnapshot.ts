export type MoneyCategoryRow = {
  id: string;
  slug: string;
  legacy_budget_id: string | null;
  name: string;
  description: string | null;
  accent_color: string | null;
  sort_order: number;
};

export type MoneyPlanRow = {
  category_id: string;
  base_budget_cents: number;
  rollover_enabled: boolean;
};

export type MoneyConnectionRow = {
  id: string;
  institution_name: string;
  status: 'linked' | 'syncing' | 'healthy' | 'error';
  last_synced_at: string | null;
};

export type MoneyRuleRow = {
  id: string;
  budget_id: string;
  merchant_contains: string;
  merchant_match_mode: 'exact' | 'partial';
  label: string;
  created_from_transaction_id: string | null;
};

export type MoneyAccountRow = {
  id: string;
  connection_id: string;
  name: string;
  official_name: string | null;
  mask: string | null;
  type: string | null;
  subtype: string | null;
  budget_financial_connections?: Omit<MoneyConnectionRow, 'id'> | null;
};

export type MoneyTransactionRow = {
  id: string;
  financial_account_id: string | null;
  name: string;
  merchant_name: string | null;
  amount_cents: number;
  direction: 'inflow' | 'outflow';
  date: string;
  pending: boolean;
  iso_currency_code: string;
  budget_id: string | null;
  budget_match_source?: 'confirmed' | 'corrected' | 'excluded' | null;
  money_meaning: 'income' | 'category_credit' | 'transfer' | 'not_counted' | 'unknown' | null;
};

export type MoneyCategory = {
  id: string;
  sourceId: string;
  name: string;
  description: string | null;
  accentColor: string;
  plannedCents: number;
  spentCents: number;
  remainingCents: number;
  percentUsed: number;
  transactionCount: number;
  rolloverEnabled: boolean;
};

export type MoneyTransaction = {
  id: string;
  accountId: string | null;
  accountName: string;
  institutionName: string;
  merchantName: string;
  amountCents: number;
  direction: 'inflow' | 'outflow';
  date: string;
  pending: boolean;
  currencyCode: string;
  categoryId: string | null;
  categoryName: string;
  reviewState: 'assigned' | 'needs_review' | 'not_counted';
  merchantRuleCategoryId?: string | null;
  moneyMeaning: MoneyTransactionRow['money_meaning'];
};

export type MoneyAccount = {
  id: string;
  name: string;
  institutionName: string;
  mask: string | null;
  type: string | null;
  subtype: string | null;
  status: MoneyConnectionRow['status'];
  lastSyncedAt: string | null;
  transactionCount: number;
  latestTransactionDate: string | null;
};

export type MoneySnapshot = {
  periodLabel: string;
  generatedAt: string;
  lastSyncedAt: string | null;
  totals: {
    plannedCents: number;
    spentCents: number;
    remainingCents: number;
    needsReviewCount: number;
  };
  categories: MoneyCategory[];
  transactions: MoneyTransaction[];
  accounts: MoneyAccount[];
};

export type MoneySnapshotRows = {
  categories: MoneyCategoryRow[];
  plans: MoneyPlanRow[];
  connections: MoneyConnectionRow[];
  accounts: MoneyAccountRow[];
  rules?: MoneyRuleRow[];
  transactions: MoneyTransactionRow[];
};

const DEFAULT_ACCENT = '#315545';

export function projectMoneySnapshot(rows: MoneySnapshotRows, now = new Date()): MoneySnapshot {
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const periodLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const planByCategoryId = new Map(rows.plans.map((plan) => [plan.category_id, plan]));
  const categoryByAlias = new Map<string, MoneyCategoryRow>();

  rows.categories.forEach((category) => {
    categoryByAlias.set(category.id, category);
    categoryByAlias.set(category.slug, category);
    if (category.legacy_budget_id) categoryByAlias.set(category.legacy_budget_id, category);
  });

  const accountById = new Map(rows.accounts.map((account) => [account.id, account]));
  const currentTransactions = rows.transactions.filter((transaction) => transaction.date.startsWith(monthKey));
  const transactions = rows.transactions
    .map((transaction) => projectTransaction(transaction, accountById, categoryByAlias, rows.rules ?? []))
    .sort((left, right) => right.date.localeCompare(left.date));

  const categories = rows.categories
    .slice()
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((category): MoneyCategory => {
      const plan = planByCategoryId.get(category.id);
      const categoryTransactions = currentTransactions.filter(
        (transaction) => transaction.budget_id != null && categoryByAlias.get(transaction.budget_id)?.id === category.id,
      );
      const outflowCents = categoryTransactions
        .filter(isCountedOutflow)
        .reduce((sum, transaction) => sum + validCents(transaction.amount_cents), 0);
      const creditCents = categoryTransactions
        .filter((transaction) => !transaction.pending && transaction.direction === 'inflow' && transaction.money_meaning === 'category_credit')
        .reduce((sum, transaction) => sum + validCents(transaction.amount_cents), 0);
      const spentCents = Math.max(0, outflowCents - creditCents);
      const plannedCents = validCents(plan?.base_budget_cents ?? 0);

      return {
        id: category.legacy_budget_id?.trim() || category.slug,
        sourceId: category.id,
        name: category.name.trim() || category.slug,
        description: category.description?.trim() || null,
        accentColor: category.accent_color?.trim() || DEFAULT_ACCENT,
        plannedCents,
        spentCents,
        remainingCents: plannedCents - spentCents,
        percentUsed: plannedCents > 0 ? Math.round((spentCents / plannedCents) * 100) : 0,
        transactionCount: categoryTransactions.length,
        rolloverEnabled: plan?.rollover_enabled === true,
      };
    });

  const accountTransactions = new Map<string, MoneyTransactionRow[]>();
  rows.transactions.forEach((transaction) => {
    if (!transaction.financial_account_id) return;
    const existing = accountTransactions.get(transaction.financial_account_id) ?? [];
    existing.push(transaction);
    accountTransactions.set(transaction.financial_account_id, existing);
  });

  const accounts = rows.accounts.map((account): MoneyAccount => {
    const activity = accountTransactions.get(account.id) ?? [];
    const connection = normalizeConnection(account.budget_financial_connections);
    const newest = activity.reduce<string | null>(
      (latest, transaction) => (!latest || transaction.date > latest ? transaction.date : latest),
      null,
    );
    return {
      id: account.id,
      name: account.official_name?.trim() || account.name.trim() || 'Linked account',
      institutionName: connection?.institution_name?.trim() || 'Linked institution',
      mask: account.mask?.trim() || null,
      type: account.type,
      subtype: account.subtype,
      status: connection?.status ?? 'linked',
      lastSyncedAt: connection?.last_synced_at ?? null,
      transactionCount: activity.length,
      latestTransactionDate: newest,
    };
  });

  const plannedCents = categories.reduce((sum, category) => sum + category.plannedCents, 0);
  const spentCents = categories.reduce((sum, category) => sum + category.spentCents, 0);
  const needsReviewCount = currentTransactions.filter(
    (transaction) => reviewStateFor(transaction, categoryByAlias) === 'needs_review',
  ).length;

  return {
    periodLabel,
    generatedAt: now.toISOString(),
    lastSyncedAt: getMostRecentSync(rows.connections, accounts),
    totals: {
      plannedCents,
      spentCents,
      remainingCents: plannedCents - spentCents,
      needsReviewCount,
    },
    categories,
    transactions,
    accounts,
  };
}

function projectTransaction(
  transaction: MoneyTransactionRow,
  accounts: Map<string, MoneyAccountRow>,
  categories: Map<string, MoneyCategoryRow>,
  rules: MoneyRuleRow[],
): MoneyTransaction {
  const account = transaction.financial_account_id ? accounts.get(transaction.financial_account_id) : undefined;
  const connection = normalizeConnection(account?.budget_financial_connections);
  const category = transaction.budget_id ? categories.get(transaction.budget_id) : undefined;
  const reviewState = reviewStateFor(transaction, categories);
  const merchantRule = rules.find((rule) => merchantRuleMatches(rule, transaction.merchant_name?.trim() || transaction.name));
  const merchantRuleCategory = merchantRule ? categories.get(merchantRule.budget_id) : undefined;

  return {
    id: transaction.id,
    accountId: transaction.financial_account_id,
    accountName: account?.official_name?.trim() || account?.name.trim() || 'Unknown account',
    institutionName: connection?.institution_name?.trim() || 'Linked institution',
    merchantName: transaction.merchant_name?.trim() || transaction.name.trim() || 'Transaction',
    amountCents: validCents(transaction.amount_cents),
    direction: transaction.direction,
    date: transaction.date,
    pending: transaction.pending,
    currencyCode: transaction.iso_currency_code || 'USD',
    categoryId: category ? category.legacy_budget_id?.trim() || category.slug : null,
    categoryName: category?.name.trim()
      || (reviewState === 'not_counted' ? 'Not counted' : transaction.direction === 'inflow' ? 'Income or transfer' : 'Needs review'),
    reviewState,
    merchantRuleCategoryId: merchantRuleCategory
      ? merchantRuleCategory.legacy_budget_id?.trim() || merchantRuleCategory.slug
      : null,
    moneyMeaning: transaction.money_meaning,
  };
}

function merchantRuleMatches(rule: MoneyRuleRow, merchantName: string): boolean {
  if (rule.merchant_match_mode === 'exact') {
    return normalizeMerchant(rule.merchant_contains) === normalizeMerchant(merchantName);
  }
  const ruleKey = partialMerchantKey(rule.merchant_contains);
  const merchantKey = partialMerchantKey(merchantName);
  return Boolean(ruleKey && merchantKey && merchantKey.includes(ruleKey));
}

function normalizeMerchant(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

const GENERIC_MERCHANT_WORDS = new Set(['co', 'company', 'food', 'foods', 'inc', 'llc', 'market', 'marketplace', 'mktpl', 'store', 'the']);

function partialMerchantKey(value: string): string {
  return normalizeMerchant(value)
    .split(' ')
    .filter((word) => word && !/^[0-9]+$/.test(word) && !GENERIC_MERCHANT_WORDS.has(word))
    .slice(0, 2)
    .join(' ');
}

function reviewStateFor(
  transaction: MoneyTransactionRow,
  categories: Map<string, MoneyCategoryRow>,
): MoneyTransaction['reviewState'] {
  if (transaction.budget_match_source === 'excluded' || transaction.money_meaning === 'not_counted') return 'not_counted';
  if (transaction.budget_id && categories.has(transaction.budget_id)) return 'assigned';
  return isCountedOutflow(transaction) ? 'needs_review' : 'not_counted';
}

function normalizeConnection(connection: MoneyAccountRow['budget_financial_connections']) {
  return Array.isArray(connection) ? connection[0] ?? null : connection ?? null;
}

function isCountedOutflow(transaction: MoneyTransactionRow): boolean {
  return (
    !transaction.pending &&
    transaction.direction === 'outflow' &&
    transaction.money_meaning !== 'transfer' &&
    transaction.money_meaning !== 'not_counted'
  );
}

function validCents(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function getMostRecentSync(connections: MoneyConnectionRow[], accounts: MoneyAccount[]): string | null {
  const values = [
    ...connections.map((connection) => connection.last_synced_at),
    ...accounts.map((account) => account.lastSyncedAt),
  ].filter((value): value is string => Boolean(value && Number.isFinite(Date.parse(value))));
  return values.sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null;
}

export function formatMoney(cents: number, currencyCode = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: Math.abs(cents) % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function formatMoneyFreshness(lastSyncedAt: string | null, now = new Date()): string {
  if (!lastSyncedAt || !Number.isFinite(Date.parse(lastSyncedAt))) return 'Not synced yet';
  const minutes = Math.max(0, Math.round((now.getTime() - Date.parse(lastSyncedAt)) / 60_000));
  if (minutes < 2) return 'Updated just now';
  if (minutes < 60) return `Updated ${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Updated ${hours} hr ago`;
  if (hours < 48) return 'Updated yesterday';
  return `Updated ${Math.round(hours / 24)} days ago`;
}
