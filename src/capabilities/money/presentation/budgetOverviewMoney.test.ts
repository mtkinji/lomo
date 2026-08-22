import { formatBudgetOverviewMoney } from './budgetOverviewMoney';

describe('formatBudgetOverviewMoney', () => {
  it('rounds Budget overview amounts to the nearest whole dollar', () => {
    expect(formatBudgetOverviewMoney(116)).toBe('$1');
    expect(formatBudgetOverviewMoney(9_026)).toBe('$90');
    expect(formatBudgetOverviewMoney(374_519)).toBe('$3,745');
    expect(formatBudgetOverviewMoney(-116)).toBe('-$1');
  });
});
