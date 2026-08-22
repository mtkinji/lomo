import type { MoneyCategory, MoneyTransaction } from '../data/moneySnapshot';
import { projectBudgetOverageReview } from './budgetOverageReview';

const category = (id: string, plannedCents: number, spentCents: number): MoneyCategory => ({
  id, sourceId: `${id}-source`, name: id === 'health' ? 'Health & Activities' : 'Entertainment', description: null,
  accentColor: '#000', plannedCents, spentCents, remainingCents: plannedCents - spentCents,
  percentUsed: 0, transactionCount: 1, rolloverEnabled: false, fundingRhythm: 'monthly',
  fundingPolicyVersion: null, starterWeight: 0, monthlyContributionCents: plannedCents,
  reserveAvailableCents: 0, reserveBalanceCents: 0, reserveBalancePeriodId: null,
  reserveAvailabilityKnown: false, expectedNeed: null, fundingCoverage: { status: 'none' },
  forecast: { mode: 'paced', claim: 'monthly_range', status: 'steady', confidence: 'high', expectedSpendCents: spentCents, projectedSpendCents: spentCents, projectionRangeLowCents: spentCents, projectionRangeHighCents: spentCents, projectedRemainingCents: 0, projectedOverageCents: 0 },
  planRole: 'flexible',
});

const transaction = (id: string, categoryId: string, amountCents: number, savedResourceCents = 0): MoneyTransaction => ({
  id, accountId: null, accountName: 'Checking', institutionName: 'Bank', merchantName: id,
  amountCents, direction: 'outflow', date: '2026-08-12', pending: false, currencyCode: 'USD',
  categoryId, categoryName: categoryId, reviewState: 'assigned', moneyMeaning: null, savedResourceCents,
});

describe('projectBudgetOverageReview', () => {
  it('groups over-budget categories by plan-covered contribution and preserves actual transactions', () => {
    const result = projectBudgetOverageReview({
      periodId: '2026-08',
      flexibleRoomCents: -44496,
      categories: [category('health', 19362, 311600), category('entertainment', 10000, 12258), category('food', 50000, 0)],
      transactions: [transaction('orthodontics', 'health', 311600, 200000), transaction('movie', 'entertainment', 12258)],
    });

    expect(result.groups.map((group) => [group.categoryName, group.overageCents])).toEqual([
      ['Health & Activities', 92238],
      ['Entertainment', 2258],
    ]);
    expect(result.groups[0]?.transactions[0]).toMatchObject({ id: 'orthodontics', amountCents: 311600, savedResourceCents: 200000 });
    expect(result.offsetCents).toBe(50000);
  });
});
