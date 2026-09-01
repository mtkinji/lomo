import { DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS, type ScreenTimeProtectionSettings } from '../../../services/screenTimeProtection';
import { deactivateAdvancedPersonalRulesForConfirmedDowngrade } from './screenTimeMonetizationLifecycle';

const basic = {
  id: 'basic', selectionId: 'basic', selectedApps: [{ token: 'a' }], selectedCategories: [],
  enabled: true, setupCompleted: true, connector: 'all' as const, outcome: 'pause' as const,
  conditions: [{ id: 'focus', type: 'focus_active' as const, operator: 'is' as const, value: true as const }],
  lastUpdated: '2026-08-01T00:00:00Z',
};
const advanced = {
  ...basic, id: 'advanced', selectionId: 'advanced',
  conditions: [basic.conditions[0], { id: 'time', type: 'time_of_day' as const, operator: 'after' as const, minuteOfDay: 480 }],
};

it('deactivates advanced rules whole, preserves their definition, and leaves basic rules active', async () => {
  let settings: ScreenTimeProtectionSettings = { ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS, authorizationStatus: 'approved', personalCompositeRules: [basic, advanced] };
  const result = await deactivateAdvancedPersonalRulesForConfirmedDowngrade({
    readSettings: () => settings,
    persistSettings: (next) => { settings = next; },
    deactivateRule: async () => true,
    now: () => '2026-09-01T12:00:00.000Z',
  });
  expect(result).toEqual({ deactivated: ['advanced'], pending: [] });
  expect(settings.personalCompositeRules.find((rule) => rule.id === 'basic')?.enabled).toBe(true);
  expect(settings.personalCompositeRules.find((rule) => rule.id === 'advanced')).toMatchObject({
    enabled: false,
    monetizationState: 'inactive_subscription_ended',
    conditions: advanced.conditions,
  });
});

it('records deactivation pending while still clearing desired enforcement', async () => {
  let settings: ScreenTimeProtectionSettings = { ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS, authorizationStatus: 'approved', personalCompositeRules: [advanced] };
  const result = await deactivateAdvancedPersonalRulesForConfirmedDowngrade({
    readSettings: () => settings,
    persistSettings: (next) => { settings = next; },
    deactivateRule: async () => false,
    now: () => '2026-09-01T12:00:00.000Z',
  });
  expect(result.pending).toEqual(['advanced']);
  expect(settings.personalCompositeRules[0]).toMatchObject({ enabled: false, monetizationState: 'deactivation_pending' });
});
