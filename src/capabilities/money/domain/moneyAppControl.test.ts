import type { MoneyCategory, MoneySnapshot } from '../data/moneySnapshot';
import {
  evaluateMoneyBudgetCondition,
  getMoneyAppControlPresetCopy,
  normalizeMoneyAppControlSettings,
} from './moneyAppControl';

const category: MoneyCategory = {
  id: 'shopping',
  sourceId: 'category-shopping',
  name: 'Shopping',
  description: null,
  accentColor: '#315545',
  plannedCents: 20_000,
  spentCents: 19_000,
  remainingCents: 1_000,
  percentUsed: 95,
  transactionCount: 4,
  rolloverEnabled: false,
  fundingRhythm: 'monthly',
  fundingPolicyVersion: null,
  starterWeight: 0,
  monthlyContributionCents: 20_000,
  reserveAvailableCents: 0,
  reserveBalanceCents: 0,
  reserveBalancePeriodId: null,
  reserveAvailabilityKnown: true,
  expectedNeed: null,
  fundingCoverage: { status: 'none' },
  forecast: {
    mode: 'paced', claim: 'monthly_range', confidence: 'medium', expectedSpendCents: 15_000,
    projectedSpendCents: 20_000, projectionRangeLowCents: 18_000,
    projectionRangeHighCents: 22_000, projectedRemainingCents: 0,
    projectedOverageCents: 0, status: 'watch',
  },
};

function snapshot(): MoneySnapshot {
  return {
    periodLabel: 'July 2026',
    generatedAt: '2026-07-23T18:00:00.000Z',
    lastSyncedAt: null,
    totals: { plannedCents: 20_000, spentCents: 19_000, remainingCents: 1_000, needsReviewCount: 2 },
    forecast: {
      projectedSpendCents: 20_000, projectionRangeLowCents: 18_000, projectionRangeHighCents: 22_000,
      projectedRemainingCents: 0, projectedOverageCents: 0, confidence: 'medium', atRiskCategoryCount: 1,
    },
    outsidePlan: { spentCents: 0, transactionCount: 0 },
    categories: [category],
    transactions: [],
    accounts: [],
  };
}

describe('Money budget condition provider and legacy cleanup', () => {
  it('normalizes untrusted policy settings and keeps category policies namespaced', () => {
    expect(normalizeMoneyAppControlSettings({
      authorizationStatus: 'approved',
      policies: {
        'category-shopping': {
          enabled: true,
          preset: 'at_95_percent',
          unlockWindowMinutes: 20,
          selectedApps: [{ token: ' native:applications ', label: '1 app' }],
          selectedCategories: [],
        },
      },
    }).policies['category-shopping']).toMatchObject({
      enabled: true,
      preset: 'at_95_percent',
      unlockWindowMinutes: 20,
      selectedApps: [{ token: 'native:applications', label: '1 app' }],
    });
  });

  it('keeps preset language reductive', () => {
    expect(getMoneyAppControlPresetCopy('when_hot')).toEqual({
      title: 'When spending is 10 points ahead of the month',
      detail: 'Pause when the share of this budget used exceeds the share of the month elapsed by 10 percentage points.',
    });
    expect(getMoneyAppControlPresetCopy('when_over').title).toBe('When this budget is fully used');
    expect(getMoneyAppControlPresetCopy('needs_review').title).toBe('While any transaction needs review');
  });

  it('supplies deterministic truth for composed budget conditions without requiring a standalone policy', () => {
    const current = snapshot();
    const now = new Date('2026-07-23T18:00:00.000Z');
    expect(evaluateMoneyBudgetCondition({
      snapshot: current, categorySourceId: 'category-shopping', preset: 'at_95_percent', now,
    })).toBe(true);
    expect(evaluateMoneyBudgetCondition({
      snapshot: current, categorySourceId: 'category-shopping', preset: 'when_over', now,
    })).toBe(false);
    expect(evaluateMoneyBudgetCondition({
      snapshot: current, categorySourceId: 'missing', preset: 'when_over', now,
    })).toBeNull();
  });
});
