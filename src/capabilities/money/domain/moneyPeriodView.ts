import type { MoneyCategory, MoneySnapshot, MoneyTransaction } from '../data/moneySnapshot';
import { projectCategoryForecast } from './moneyForecast';
import { projectCategoryFunding, projectReserveAvailabilityFromAnchor } from './categoryFunding';

export type MoneyPeriodView = {
  monthOffset: number;
  periodLabel: string;
  periodElapsedPercent: number;
  categories: MoneyCategory[];
  totals: {
    plannedCents: number;
    spentCents: number;
    remainingCents: number;
    percentUsed: number;
  };
};

export type MoneyCategoryPeriodView = {
  monthOffset: number;
  periodLabel: string;
  periodStartIso: string;
  periodEndIso: string;
  periodElapsedPercent: number;
  category: MoneyCategory;
  transactions: MoneyTransaction[];
  historicalTransactions: MoneyTransaction[];
};

export function projectMoneyPeriodView(
  snapshot: MoneySnapshot,
  monthOffset: number,
  now = new Date(),
): MoneyPeriodView {
  const selectedDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const monthKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
  const periodLabel = selectedDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const periodElapsedPercent = getPeriodElapsedPercent(selectedDate, now);

  const categories = monthOffset === 0
    ? snapshot.categories
    : snapshot.categories.map((category) => projectCategoryForMonth(snapshot, category, selectedDate, now));
  const plannedCents = categories.reduce((total, category) => total + category.plannedCents, 0);
  const spentCents = categories.reduce((total, category) => total + category.spentCents, 0);

  return {
    monthOffset,
    periodLabel,
    periodElapsedPercent,
    categories,
    totals: {
      plannedCents,
      spentCents,
      remainingCents: plannedCents - spentCents,
      percentUsed: plannedCents > 0 ? Math.round((spentCents / plannedCents) * 100) : 0,
    },
  };
}

export function projectMoneyCategoryPeriodView(
  snapshot: MoneySnapshot,
  categoryId: string,
  monthOffset: number,
  now = new Date(),
): MoneyCategoryPeriodView | null {
  const sourceCategory = snapshot.categories.find((category) => (
    category.id === categoryId || category.sourceId === categoryId
  ));
  if (!sourceCategory) return null;

  const period = projectMoneyPeriodView(snapshot, monthOffset, now);
  const category = period.categories.find((candidate) => candidate.sourceId === sourceCategory.sourceId);
  if (!category) return null;

  const selectedDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const monthKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
  const periodStartIso = `${monthKey}-01`;
  const periodEndIso = toLocalDay(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0));
  const transactions = projectMoneyTransactionsForCategory(
    snapshot.transactions.filter((transaction) => transaction.date.startsWith(monthKey)),
    sourceCategory,
  );
  const historicalTransactions = projectMoneyTransactionsForCategory(snapshot.transactions, sourceCategory);

  return {
    monthOffset,
    periodLabel: period.periodLabel,
    periodStartIso,
    periodEndIso,
    periodElapsedPercent: period.periodElapsedPercent,
    category,
    transactions,
    historicalTransactions,
  };
}

function projectCategoryForMonth(
  snapshot: MoneySnapshot,
  category: MoneyCategory,
  selectedDate: Date,
  now: Date,
): MoneyCategory {
  const monthKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
  const transactions = projectMoneyTransactionsForCategory(
    snapshot.transactions.filter((transaction) => transaction.date.startsWith(monthKey) && !transaction.pending),
    category,
  );
  const outflowCents = snapshot.transactions
    .filter((transaction) => transaction.date.startsWith(monthKey) && !transaction.pending)
    .reduce((total, transaction) => total + projectPlanCoveredAmountForCategory(transaction, category), 0);
  const creditCents = transactions
    .filter((transaction) => transaction.direction === 'inflow' && transaction.moneyMeaning === 'category_credit')
    .reduce((total, transaction) => total + transaction.amountCents, 0);
  const spentCents = Math.max(0, outflowCents - creditCents);
  const funding = projectFundingForSelectedPeriod(snapshot, category, monthKey, spentCents);
  const forecast = projectCategoryForecast({
    periodStartIso: `${monthKey}-01`,
    periodEndIso: toLocalDay(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)),
    todayIso: toLocalDay(now),
    plannedCents: category.plannedCents,
    spentCents,
    mode: category.forecastSettings?.mode ?? category.forecast.mode,
    manualProjectedSpendCents: category.forecastSettings?.manualProjectedSpendCents,
    scheduledAmountCents: category.forecastSettings?.scheduledAmountCents,
    scheduledDueDay: category.forecastSettings?.scheduledDueDay,
    fundingRhythm: category.fundingRhythm,
    reserveAvailableCents: funding.availableCents,
    fundingCoverage: funding.coverage,
  });

  return {
    ...category,
    spentCents,
    remainingCents: funding.availableCents,
    percentUsed: category.plannedCents > 0
      ? Math.round((spentCents / category.plannedCents) * 100)
      : 0,
    transactionCount: transactions.length,
    reserveAvailableCents: category.fundingRhythm === 'reserve' ? funding.availableCents : 0,
    fundingCoverage: funding.coverage,
    reserveAvailabilityKnown: funding.known,
    forecast,
  };
}

