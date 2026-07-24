import { buildMoneyGoalBridgeDraft } from './moneyGoalBridge';

describe('buildMoneyGoalBridgeDraft', () => {
  it('turns the hottest category at or above 95% into a bounded goal draft', () => {
    expect(buildMoneyGoalBridgeDraft([
      { id: 'food', name: 'Dining', spentCents: 9600, plannedCents: 10000 },
      { id: 'fuel', name: 'Fuel', spentCents: 5000, plannedCents: 10000 },
    ])).toEqual({
      sourceCategoryId: 'food',
      title: 'Pause before Dining extras this month',
      description: 'Dining is ahead of the plan. $96 spent of $100 planned. Before buying Dining extras, add it to a 24-hour list.',
      evidenceLabel: '$96 spent of $100 planned',
    });
  });

  it('keeps shopping copy natural and excludes raw transaction evidence', () => {
    const draft = buildMoneyGoalBridgeDraft([
      { id: 'shopping', name: 'Shopping', spentCents: 25000, plannedCents: 10000 },
    ]);
    expect(draft?.title).toBe('Pause before household extras this month');
    expect(draft?.description).not.toMatch(/merchant|transaction/i);
  });

  it('stays quiet when no category is running hot', () => {
    expect(buildMoneyGoalBridgeDraft([{ id: 'food', name: 'Dining', spentCents: 9400, plannedCents: 10000 }])).toBeNull();
  });
});
