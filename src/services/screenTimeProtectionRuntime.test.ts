jest.mock('./appleEcosystem/screenTimeProtection', () => ({
  clearScreenTimeRestrictions: jest.fn().mockResolvedValue(true),
  applyPersonalCompositeScreenTimeRule: jest.fn().mockResolvedValue(true),
  clearPersonalCompositeScreenTimeRule: jest.fn().mockResolvedValue(true),
}));

import { reconcileScreenTimeRestrictionsForSettings } from './screenTimeProtectionRuntime';
import { normalizeScreenTimeProtectionSettings } from './screenTimeProtection';
import { useAppStore } from '../store/useAppStore';

const now = new Date('2026-06-19T12:00:00.000Z');

describe('screenTimeProtectionRuntime', () => {
  beforeEach(() => {
    useAppStore.getState().resetStore();
    jest.clearAllMocks();
  });

  it('reconciles the canonical aggregate with host-owned condition truth', async () => {
    const rule = {
      id: 'social-evening', selectionId: 'social', selectedApps: [],
      selectedCategories: [{ token: 'social', label: 'Social' }], enabled: true,
      setupCompleted: true, connector: 'all' as const, outcome: 'available' as const,
      conditions: [
        { id: 'focus', type: 'focus_active' as const, operator: 'is' as const, value: true as const },
        { id: 'usage', type: 'daily_usage' as const, operator: 'below' as const, minutes: 15 },
      ], lastUpdated: now.toISOString(),
    };
    const settings = normalizeScreenTimeProtectionSettings({
      authorizationStatus: 'approved', personalRuleSchemaVersion: 2,
      personalCompositeRules: [rule], personalRules: [],
    });
    const bridge = {
      applyComposite: jest.fn().mockResolvedValue(true),
      clearComposite: jest.fn().mockResolvedValue(true),
    };

    await expect(reconcileScreenTimeRestrictionsForSettings({
      settings, focusSessionActive: true, now, bridge,
    })).resolves.toEqual([]);
    expect(bridge.applyComposite).toHaveBeenCalledWith({
      ...rule,
      temporaryOpenUntilIso: null,
      monetizationState: 'active',
      monetizationChangedAt: null,
    }, {
      focusActive: true, realStepComplete: false,
    });
  });

  it('keeps a temporarily opened canonical rule cleared until its window expires', async () => {
    const rule = {
      id: 'social-break', selectionId: 'social', selectedApps: [],
      selectedCategories: [{ token: 'social', label: 'Social' }], enabled: true,
      setupCompleted: true, connector: 'all' as const, outcome: 'pause' as const,
      conditions: [{ id: 'focus', type: 'focus_active' as const, operator: 'is' as const, value: true as const }],
      temporaryOpenUntilIso: '2026-06-19T12:20:00.000Z', lastUpdated: now.toISOString(),
    };
    const settings = normalizeScreenTimeProtectionSettings({
      authorizationStatus: 'approved', personalRuleSchemaVersion: 2,
      personalCompositeRules: [rule], personalRules: [],
    });
    const bridge = {
      applyComposite: jest.fn().mockResolvedValue(true),
      clearComposite: jest.fn().mockResolvedValue(true),
    };

    await reconcileScreenTimeRestrictionsForSettings({ settings, focusSessionActive: true, now, bridge });

    expect(bridge.applyComposite).not.toHaveBeenCalled();
    expect(bridge.clearComposite).toHaveBeenCalledWith('social-break');
  });

  it('does not reapply retired rules when the canonical inventory is empty', async () => {
    const settings = normalizeScreenTimeProtectionSettings({
      authorizationStatus: 'approved', personalRuleSchemaVersion: 2,
      personalCompositeRules: [], personalRules: [],
    });
    const bridge = {
      clear: jest.fn().mockResolvedValue(true),
      applyComposite: jest.fn().mockResolvedValue(true),
    };

    await expect(reconcileScreenTimeRestrictionsForSettings({
      settings, focusSessionActive: true, now, bridge,
    })).resolves.toEqual([]);
    expect(bridge.applyComposite).not.toHaveBeenCalled();
    expect(bridge.clear).toHaveBeenCalledTimes(1);
  });
});
