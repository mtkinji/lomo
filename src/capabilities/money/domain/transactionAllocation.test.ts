import {
  buildTransactionAllocationPlan,
  formatAllocationAmountInput,
  parseAllocationAmountCents,
} from './transactionAllocation';

describe('buildTransactionAllocationPlan', () => {
  it('accepts an exact posted-outflow split using canonical category source ids', () => {
    expect(buildTransactionAllocationPlan({
      transactionAmountCents: 18496,
      direction: 'outflow',
      pending: false,
      allocations: [
        { categoryId: 'category-groceries-uuid', amountCents: 14000 },
        { categoryId: 'category-household-uuid', amountCents: 4496 },
      ],
    })).toEqual({
      valid: true,
      allocations: [
        { categoryId: 'category-groceries-uuid', amountCents: 14000 },
        { categoryId: 'category-household-uuid', amountCents: 4496 },
      ],
      allocatedCents: 18496,
      remainingCents: 0,
    });
  });

  it.each([
    {
      name: 'under allocation',
      input: {
        transactionAmountCents: 18496,
        direction: 'outflow' as const,
        pending: false,
        allocations: [
          { categoryId: 'category-groceries-uuid', amountCents: 14000 },
          { categoryId: 'category-household-uuid', amountCents: 4000 },
        ],
      },
      message: 'full transaction amount',
    },
    {
      name: 'duplicate category',
      input: {
        transactionAmountCents: 18496,
        direction: 'outflow' as const,
        pending: false,
        allocations: [
          { categoryId: 'category-groceries-uuid', amountCents: 14000 },
          { categoryId: 'category-groceries-uuid', amountCents: 4496 },
        ],
      },
      message: 'only once',
    },
    {
      name: 'pending transaction',
      input: {
        transactionAmountCents: 18496,
        direction: 'outflow' as const,
        pending: true,
        allocations: [
          { categoryId: 'category-groceries-uuid', amountCents: 14000 },
          { categoryId: 'category-household-uuid', amountCents: 4496 },
        ],
      },
      message: 'finishes pending',
    },
    {
      name: 'inflow',
      input: {
        transactionAmountCents: 18496,
        direction: 'inflow' as const,
        pending: false,
        allocations: [
          { categoryId: 'category-groceries-uuid', amountCents: 14000 },
          { categoryId: 'category-household-uuid', amountCents: 4496 },
        ],
      },
      message: 'spending transactions',
    },
  ])('rejects $name', ({ input, message }) => {
    expect(buildTransactionAllocationPlan(input)).toMatchObject({ valid: false, error: expect.stringContaining(message) });
  });
});

describe('allocation amount input', () => {
  it.each([
    ['140', 14000],
    ['$44.96', 4496],
    ['0.01', 1],
    ['1,234.50', 123450],
  ])('parses %s as exact cents', (value, expected) => {
    expect(parseAllocationAmountCents(value)).toBe(expected);
  });

  it.each(['', 'abc', '-1', '1.234'])('rejects %s', (value) => {
    expect(parseAllocationAmountCents(value)).toBeNull();
  });

  it('formats persisted cents for editing', () => {
    expect(formatAllocationAmountInput(4496)).toBe('44.96');
  });
});
