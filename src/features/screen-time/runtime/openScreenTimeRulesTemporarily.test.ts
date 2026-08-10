import { DEFAULT_MONEY_APP_CONTROL_SETTINGS } from '../../../capabilities/money/domain/moneyAppControl';
import {
  createPersonalScreenTimeRule,
  DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS,
} from '../../../services/screenTimeProtection';
import { projectPersonalScreenTimeRule } from '../../../services/screenTimeProtection';
import { openScreenTimeRulesTemporarily } from './openScreenTimeRulesTemporarily';

describe('openScreenTimeRulesTemporarily', () => {
  const storedRule = createPersonalScreenTimeRule({
    kind: 'real_step', selectedApps: [{ token: 'app' }], selectedCategories: [], enabled: true,
  });
  const personalSettings = { ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS, personalRules: [storedRule] };

  it('clears every selection and records one canonical 20 minute opening', async () => {
    const savePersonalSettings = jest.fn();
    const saveMoneySettings = jest.fn();
    const result = await openScreenTimeRulesTemporarily({
      actor: { kind: 'self_adult' },
      rules: [projectPersonalScreenTimeRule(storedRule)],
      personalSettings,
      moneySettings: DEFAULT_MONEY_APP_CONTROL_SETTINGS,
      clearSelection: jest.fn(async () => true),
      savePersonalSettings,
      saveMoneySettings,
      now: new Date('2026-08-10T12:00:00.000Z'),
    });
    expect(result).toEqual({ status: 'opened', expiresAtIso: '2026-08-10T12:20:00.000Z' });
    expect(savePersonalSettings.mock.calls[0][0].personalRules[0].currentUnlockUntilIso)
      .toBe('2026-08-10T12:20:00.000Z');
  });

  it('does not offer a bypass to a child', async () => {
    const clearSelection = jest.fn();
    await expect(openScreenTimeRulesTemporarily({
      actor: { kind: 'household_child', membershipId: 'child-1' },
      rules: [projectPersonalScreenTimeRule(storedRule)],
      personalSettings,
      moneySettings: DEFAULT_MONEY_APP_CONTROL_SETTINGS,
      clearSelection,
      savePersonalSettings: jest.fn(),
      saveMoneySettings: jest.fn(),
    })).resolves.toEqual({ status: 'denied' });
    expect(clearSelection).not.toHaveBeenCalled();
  });

  it('restores restrictions when native clear fails', async () => {
    const restoreRestrictions = jest.fn();
    await expect(openScreenTimeRulesTemporarily({
      actor: { kind: 'self_adult' },
      rules: [projectPersonalScreenTimeRule(storedRule)],
      personalSettings,
      moneySettings: DEFAULT_MONEY_APP_CONTROL_SETTINGS,
      clearSelection: jest.fn(async () => false),
      savePersonalSettings: jest.fn(),
      saveMoneySettings: jest.fn(),
      restoreRestrictions,
    })).resolves.toEqual({ status: 'failed' });
    expect(restoreRestrictions).toHaveBeenCalledTimes(1);
  });
});
