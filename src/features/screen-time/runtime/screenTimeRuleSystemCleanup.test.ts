import type { MoneyAppControlSettings } from '../../../capabilities/money/domain/moneyAppControl';
import { normalizeScreenTimeProtectionSettings } from '../../../services/screenTimeProtection';
import {
  buildScreenTimeRuleSystemCleanupPlan,
  runScreenTimeRuleSystemCleanup,
} from './screenTimeRuleSystemCleanup';

const legacyMoney: MoneyAppControlSettings = {
  authorizationStatus: 'approved',
  policies: {
    shopping: {
      enabled: true,
      preset: 'when_over',
      unlockWindowMinutes: 20,
      selectedApps: [{ token: 'amazon', label: 'Amazon' }],
      selectedCategories: [],
      lastReview: null,
    },
  },
  lastUpdated: null,
};

function oldSettings() {
  const settings = normalizeScreenTimeProtectionSettings({
    authorizationStatus: 'approved',
    personalRuleSchemaVersion: 2,
    personalCompositeRules: [{
      id: 'composite-1', selectionId: 'selection-1',
      selectedApps: [], selectedCategories: [{ token: 'social', label: 'Social' }],
      enabled: true, setupCompleted: true, connector: 'all', outcome: 'pause',
      conditions: [{ id: 'usage', type: 'daily_usage', operator: 'reaches', minutes: 15 }],
      lastUpdated: null,
    }],
    personalRules: [{
      id: 'legacy-limit', kind: 'daily_limit', selectionId: 'legacy-selection',
      selectedApps: [{ token: 'games', label: 'Games' }], selectedCategories: [],
      enabled: true, setupCompleted: true, limitMinutes: 10, reset: 'daily', lastUpdated: null,
    }, {
      id: 'legacy-focus', kind: 'focus', selectionId: 'legacy-focus-selection',
      selectedApps: [{ token: 'video', label: 'Video' }], selectedCategories: [],
      enabled: true, setupCompleted: true, lastAppliedSessionId: null, lastUpdated: null,
    }],
  });
  return { ...settings, ruleSystemVersion: 0 as const };
}

describe('screenTimeRuleSystemCleanup', () => {
  it('plans every known native composite, usage monitor, selection, and Money rule once', () => {
    expect(buildScreenTimeRuleSystemCleanupPlan(oldSettings(), legacyMoney)).toEqual({
      compositeRuleIds: ['composite-1'],
      usageLimitRuleIds: ['legacy-limit'],
      selectionIds: ['legacy-focus-selection', 'money_shopping'],
    });
  });

  it('clears native enforcement before retiring either persisted rule store', async () => {
    const calls: string[] = [];
    const result = await runScreenTimeRuleSystemCleanup({
      personalSettings: oldSettings(), moneySettings: legacyMoney, requireNativeConfirmation: true,
      clearComposite: async (id) => { calls.push(`native:composite:${id}`); return true; },
      clearUsageLimit: async (id) => { calls.push(`native:usage:${id}`); return true; },
      clearSelection: async (id) => { calls.push(`native:selection:${id}`); return true; },
      retireMoneySettings: async () => { calls.push('persist:money'); },
      persistPersonalSettings: async (settings) => {
        expect(settings.ruleSystemVersion).toBe(1);
        expect(settings.personalCompositeRules).toEqual([]);
        expect(settings.personalRules).toEqual([]);
        calls.push('persist:personal');
      },
    });

    expect(result).toEqual({ status: 'completed' });
    expect(calls).toEqual([
      'native:composite:composite-1',
      'native:usage:legacy-limit',
      'native:selection:legacy-focus-selection',
      'native:selection:money_shopping',
      'persist:money',
      'persist:personal',
    ]);
  });

  it('keeps both stores intact when physical-device cleanup is not confirmed', async () => {
    const retireMoneySettings = jest.fn();
    const persistPersonalSettings = jest.fn();
    const reportNativeCleanupFailure = jest.fn();
    const result = await runScreenTimeRuleSystemCleanup({
      personalSettings: oldSettings(), moneySettings: legacyMoney, requireNativeConfirmation: true,
      clearComposite: async () => true,
      clearUsageLimit: async () => false,
      clearSelection: async () => true,
      retireMoneySettings,
      persistPersonalSettings,
      reportNativeCleanupFailure,
    });

    expect(result).toEqual({ status: 'native_cleanup_failed' });
    expect(retireMoneySettings).not.toHaveBeenCalled();
    expect(persistPersonalSettings).not.toHaveBeenCalled();
    expect(reportNativeCleanupFailure).toHaveBeenCalledTimes(1);
  });

  it('is a no-op after the consolidated version is recorded', async () => {
    const clearComposite = jest.fn();
    const result = await runScreenTimeRuleSystemCleanup({
      personalSettings: { ...oldSettings(), ruleSystemVersion: 1 }, moneySettings: legacyMoney,
      requireNativeConfirmation: true, clearComposite,
      clearUsageLimit: jest.fn(), clearSelection: jest.fn(), retireMoneySettings: jest.fn(),
      persistPersonalSettings: jest.fn(),
    });
    expect(result).toEqual({ status: 'already_current' });
    expect(clearComposite).not.toHaveBeenCalled();
  });
});
