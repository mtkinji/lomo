import {
  projectCategoryForecast,
  type MoneyCategoryForecast,
  type MoneyForecastConfidence,
  type MoneyForecastMode,
} from '../domain/moneyForecast';
import { buildTransactionAllocationPlan } from '../domain/transactionAllocation';
import { parseMoneyCategoryCover, type MoneyCategoryCover } from '../domain/moneyCategoryCover';
import {
  projectCategoryFunding,
  projectReserveAvailabilityFromAnchor,
  type CategoryExpectedNeed,
  type CategoryFundingCoverage,
  type CategoryFundingRhythm,
} from '../domain/categoryFunding';
import type { MoneyPlanLimitAnswer } from '../domain/moneyPlanLimitAnswer';

export type MoneyCategoryRow = {
  id: string;
  slug: string;
  legacy_budget_id: string | null;
  name: string;
  description: string | null;
  accent_color: string | null;
  cover_image?: unknown | null;
  sort_order: number;
};

export type MoneyPlanRow = {
  category_id: string;
  base_budget_cents: number;
  rollover_enabled: boolean;
  forecast_mode?: MoneyForecastMode | null;
  manual_projected_spend_cents?: number | null;
  scheduled_amount_cents?: number | null;
  scheduled_due_day?: number | null;
  funding_rhythm?: CategoryFundingRhythm | null;
  funding_policy_version?: string | null;
  starter_weight?: number | null;
  reserve_balance_cents?: number | null;
  reserve_balance_period_id?: string | null;
  expected_need_cents?: number | null;
  expected_need_due_month?: string | null;
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
  original_description?: string | null;
  authorized_date?: string | null;
  amount_cents: number;
  direction: 'inflow' | 'outflow';
  date: string;
  pending: boolean;
  iso_currency_code: string;
  budget_id: string | null;
  budget_match_source?: 'confirmed' | 'corrected' | 'excluded' | 'merchant_rule' | null;
  budget_assignment_source?: 'provider_policy' | 'merchant_rule' | null;
  budget_assignment_policy_version?: string | null;
  budget_assignment_governed?: boolean | null;
  money_meaning: 'income' | 'category_credit' | 'transfer' | 'not_counted' | 'unknown' | null;
  personal_finance_category_primary?: string | null;
  personal_finance_category_detailed?: string | null;
  personal_finance_category_confidence?: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN' | null;
};

export type MoneyTransactionAllocationRow = {
  transaction_id: string;
  budget_id: string;
  amount_cents: number;
};

export type MoneyTransactionAllocation = {
  categoryId: string;
  sourceCategoryId: string;
  categoryName: string;
  amountCents: number;
};

export type MoneyCategory = {
  id: string;
  sourceId: string;
  name: string;
  description: string | null;
  accentColor: string;
  coverImage?: MoneyCategoryCover | null;
  plannedCents: number;
  spentCents: number;
  remainingCents: number;
  percentUsed: number;
  transactionCount: number;
  rolloverEnabled: boolean;
  fundingRhythm: CategoryFundingRhythm;
  fundingPolicyVersion: string | null;
  starterWeight: number;
  monthlyContributionCents: number;
  reserveAvailableCents: number;
  reserveBalanceCents: number;
  reserveBalancePeriodId: string | null;
  reserveAvailabilityKnown: boolean;
  expectedNeed: CategoryExpectedNeed | null;
  fundingCoverage: CategoryFundingCoverage;
  forecastSettings?: {
    mode: MoneyForecastMode;
    manualProjectedSpendCents: number | null;
    scheduledAmountCents: number | null;
    scheduledDueDay: number | null;
  };
  forecast: MoneyCategoryForecast;
  planRole?: 'protected' | 'flexible';
};

