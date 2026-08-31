import {
  buildMyScreenTimeRuleInventory,
  type ScreenTimeRuleInventoryRow,
} from './screenTimeRuleInventory';
import {
  createPersonalScreenTimeRule,
  DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS,
} from '../../../services/screenTimeProtection';

describe('buildMyScreenTimeRuleInventory', () => {
  it('renders one inventory row for a composite aggregate instead of one row per condition', () => {
    const composite = {
      id: 'social-evening', selectionId: 'social', selectedApps: [],
      selectedCategories: [{ token: 'social', label: 'Social' }], enabled: true,
      setupCompleted: true, connector: 'all' as const, outcome: 'available' as const,
      conditions: [
        { id: 'after-five', type: 'time_of_day' as const, operator: 'after' as const, minuteOfDay: 1020 },
        { id: 'under-limit', type: 'daily_usage' as const, operator: 'below' as const, minutes: 15 },
      ], lastUpdated: '2026-08-27T20:00:00.000Z',
    };
    const rows = buildMyScreenTimeRuleInventory({
      personalSettings: {
        ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS,
        personalCompositeRules: [composite],
      },
    });

    expect(rows).toEqual([{
      id: 'social-evening', domain: 'personal',
      title: 'Available after 5:00 PM and while daily use is under 15 minutes',
      detail: 'Social',
      targetCount: 1, enabled: true, contextLabel: null,
      destination: { kind: 'personal', ruleId: 'social-evening' },
    }]);
  });

  it('does not project pre-consolidation personal or Money records into the canonical inventory', () => {
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

    expect(personalRules).toHaveLength(3);
    expect(buildMyScreenTimeRuleInventory({
      personalSettings: { personalCompositeRules: [] },
    })).toEqual<ScreenTimeRuleInventoryRow[]>([]);
  });

  it('omits records that do not yet select apps or categories', () => {
    expect(buildMyScreenTimeRuleInventory({
      personalSettings: DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS,
    })).toEqual([]);
  });
});
