import { parseCategoryName, parseCategoryPlanDraft, parseMonthlyAmount } from './categoryPlanDraft';

describe('parseCategoryPlanDraft', () => {
  it('normalizes a named monthly category and dollars to cents', () => {
    expect(parseCategoryPlanDraft({ name: '  Groceries  ', monthlyAmount: '$600.25' })).toEqual({
      name: 'Groceries',
      budgetCents: 60025,
    });
  });

  it('accepts a zero-dollar category', () => {
    expect(parseCategoryPlanDraft({ name: 'Gifts', monthlyAmount: '0' })).toEqual({
      name: 'Gifts',
      budgetCents: 0,
    });
  });

  it('rejects missing names, negative values, and more than two decimals', () => {
    expect(() => parseCategoryPlanDraft({ name: ' ', monthlyAmount: '20' })).toThrow('Enter a category name.');
    expect(() => parseCategoryPlanDraft({ name: 'Gifts', monthlyAmount: '-20' })).toThrow('Enter a monthly amount of zero or more.');
    expect(() => parseCategoryPlanDraft({ name: 'Gifts', monthlyAmount: '20.999' })).toThrow('Enter a valid monthly amount.');
  });
});

describe('category plan field parsing', () => {
  it('validates name and amount independently for one-table edits', () => {
    expect(parseCategoryName('  Fun money ')).toBe('Fun money');
    expect(parseMonthlyAmount('$125.50')).toBe(12550);
    expect(() => parseCategoryName(' ')).toThrow('Enter a category name.');
    expect(() => parseMonthlyAmount('-1')).toThrow('Enter a monthly amount of zero or more.');
  });
});
