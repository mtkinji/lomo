import {
  buildMyScreenTimeRuleInventory,
  type ScreenTimeRuleInventoryRow,
} from './screenTimeRuleInventory';
import {
  createPersonalScreenTimeRule,
  DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS,
} from '../../../services/screenTimeProtection';
import type { MoneyAppControlSettings } from '../../../capabilities/money/domain/moneyAppControl';

const moneySettings: MoneyAppControlSettings = {
  authorizationStatus: 'approved',
  policies: {
    shopping: {
      enabled: true,
      preset: 'always_review',
      unlockWindowMinutes: 20,
      selectedApps: [{ token: 'amazon', label: 'Amazon' }],
      selectedCategories: [],
      lastReview: null,
    },
    dining_out: {
      enabled: false,
      preset: 'when_hot',
      unlockWindowMinutes: 20,
      selectedApps: [{ token: 'delivery' }],
      selectedCategories: [{ token: 'food' }],
      lastReview: null,
    },
  },
  lastUpdated: null,
};

describe('buildMyScreenTimeRuleInventory', () => {
  it('projects personal and Money records as individually countable rules', () => {
    const personalRules = [
      createPersonalScreenTimeRule({
        id: 'real-step-social',
        selectionId: 'real-step-social',
        kind: 'real_step',
        selectedApps: [{ token: 'instagram', label: 'Instagram' }],
        selectedCategories: [{ token: 'games', label: 'Games' }],
        enabled: true,
        setupCompleted: true,
        nowIso: '2026-08-13T12:00:00.000Z',
      }),
      createPersonalScreenTimeRule({
        id: 'focus-reddit',
        selectionId: 'focus-reddit',
        kind: 'focus',
        selectedApps: [{ token: 'reddit', label: 'Reddit' }],
        selectedCategories: [],
        enabled: false,
        setupCompleted: true,
        nowIso: '2026-08-13T12:00:00.000Z',
      }),
      createPersonalScreenTimeRule({
        id: 'daily-instagram',
        selectionId: 'daily-instagram',
        kind: 'daily_limit',
        selectedApps: [{ token: 'instagram', label: 'Instagram' }],
        selectedCategories: [],
        limitMinutes: 10,
        enabled: true,
        setupCompleted: true,
        nowIso: '2026-08-13T12:00:00.000Z',
      }),
    ];

    expect(buildMyScreenTimeRuleInventory({
      personalSettings: { ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS, personalRules },
      moneySettings,
    })).toEqual<ScreenTimeRuleInventoryRow[]>([
      {
        id: 'real-step-social',
        domain: 'personal',
        title: 'Instagram + 1',
        detail: 'Unlock after a to-do, progress update, or Focus.',
        targetCount: 2,
        enabled: true,
        contextLabel: null,
        destination: { kind: 'personal', ruleId: 'real-step-social' },
      },
      {
        id: 'focus-reddit',
        domain: 'personal',
        title: 'Reddit',
        detail: 'Pause while Focus is running.',
        targetCount: 1,
        enabled: false,
        contextLabel: null,
        destination: { kind: 'personal', ruleId: 'focus-reddit' },
      },
      {
        id: 'daily-instagram',
        domain: 'personal',
        title: 'Instagram',
        detail: 'Pause after 10 minutes of use each day.',
        targetCount: 1,
        enabled: true,
        contextLabel: null,
        destination: { kind: 'personal', ruleId: 'daily-instagram' },
      },
      {
        id: 'money_shopping',
        domain: 'money',
        title: 'Amazon',
        detail: 'Pause until Shopping is reviewed.',
        targetCount: 1,
        enabled: true,
        contextLabel: 'Money',
        destination: { kind: 'money', categorySourceId: 'shopping' },
      },
      {
        id: 'money_dining_out',
        domain: 'money',
        title: '2 apps or categories',
        detail: 'Pause when Dining out spending runs ahead of the month.',
        targetCount: 2,
        enabled: false,
        contextLabel: 'Money',
        destination: { kind: 'money', categorySourceId: 'dining_out' },
      },
    ]);
  });

  it('omits records that do not yet select apps or categories', () => {
    expect(buildMyScreenTimeRuleInventory({
      personalSettings: DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS,
      moneySettings: {
        ...moneySettings,
        policies: {
          shopping: { ...moneySettings.policies.shopping, selectedApps: [] },
        },
      },
    })).toEqual([]);
  });
});
