import type { MoneyCategory, MoneySnapshot } from '../data/moneySnapshot';
import {
  evaluateMoneyAppControlPolicy,
  getMoneyAppControlPresetCopy,
  isFreshMoneyReviewHandoff,
  normalizeMoneyAppControlSettings,
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
};

function snapshot(): MoneySnapshot {
  return {
    periodLabel: 'July 2026',
    generatedAt: '2026-07-23T18:00:00.000Z',
    lastSyncedAt: null,
    totals: { plannedCents: 20_000, spentCents: 19_000, remainingCents: 1_000, needsReviewCount: 2 },
    categories: [category],
    transactions: [],
    accounts: [],
  };
}

describe('Money app control', () => {
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
