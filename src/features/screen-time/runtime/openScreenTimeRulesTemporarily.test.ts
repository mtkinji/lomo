import { DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS } from '../../../services/screenTimeProtection';
import { openScreenTimeRulesTemporarily } from './openScreenTimeRulesTemporarily';

describe('openScreenTimeRulesTemporarily', () => {
  const storedRule = {
    id: 'social-rule', selectionId: 'social-rule', selectedApps: [{ token: 'app', label: 'Social' }],
    selectedCategories: [], enabled: true, setupCompleted: true, connector: 'all' as const,
    outcome: 'pause' as const,
    conditions: [{ id: 'focus', type: 'focus_active' as const, operator: 'is' as const, value: true as const }],
    lastUpdated: null,
  };
  const projectedRule = {
    id: storedRule.id, domain: 'personal' as const, subject: { kind: 'self' as const },
    selectionId: storedRule.selectionId, title: 'Social', trigger: { type: 'composite' as const },
    temporaryOpen: { allowed: true, durationMinutes: 20 as const }, active: true,
    desiredVersion: 1, appliedVersion: null,
  };
  const personalSettings = { ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS, personalCompositeRules: [storedRule] };

  it('clears every selection and records one canonical 20 minute opening', async () => {
    const savePersonalSettings = jest.fn();
    const result = await openScreenTimeRulesTemporarily({
      actor: { kind: 'self_adult' },
      rules: [projectedRule],
      personalSettings,
      clearSelection: jest.fn(async () => true),
      clearComposite: jest.fn(async () => true),
      savePersonalSettings,
      now: new Date('2026-08-10T12:00:00.000Z'),
    });
    expect(result).toEqual({ status: 'opened', expiresAtIso: '2026-08-10T12:20:00.000Z' });
    expect(savePersonalSettings.mock.calls[0][0].personalCompositeRules[0].temporaryOpenUntilIso)
      .toBe('2026-08-10T12:20:00.000Z');
  });

  it('does not offer a bypass to a child', async () => {
    const clearSelection = jest.fn();
    await expect(openScreenTimeRulesTemporarily({
      actor: { kind: 'household_child', membershipId: 'child-1' },
      rules: [projectedRule],
      personalSettings,
      clearSelection,
      clearComposite: jest.fn(),
      savePersonalSettings: jest.fn(),
    })).resolves.toEqual({ status: 'denied' });
    expect(clearSelection).not.toHaveBeenCalled();
  });

  it('restores restrictions when native clear fails', async () => {
    const restoreRestrictions = jest.fn();
    await expect(openScreenTimeRulesTemporarily({
      actor: { kind: 'self_adult' },
      rules: [projectedRule],
      personalSettings,
      clearSelection: jest.fn(async () => false),
      clearComposite: jest.fn(async () => false),
      savePersonalSettings: jest.fn(),
      restoreRestrictions,
    })).resolves.toEqual({ status: 'failed' });
    expect(restoreRestrictions).toHaveBeenCalledTimes(1);
  });
});