export type MoneyTransaction = {
  id: string;
  accountId: string | null;
  accountName: string;
  institutionName: string;
  originalDescription?: string;
  authorizedDate?: string | null;
  accountMask?: string | null;
  accountType?: string | null;
  accountSubtype?: string | null;
  providerCategoryPrimary?: string | null;
  providerCategoryDetailed?: string | null;
  providerCategoryConfidence?: MoneyTransactionRow['personal_finance_category_confidence'];
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
  assignmentSource?: MoneyTransactionRow['budget_assignment_source'];
  assignmentPolicyVersion?: string | null;
  assignmentGoverned?: boolean;
  moneyMeaning: MoneyTransactionRow['money_meaning'];
  allocations?: MoneyTransactionAllocation[];
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
  forecast: {
    projectedSpendCents: number;
    projectionRangeLowCents: number;
    projectionRangeHighCents: number;
    projectedRemainingCents: number;
    projectedOverageCents: number;
    confidence: MoneyForecastConfidence;
    atRiskCategoryCount: number;
  };
  outsidePlan: {
    spentCents: number;
    transactionCount: number;
  };
  categories: MoneyCategory[];
  transactions: MoneyTransaction[];
  accounts: MoneyAccount[];
  livingLimitAnswer?: MoneyPlanLimitAnswer | null;
};

export type MoneySnapshotRows = {
  categories: MoneyCategoryRow[];
  plans: MoneyPlanRow[];
  connections: MoneyConnectionRow[];
  accounts: MoneyAccountRow[];
  rules?: MoneyRuleRow[];
  allocations?: MoneyTransactionAllocationRow[];
  transactions: MoneyTransactionRow[];
};

const DEFAULT_ACCENT = '#315545';

