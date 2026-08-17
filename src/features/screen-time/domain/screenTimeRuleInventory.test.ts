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
      selectedApps: [{ token: 'amazon' }],
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
        kind: 'real_step',
        selectedApps: [{ token: 'instagram' }],
        selectedCategories: [{ token: 'games' }],
        enabled: true,
        setupCompleted: true,
        nowIso: '2026-08-13T12:00:00.000Z',
      }),
      createPersonalScreenTimeRule({
        kind: 'focus',
        selectedApps: [{ token: 'reddit' }],
        selectedCategories: [],
        enabled: false,
        setupCompleted: true,
        nowIso: '2026-08-13T12:00:00.000Z',
      }),
    ];

    expect(buildMyScreenTimeRuleInventory({
      personalSettings: { ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS, personalRules },
      moneySettings,
    })).toEqual<ScreenTimeRuleInventoryRow[]>([
      {
        id: 'personal_real_step',
        domain: 'personal',
        title: 'Unlock after a to-do, progress update, or Focus',
        detail: 'Unlock 2 apps or categories after you complete any one of these in Kwilt.',
        targetCount: 2,
        enabled: true,
        destination: { kind: 'personal', ruleKind: 'real_step' },
      },
      {
        id: 'personal_focus',
        domain: 'personal',
        title: 'Pause until Focus ends',
        detail: 'Pause 1 app or category while Focus is running.',
        targetCount: 1,
        enabled: false,
        destination: { kind: 'personal', ruleKind: 'focus' },
      },
      {
        id: 'money_shopping',
        domain: 'money',
        title: 'Review Shopping before access',
        detail: 'Pause 1 app or category until Shopping is reviewed.',
        targetCount: 1,
        enabled: true,
        destination: { kind: 'money', categorySourceId: 'shopping' },
      },
      {
        id: 'money_dining_out',
        domain: 'money',
        title: 'Pause when Dining out is hot',
        detail: 'Pause 2 apps or categories when spending runs ahead of the month.',
        targetCount: 2,
        enabled: false,
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
