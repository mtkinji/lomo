import { formatBudgetOverviewMoney, formatIncomeSpendingDifference } from './budgetOverviewMoney';

describe('formatBudgetOverviewMoney', () => {
  it('rounds Budget overview amounts to the nearest whole dollar', () => {
    expect(formatBudgetOverviewMoney(116)).toBe('$1');
    expect(formatBudgetOverviewMoney(9_026)).toBe('$90');
    expect(formatBudgetOverviewMoney(374_519)).toBe('$3,745');
    expect(formatBudgetOverviewMoney(-116)).toBe('-$1');
  });
});

describe('formatIncomeSpendingDifference', () => {
  it('shows a negative difference when spending exceeded received income', () => {
    expect(formatIncomeSpendingDifference(1_021_900, 1_070_300)).toBe('-$484');
  });

  it('shows a positive difference when received income exceeded spending', () => {
    expect(formatIncomeSpendingDifference(1_070_300, 1_021_900)).toBe('$484');
  });

  it('shows zero when received income and spending match', () => {
    expect(formatIncomeSpendingDifference(1_021_900, 1_021_900)).toBe('$0');
  });
});
