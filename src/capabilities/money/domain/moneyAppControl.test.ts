import type { MoneyCategory, MoneySnapshot } from '../data/moneySnapshot';
import {
  evaluateMoneyAppControlPolicy,
  getMoneyAppControlPresetCopy,
  isFreshMoneyReviewHandoff,
  normalizeMoneyAppControlSettings,
  projectMoneyScreenTimeRule,
  recordMoneyAppControlReview,
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

describe('Money app control', () => {
  it('projects a category-owned policy into the shared rule identity', () => {
    const settings = normalizeMoneyAppControlSettings({
      authorizationStatus: 'approved',
      policies: {
        shopping: {
          enabled: true,
          preset: 'when_over',
          selectedApps: [{ token: 'amazon' }],
          selectedCategories: [],
          unlockWindowMinutes: 15,
        },
      },
    });

    expect(projectMoneyScreenTimeRule({
      categorySourceId: 'shopping',
      categoryName: 'Shopping',
      policy: settings.policies.shopping,
    })).toEqual({
      id: 'money_shopping',
      domain: 'money',
      subject: { kind: 'self' },
      selectionId: 'money_shopping',
      title: 'Review Shopping',
      trigger: { type: 'money_review', categorySourceId: 'shopping' },
      temporaryOpen: { allowed: true, durationMinutes: 20 },
      active: true,
      desiredVersion: 1,
      appliedVersion: null,
    });
  });

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

  it('blocks at the selected threshold and an open review clears only its access window', () => {
    const settings = normalizeMoneyAppControlSettings({
      authorizationStatus: 'approved',
      policies: {
        'category-shopping': {
          enabled: true,
          preset: 'at_95_percent',
          unlockWindowMinutes: 20,
          selectedApps: [{ token: 'native:applications' }],
        },
      },
    });
    const now = new Date('2026-07-23T18:00:00.000Z');

    expect(evaluateMoneyAppControlPolicy({ settings, snapshot: snapshot(), category, now })).toMatchObject({
      restricted: true,
      reason: 'money_usage_threshold',
    });

    const opened = recordMoneyAppControlReview(settings, 'category-shopping', 'opened_for_now', now);
    expect(evaluateMoneyAppControlPolicy({ settings: opened, snapshot: snapshot(), category, now: new Date(now.getTime() + 19 * 60_000) }).restricted).toBe(false);
    expect(evaluateMoneyAppControlPolicy({ settings: opened, snapshot: snapshot(), category, now: new Date(now.getTime() + 21 * 60_000) }).restricted).toBe(true);
  });

  it('does not let keep-blocked reviews open access', () => {
    const settings = recordMoneyAppControlReview(
      normalizeMoneyAppControlSettings({
        authorizationStatus: 'approved',
        policies: {
          'category-shopping': {
            enabled: true,
            preset: 'always_review',
            unlockWindowMinutes: 20,
            selectedApps: [{ token: 'native:applications' }],
          },
        },
      }),
      'category-shopping',
      'left_blocked',
      new Date('2026-07-23T18:00:00.000Z'),
    );

    expect(evaluateMoneyAppControlPolicy({ settings, snapshot: snapshot(), category, now: new Date('2026-07-23T18:01:00.000Z') }).restricted).toBe(true);
  });

  it('keeps preset language reductive', () => {
    expect(getMoneyAppControlPresetCopy('when_hot')).toEqual({
      title: 'When this category is hot',
      detail: 'Pause when spending runs ahead of the month.',
    });
  });

  it('accepts a shield handoff once only inside the two-minute window', () => {
    const now = Date.parse('2026-07-23T18:02:00.000Z');
    expect(isFreshMoneyReviewHandoff(now - 119_000, now)).toBe(true);
    expect(isFreshMoneyReviewHandoff(now - 121_000, now)).toBe(false);
    expect(isFreshMoneyReviewHandoff(now + 1, now)).toBe(false);
  });
});