export function projectMoneySnapshot(rows: MoneySnapshotRows, now = new Date()): MoneySnapshot {
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const todayIso = toLocalDay(now);
  const periodStartIso = `${monthKey}-01`;
  const periodEndIso = toLocalDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const periodLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const planByCategoryId = new Map(rows.plans.map((plan) => [plan.category_id, plan]));
  const categoryByAlias = new Map<string, MoneyCategoryRow>();

  rows.categories.forEach((category) => {
    categoryByAlias.set(category.id, category);
    categoryByAlias.set(category.slug, category);
    if (category.legacy_budget_id) categoryByAlias.set(category.legacy_budget_id, category);
  });

  const allocationsByTransactionId = buildValidAllocationsByTransactionId(
    rows.transactions,
    rows.allocations ?? [],
    categoryByAlias,
  );

  const accountById = new Map(rows.accounts.map((account) => [account.id, account]));
  const currentTransactions = rows.transactions.filter((transaction) => transaction.date.startsWith(monthKey));
  const transactions = rows.transactions
    .map((transaction) => projectTransaction(
      transaction,
      accountById,
      categoryByAlias,
      rows.rules ?? [],
      allocationsByTransactionId.get(transaction.id),
    ))
    .sort((left, right) => right.date.localeCompare(left.date));

  const categories = rows.categories
    .slice()
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((category): MoneyCategory => {
      const plan = planByCategoryId.get(category.id);
      const categoryTransactions = currentTransactions.filter(
        (transaction) => transaction.budget_id != null && categoryByAlias.get(transaction.budget_id)?.id === category.id,
      );
      const allocatedTransactions = currentTransactions.flatMap((transaction) => {
        const allocation = allocationsByTransactionId.get(transaction.id)
          ?.find((candidate) => candidate.sourceCategoryId === category.id);
        return allocation ? [{ transaction, amountCents: allocation.amountCents }] : [];
      });
      const outflowCents = categoryTransactions
        .filter(isCountedOutflow)
        .reduce((sum, transaction) => sum + validCents(transaction.amount_cents), 0)
        + allocatedTransactions.reduce((sum, allocation) => sum + allocation.amountCents, 0);
      const creditCents = categoryTransactions
        .filter((transaction) => !transaction.pending && transaction.direction === 'inflow' && transaction.money_meaning === 'category_credit')
        .reduce((sum, transaction) => sum + validCents(transaction.amount_cents), 0);
      const spentCents = Math.max(0, outflowCents - creditCents);
      const plannedCents = validCents(plan?.base_budget_cents ?? 0);
      const fundingRhythm: CategoryFundingRhythm = plan?.funding_rhythm === 'reserve' ? 'reserve' : 'monthly';
      const expectedNeed = plan?.expected_need_cents != null && plan.expected_need_due_month
        ? { amountCents: validCents(plan.expected_need_cents), dueMonth: plan.expected_need_due_month }
        : null;
      const reserveBalanceCents = validCents(plan?.reserve_balance_cents ?? 0);
      const reserveBalancePeriodId = validPeriodId(plan?.reserve_balance_period_id)
        ? plan!.reserve_balance_period_id!
        : monthKey;
      const countedSpendSinceAnchorCents = fundingRhythm === 'reserve'
        ? countedCategorySpendBetween({
            transactions: rows.transactions,
            allocationsByTransactionId,
            categoryByAlias,
            categoryId: category.id,
            startPeriodId: reserveBalancePeriodId,
            endPeriodId: monthKey,
          })
        : spentCents;
      const projectedReserveAvailable = fundingRhythm === 'reserve'
        ? projectReserveAvailabilityFromAnchor({
            anchorPeriodId: reserveBalancePeriodId,
            anchorBalanceCents: reserveBalanceCents,
            targetPeriodId: monthKey,
            monthlyContributionCents: plannedCents,
            countedSpendSinceAnchorCents,
          })
        : null;
      const funding = projectCategoryFunding({
        rhythm: fundingRhythm,
        monthlyContributionCents: plannedCents,
        priorReserveCents: projectedReserveAvailable == null
          ? 0
          : projectedReserveAvailable - plannedCents + spentCents,
        countedSpendCents: spentCents,
        periodId: monthKey,
        expectedNeed,
      });
      const forecast = projectCategoryForecast({
        periodStartIso,
        periodEndIso,
        todayIso,
        plannedCents,
        spentCents,
        mode: plan?.forecast_mode,
        manualProjectedSpendCents: plan?.manual_projected_spend_cents,
        scheduledAmountCents: plan?.scheduled_amount_cents,
        scheduledDueDay: plan?.scheduled_due_day,
        fundingRhythm,
        reserveAvailableCents: funding.availableCents,
        fundingCoverage: funding.coverage,
      });

      return {
        id: category.legacy_budget_id?.trim() || category.slug,
        sourceId: category.id,
        name: category.name.trim() || category.slug,
        description: category.description?.trim() || null,
        accentColor: category.accent_color?.trim() || DEFAULT_ACCENT,
        coverImage: parseMoneyCategoryCover(category.cover_image),
        plannedCents,
        spentCents,
        remainingCents: funding.availableCents,
        percentUsed: plannedCents > 0 ? Math.round((spentCents / plannedCents) * 100) : 0,
        transactionCount: new Set([
          ...categoryTransactions.map((transaction) => transaction.id),
          ...allocatedTransactions.map(({ transaction }) => transaction.id),
        ]).size,
        rolloverEnabled: fundingRhythm === 'monthly' && plan?.rollover_enabled === true,
        fundingRhythm,
        fundingPolicyVersion: plan?.funding_policy_version ?? null,
        starterWeight: validWeight(plan?.starter_weight ?? 0),
        monthlyContributionCents: plannedCents,
        reserveAvailableCents: fundingRhythm === 'reserve' ? funding.availableCents : 0,
        reserveBalanceCents,
        reserveBalancePeriodId: fundingRhythm === 'reserve' ? reserveBalancePeriodId : null,
        reserveAvailabilityKnown: true,
        expectedNeed,
        fundingCoverage: funding.coverage,
        forecastSettings: {
          mode: plan?.forecast_mode ?? 'paced',
          manualProjectedSpendCents: plan?.manual_projected_spend_cents ?? null,
          scheduledAmountCents: plan?.scheduled_amount_cents ?? null,
          scheduledDueDay: plan?.scheduled_due_day ?? null,
        },
        forecast,
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
    (transaction) => reviewStateFor(
      transaction,
      categoryByAlias,
      allocationsByTransactionId.get(transaction.id),
    ) === 'needs_review',
  ).length;
  const outsidePlanTransactions = currentTransactions.filter(
    (transaction) => isCountedOutflow(transaction)
      && !allocationsByTransactionId.has(transaction.id)
      && (!transaction.budget_id || !categoryByAlias.has(transaction.budget_id)),
  );
  const projectedSpendCents = categories.reduce((sum, category) => sum + category.forecast.projectedSpendCents, 0);
  const projectionRangeLowCents = categories.reduce((sum, category) => sum + category.forecast.projectionRangeLowCents, 0);
  const projectionRangeHighCents = categories.reduce((sum, category) => sum + category.forecast.projectionRangeHighCents, 0);
  const confidence = lowestForecastConfidence(categories.map((category) => category.forecast.confidence));

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
    forecast: {
      projectedSpendCents,
      projectionRangeLowCents,
      projectionRangeHighCents,
      projectedRemainingCents: Math.max(0, plannedCents - projectedSpendCents),
      projectedOverageCents: Math.max(0, projectedSpendCents - plannedCents),
      confidence,
      atRiskCategoryCount: categories.filter((category) => category.forecast.status !== 'steady').length,
    },
    outsidePlan: {
      spentCents: outsidePlanTransactions.reduce((sum, transaction) => sum + validCents(transaction.amount_cents), 0),
      transactionCount: outsidePlanTransactions.length,
    },
    categories,
    transactions,
    accounts,
  };
}

function lowestForecastConfidence(values: MoneyForecastConfidence[]): MoneyForecastConfidence {
  if (values.includes('low')) return 'low';
  if (values.includes('medium')) return 'medium';
  return 'high';
}

function toLocalDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function projectTransaction(
  transaction: MoneyTransactionRow,
  accounts: Map<string, MoneyAccountRow>,
  categories: Map<string, MoneyCategoryRow>,
  rules: MoneyRuleRow[],
  allocations?: MoneyTransactionAllocation[],
): MoneyTransaction {
  const account = transaction.financial_account_id ? accounts.get(transaction.financial_account_id) : undefined;
  const connection = normalizeConnection(account?.budget_financial_connections);
  const category = transaction.budget_id ? categories.get(transaction.budget_id) : undefined;
  const reviewState = reviewStateFor(transaction, categories, allocations);
  const merchantRule = rules.find((rule) => merchantRuleMatches(rule, transaction.merchant_name?.trim() || transaction.name));
  const merchantRuleCategory = merchantRule ? categories.get(merchantRule.budget_id) : undefined;

  return {
    id: transaction.id,
    accountId: transaction.financial_account_id,
    accountName: account?.official_name?.trim() || account?.name.trim() || 'Unknown account',
    institutionName: connection?.institution_name?.trim() || 'Linked institution',
    originalDescription: transaction.original_description?.trim() || transaction.name.trim() || transaction.merchant_name?.trim() || 'Transaction',
    authorizedDate: transaction.authorized_date ?? null,
    accountMask: account?.mask?.trim() || null,
    accountType: account?.type ?? null,
    accountSubtype: account?.subtype ?? null,
    providerCategoryPrimary: transaction.personal_finance_category_primary ?? null,
    providerCategoryDetailed: transaction.personal_finance_category_detailed ?? null,
    providerCategoryConfidence: transaction.personal_finance_category_confidence ?? null,
    merchantName: transaction.merchant_name?.trim() || transaction.name.trim() || 'Transaction',
    amountCents: validCents(transaction.amount_cents),
    direction: transaction.direction,
    date: transaction.date,
    pending: transaction.pending,
    currencyCode: transaction.iso_currency_code || 'USD',
    categoryId: category ? category.legacy_budget_id?.trim() || category.slug : null,
    categoryName: allocations?.length ? 'Split across categories' : category?.name.trim()
      || (reviewState === 'not_counted' ? 'Not counted' : transaction.direction === 'inflow' ? 'Income or transfer' : 'Needs review'),
    reviewState,
    merchantRuleCategoryId: merchantRuleCategory
      ? merchantRuleCategory.legacy_budget_id?.trim() || merchantRuleCategory.slug
      : null,
    assignmentSource: transaction.budget_assignment_source ?? null,
    assignmentPolicyVersion: transaction.budget_assignment_policy_version ?? null,
    assignmentGoverned: transaction.budget_assignment_governed === true,
    moneyMeaning: transaction.money_meaning,
    ...(allocations?.length ? { allocations } : {}),
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
  allocations?: MoneyTransactionAllocation[],
): MoneyTransaction['reviewState'] {
  if (allocations?.length) return 'assigned';
  if (transaction.budget_match_source === 'excluded' || transaction.money_meaning === 'not_counted') return 'not_counted';
  if (transaction.budget_id && categories.has(transaction.budget_id)) return 'assigned';
  return isCountedOutflow(transaction) ? 'needs_review' : 'not_counted';
}

function buildValidAllocationsByTransactionId(
  transactions: MoneyTransactionRow[],
  rows: MoneyTransactionAllocationRow[],
  categories: Map<string, MoneyCategoryRow>,
): Map<string, MoneyTransactionAllocation[]> {
  const transactionById = new Map(transactions.map((transaction) => [transaction.id, transaction]));
  const rowsByTransactionId = new Map<string, MoneyTransactionAllocationRow[]>();
  rows.forEach((row) => {
    const existing = rowsByTransactionId.get(row.transaction_id) ?? [];
    existing.push(row);
    rowsByTransactionId.set(row.transaction_id, existing);
  });

  const valid = new Map<string, MoneyTransactionAllocation[]>();
  rowsByTransactionId.forEach((allocationRows, transactionId) => {
    const transaction = transactionById.get(transactionId);
    if (!transaction) return;
    const resolved = allocationRows.map((row) => ({ row, category: categories.get(row.budget_id) }));
    if (resolved.some(({ category }) => !category)) return;
    const plan = buildTransactionAllocationPlan({
      transactionAmountCents: validCents(transaction.amount_cents),
      direction: transaction.direction,
      pending: transaction.pending,
      allocations: resolved.map(({ row, category }) => ({
        categoryId: category!.id,
        amountCents: row.amount_cents,
      })),
    });
    if (!plan.valid) return;
    valid.set(transactionId, resolved
      .map(({ row, category }) => ({
        categoryId: category!.legacy_budget_id?.trim() || category!.slug,
        sourceCategoryId: category!.id,
        categoryName: category!.name.trim() || category!.slug,
        amountCents: validCents(row.amount_cents),
        sortOrder: category!.sort_order,
      }))
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map(({ sortOrder: _sortOrder, ...allocation }) => allocation));
  });
  return valid;
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

function validWeight(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function validPeriodId(value: string | null | undefined): boolean {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function countedCategorySpendBetween(input: {
  transactions: MoneyTransactionRow[];
  allocationsByTransactionId: Map<string, MoneyTransactionAllocation[]>;
  categoryByAlias: Map<string, MoneyCategoryRow>;
  categoryId: string;
  startPeriodId: string;
  endPeriodId: string;
}): number {
  let outflowCents = 0;
  let creditCents = 0;
  input.transactions.forEach((transaction) => {
    const periodId = transaction.date.slice(0, 7);
    if (periodId < input.startPeriodId || periodId > input.endPeriodId) return;
    const assignedCategory = transaction.budget_id ? input.categoryByAlias.get(transaction.budget_id) : null;
    if (assignedCategory?.id === input.categoryId) {
      if (isCountedOutflow(transaction)) outflowCents += validCents(transaction.amount_cents);
      if (!transaction.pending && transaction.direction === 'inflow' && transaction.money_meaning === 'category_credit') {
        creditCents += validCents(transaction.amount_cents);
      }
    }
    const allocation = input.allocationsByTransactionId.get(transaction.id)
      ?.find((candidate) => candidate.sourceCategoryId === input.categoryId);
    if (allocation) outflowCents += allocation.amountCents;
  });
  return Math.max(0, outflowCents - creditCents);
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
