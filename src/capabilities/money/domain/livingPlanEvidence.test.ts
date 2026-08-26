import { buildLivingPlanEvidence } from './living-plan-evidence';

describe('buildLivingPlanEvidence', () => {
  it('uses completed periods for planning weights and keeps current spend as exposure only', () => {
    const evidence = buildLivingPlanEvidence({
      nowIso: '2026-07-20T12:00:00.000Z',
      lastSyncedAtIso: '2026-07-20T11:00:00.000Z',
      transactions: [
        { id: 'may', date: '2026-05-10', direction: 'outflow', amountCents: 10_000, description: 'Market', budgetId: 'food' },
        { id: 'june', date: '2026-06-10', direction: 'outflow', amountCents: 12_000, description: 'Market', budgetId: 'food' },
        { id: 'july', date: '2026-07-10', direction: 'outflow', amountCents: 90_000, description: 'Market', budgetId: 'food' },
      ],
      forecastSettings: [],
      existingPlanAmounts: [{
        categoryId: 'food',
        amountCents: 20_000,
        starterWeight: 0.18,
        fundingRhythm: 'monthly',
      }],
      overrides: [],
    });

    expect(evidence.categories).toEqual([{
      categoryId: 'food',
      supportedFlexibleCents: 11_000,
      exposureCents: 90_000,
      starterWeight: 0.18,
      fundingRhythm: 'monthly',
      priorReserveCents: 0,
    }]);
    expect(evidence.evidenceConfidence).toBeCloseTo(2 / 6, 8);
  });

  it('passes reserve balance as context without treating it as flexible support', () => {
    const evidence = buildLivingPlanEvidence({
      nowIso: '2026-07-20T12:00:00.000Z',
      lastSyncedAtIso: '2026-07-20T11:00:00.000Z',
      transactions: [],
      forecastSettings: [],
      existingPlanAmounts: [{
        categoryId: 'gifts',
        amountCents: 10_000,
        starterWeight: 0.05,
        fundingRhythm: 'reserve',
        priorReserveCents: 30_000,
      }],
      overrides: [],
    });

    expect(evidence.categories[0]).toMatchObject({
      supportedFlexibleCents: 10_000,
      fundingRhythm: 'reserve',
      priorReserveCents: 30_000,
    });
  });

  it('includes pending current outflows in exposure without training historical support', () => {
    const evidence = buildLivingPlanEvidence({
      nowIso: '2026-07-20T12:00:00.000Z',
      lastSyncedAtIso: '2026-07-20T11:00:00.000Z',
      transactions: [
        { id: 'may', date: '2026-05-10', direction: 'outflow', amountCents: 10_000, description: 'Amazon', budgetId: 'shopping' },
        { id: 'june', date: '2026-06-10', direction: 'outflow', amountCents: 12_000, description: 'Amazon', budgetId: 'shopping' },
        { id: 'pending-july', date: '2026-07-19', direction: 'outflow', amountCents: 2_685, description: 'Amazon', budgetId: 'shopping', pending: true },
        { id: 'pending-refund', date: '2026-07-19', direction: 'inflow', amountCents: 500, description: 'Amazon refund', budgetId: 'shopping', pending: true, moneyMeaning: 'category_credit' },
      ],
      forecastSettings: [],
      existingPlanAmounts: [{ categoryId: 'shopping', amountCents: 15_000 }],
      overrides: [],
    });

    expect(evidence.categories).toEqual([{
      categoryId: 'shopping',
      supportedFlexibleCents: 11_000,
      exposureCents: 2_685,
      starterWeight: 0,
      fundingRhythm: 'monthly',
      priorReserveCents: 0,
    }]);
    expect(evidence.sourceInputs).toEqual([]);
  });

  it('keeps explicitly excluded inflows out of planning-income evidence', () => {
    const evidence = buildLivingPlanEvidence({
      nowIso: '2026-08-25T12:00:00.000Z',
      lastSyncedAtIso: '2026-08-25T11:00:00.000Z',
      transactions: [
        {
          id: 'included-payroll', date: '2026-07-14', direction: 'inflow', amountCents: 333_181,
          description: 'Adobe payroll', providerCategory: 'INCOME_SALARY',
        },
        {
          id: 'excluded-payroll', date: '2026-08-14', direction: 'inflow', amountCents: 333_181,
          description: 'Adobe payroll', providerCategory: 'INCOME_SALARY', moneyMeaning: 'not_counted',
        },
      ],
      forecastSettings: [],
      overrides: [],
    });

    expect(evidence.sourceInputs).toEqual([expect.objectContaining({
      samples: [333_181],
      activePeriodCount: 1,
    })]);
  });
});