function projectFundingForSelectedPeriod(
  snapshot: MoneySnapshot,
  category: MoneyCategory,
  monthKey: string,
  currentPeriodSpendCents: number,
) {
  if (category.fundingRhythm !== 'reserve') {
    return {
      ...projectCategoryFunding({
        rhythm: 'monthly',
        monthlyContributionCents: category.plannedCents,
        priorReserveCents: 0,
        countedSpendCents: currentPeriodSpendCents,
        periodId: monthKey,
      }),
      known: true,
    };
  }
  const anchorPeriodId = category.reserveBalancePeriodId;
  if (!anchorPeriodId || monthKey < anchorPeriodId) {
    return {
      ...projectCategoryFunding({
        rhythm: 'reserve', monthlyContributionCents: 0, priorReserveCents: 0,
        countedSpendCents: 0, periodId: monthKey,
      }),
      known: false,
    };
  }
  const transactionsSinceAnchor = snapshot.transactions.filter((transaction) => {
    const periodId = transaction.date.slice(0, 7);
    return periodId >= anchorPeriodId && periodId <= monthKey && !transaction.pending;
  });
  const countedSpendSinceAnchorCents = transactionsSinceAnchor.reduce((total, transaction) => {
    const categoryTransaction = projectTransactionForCategory(transaction, category);
    if (!categoryTransaction) return total;
    if (categoryTransaction.direction === 'inflow' && categoryTransaction.moneyMeaning === 'category_credit') {
      return total - categoryTransaction.amountCents;
    }
    return total + projectPlanCoveredAmountForCategory(transaction, category);
  }, 0);
  const availableCents = projectReserveAvailabilityFromAnchor({
    anchorPeriodId,
    anchorBalanceCents: category.reserveBalanceCents,
    targetPeriodId: monthKey,
    monthlyContributionCents: category.monthlyContributionCents,
    countedSpendSinceAnchorCents: Math.max(0, countedSpendSinceAnchorCents),
  });
  const projected = projectCategoryFunding({
    rhythm: 'reserve',
    monthlyContributionCents: category.monthlyContributionCents,
    priorReserveCents: availableCents == null ? 0 : availableCents - category.monthlyContributionCents + currentPeriodSpendCents,
    countedSpendCents: currentPeriodSpendCents,
    periodId: monthKey,
    expectedNeed: category.expectedNeed,
  });
  return { ...projected, known: availableCents != null };
}

function projectPlanCoveredAmountForCategory(
  transaction: MoneyTransaction,
  category: MoneyCategory,
): number {
  if (transaction.direction !== 'outflow'
    || transaction.moneyMeaning === 'not_counted'
    || transaction.moneyMeaning === 'transfer') return 0;
  const monthlyPlanCents = Math.max(
    0,
    transaction.amountCents - Math.min(transaction.amountCents, transaction.savedResourceCents ?? 0),
  );
  if (transaction.categoryId === category.id || transaction.categoryId === category.sourceId) {
    return monthlyPlanCents;
  }
  const allocations = transaction.allocations ?? [];
  const allocation = allocations.find((candidate) => (
    candidate.categoryId === category.id || candidate.sourceCategoryId === category.sourceId
  ));
  if (!allocation) return 0;
  const totalAmountCents = allocations.reduce((sum, candidate) => sum + candidate.amountCents, 0);
  return totalAmountCents > 0
    ? Math.floor((monthlyPlanCents * allocation.amountCents) / totalAmountCents)
    : 0;
}

export function projectMoneyTransactionsForCategory(
  transactions: MoneyTransaction[],
  category: MoneyCategory,
): MoneyTransaction[] {
  return transactions
    .map((transaction) => projectTransactionForCategory(transaction, category))
    .filter((transaction): transaction is MoneyTransaction => transaction != null);
}

function projectTransactionForCategory(
  transaction: MoneyTransaction,
  category: MoneyCategory,
): MoneyTransaction | null {
  if (transaction.categoryId === category.id) return transaction;
  const allocation = transaction.allocations?.find((candidate) => (
    candidate.categoryId === category.id || candidate.sourceCategoryId === category.sourceId
  ));
  if (!allocation) return null;
  return {
    ...transaction,
    amountCents: allocation.amountCents,
    savedResourceCents: Math.max(
      0,
      allocation.amountCents - projectPlanCoveredAmountForCategory(transaction, category),
    ),
    categoryId: category.id,
    categoryName: category.name,
  };
}

function getPeriodElapsedPercent(selectedMonth: Date, now: Date): number {
  const selectedKey = selectedMonth.getFullYear() * 12 + selectedMonth.getMonth();
  const currentKey = now.getFullYear() * 12 + now.getMonth();
  if (selectedKey < currentKey) return 100;
  if (selectedKey > currentKey) return 0;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Math.round((now.getDate() / daysInMonth) * 100);
}

function toLocalDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
