jest.mock('./appleEcosystem/screenTimeProtection', () => ({
  applyScreenTimeRestrictions: jest.fn().mockResolvedValue(true),
  clearScreenTimeRestrictions: jest.fn().mockResolvedValue(true),
  clearScreenTimeRestrictionsForSelection: jest.fn().mockResolvedValue(true),
  applyPersonalScreenTimeUsageLimit: jest.fn().mockResolvedValue(true),
  clearPersonalScreenTimeUsageLimit: jest.fn().mockResolvedValue(true),
}));

import {
  applyScreenTimeRestrictions,
  clearScreenTimeRestrictions,
  clearScreenTimeRestrictionsForSelection,
} from './appleEcosystem/screenTimeProtection';
import {
  applyMeaningfulFirstRestrictionsIfLocked,
  reconcileScreenTimeRestrictionsForSettings,
} from './screenTimeProtectionRuntime';
import { normalizeScreenTimeProtectionSettings } from './screenTimeProtection';
import { useAppStore } from '../store/useAppStore';

const now = new Date('2026-06-19T12:00:00.000Z');

describe('screenTimeProtectionRuntime', () => {
  beforeEach(() => {
    useAppStore.getState().resetStore();
    jest.clearAllMocks();
  });

  it('applies active reasons through the bridge', async () => {
    const settings = normalizeScreenTimeProtectionSettings({
      authorizationStatus: 'approved',
      selectedApps: [{ token: 'youtube', label: 'YouTube' }],
      focusProtection: { enabled: true },
    });
    const bridge = {
      apply: jest.fn().mockResolvedValue(true),
      clear: jest.fn().mockResolvedValue(true),
      clearSelection: jest.fn().mockResolvedValue(true),
    };

    const reasons = await reconcileScreenTimeRestrictionsForSettings({
      settings,
      focusSessionActive: true,
      now,
      bridge,
    });

    expect(reasons).toEqual(['focus_session_active']);
    expect(bridge.apply).toHaveBeenCalledWith({
      settings: {
        selectedApps: [{ token: 'youtube', label: 'YouTube' }],
        selectedCategories: [],
      },
      reasons,
      selectionId: 'personal_focus',
      ruleId: 'personal_focus',
      reason: 'focus_session_active',
      restrictionLabel: 'Focus',
    });
    expect(bridge.clear).not.toHaveBeenCalled();
  });

  it('clears restrictions when no reasons are active', async () => {
    const settings = normalizeScreenTimeProtectionSettings({
      authorizationStatus: 'approved',
      selectedApps: [{ token: 'youtube', label: 'YouTube' }],
      focusProtection: { enabled: true },
    });
    const bridge = {
      apply: jest.fn().mockResolvedValue(true),
      clear: jest.fn().mockResolvedValue(true),
      clearSelection: jest.fn().mockResolvedValue(true),
    };

    const reasons = await reconcileScreenTimeRestrictionsForSettings({
      settings,
      focusSessionActive: false,
      now,
      bridge,
    });

    expect(reasons).toEqual([]);
    expect(bridge.apply).not.toHaveBeenCalled();
    expect(bridge.clearSelection).toHaveBeenCalledWith('personal_focus');
    expect(bridge.clear).not.toHaveBeenCalled();
  });

  it('is best-effort when native restriction calls fail', async () => {
    const settings = normalizeScreenTimeProtectionSettings({
      authorizationStatus: 'approved',
      selectedApps: [{ token: 'youtube', label: 'YouTube' }],
      focusProtection: { enabled: true },
    });
    const bridge = {
      apply: jest.fn().mockRejectedValue(new Error('native unavailable')),
      clear: jest.fn().mockRejectedValue(new Error('native unavailable')),
      clearSelection: jest.fn().mockRejectedValue(new Error('native unavailable')),
    };

    await expect(
      reconcileScreenTimeRestrictionsForSettings({
        settings,
        focusSessionActive: true,
        now,
        bridge,
      }),
    ).resolves.toEqual(['focus_session_active']);

    await expect(
      reconcileScreenTimeRestrictionsForSettings({
        settings,
        focusSessionActive: false,
        now,
        bridge,
      }),
    ).resolves.toEqual([]);
  });

  it('schedules a daily usage limit without immediately shielding its apps', async () => {
    const settings = normalizeScreenTimeProtectionSettings({
      authorizationStatus: 'approved',
      personalRules: [{
        id: 'personal_daily_limit', kind: 'daily_limit', selectionId: 'personal_daily_limit',
        selectedApps: [{ token: 'instagram', label: 'Instagram' }], selectedCategories: [],
        enabled: true, setupCompleted: true, limitMinutes: 10, reset: 'daily',
      }],
    });
    const bridge = {
      apply: jest.fn().mockResolvedValue(true),
      clearSelection: jest.fn().mockResolvedValue(true),
      applyUsageLimit: jest.fn().mockResolvedValue(true),
      clearUsageLimit: jest.fn().mockResolvedValue(true),
    };

    await expect(reconcileScreenTimeRestrictionsForSettings({
      settings, focusSessionActive: false, now, bridge,
    })).resolves.toEqual([]);

    expect(bridge.applyUsageLimit).toHaveBeenCalledWith({
      settings: {
        selectedApps: [{ token: 'instagram', label: 'Instagram' }], selectedCategories: [],
      },
      selectionId: 'personal_daily_limit', ruleId: 'personal_daily_limit',
      limitMinutes: 10, reset: 'daily', restrictionLabel: 'Daily app limit',
    });
    expect(bridge.apply).not.toHaveBeenCalled();
    expect(bridge.clearSelection).not.toHaveBeenCalled();
  });

  it('clears a disabled daily usage monitor', async () => {
    const settings = normalizeScreenTimeProtectionSettings({
      authorizationStatus: 'approved',
      personalRules: [{
        id: 'personal_daily_limit', kind: 'daily_limit', selectionId: 'personal_daily_limit',
        selectedApps: [{ token: 'instagram' }], selectedCategories: [],
        enabled: false, setupCompleted: true, limitMinutes: 10, reset: 'daily',
      }],
    });
    const bridge = {
      apply: jest.fn().mockResolvedValue(true),
      clearSelection: jest.fn().mockResolvedValue(true),
      applyUsageLimit: jest.fn().mockResolvedValue(true),
      clearUsageLimit: jest.fn().mockResolvedValue(true),
    };

    await reconcileScreenTimeRestrictionsForSettings({ settings, focusSessionActive: false, now, bridge });

    expect(bridge.clearUsageLimit).toHaveBeenCalledWith('personal_daily_limit');
    expect(bridge.clearSelection).not.toHaveBeenCalled();
  });

  it('applies Meaningful First on foreground without clearing unrelated Focus restrictions', async () => {
    useAppStore.getState().setScreenTimeProtection(normalizeScreenTimeProtectionSettings({
      authorizationStatus: 'approved',
      selectedApps: [{ token: 'instagram', label: 'Instagram' }],
      selectedCategories: [],
      focusProtection: { enabled: true, setupCompleted: true, lastAppliedSessionId: null, lastUpdated: null },
      meaningfulFirst: {
        enabled: true,
        setupCompleted: true,
        qualifyingActions: ['activity_completed'],
        minFocusMinutes: 10,
        unlockPolicy: { type: 'until_next_local_day' },
        currentUnlockUntilIso: null,
        lastQualifiedAtIso: null,
        allowBypass: true,
        bypassMinutes: 15,
        lastPromptDismissedAtIso: null,
        lastUpdated: null,
      },
      lastUpdated: null,
    }));

    await expect(applyMeaningfulFirstRestrictionsIfLocked({ now })).resolves.toBe(true);
    expect(applyScreenTimeRestrictions).toHaveBeenCalledWith({
      settings: {
        selectedApps: [{ token: 'instagram', label: 'Instagram' }],
        selectedCategories: [],
      },
      reasons: ['meaningful_first_locked'],
      selectionId: 'personal_real_step',
      ruleId: 'personal_real_step',
      reason: 'meaningful_first_locked',
      restrictionLabel: 'A real step',
    });
    expect(clearScreenTimeRestrictions).not.toHaveBeenCalled();
  });
});
  it('reconciles independently selected personal rules without a global clear', async () => {
    const settings = normalizeScreenTimeProtectionSettings({
      authorizationStatus: 'approved',
      personalRules: [
        {
          id: 'personal_real_step',
          kind: 'real_step',
          selectionId: 'personal_real_step',
          selectedApps: [{ token: 'instagram', label: 'Instagram' }],
          selectedCategories: [],
          enabled: true,
          setupCompleted: true,
          currentUnlockUntilIso: null,
          temporaryOpenAllowed: true,
          temporaryOpenMinutes: 20,
        },
        {
          id: 'personal_focus',
          kind: 'focus',
          selectionId: 'personal_focus',
          selectedApps: [{ token: 'youtube', label: 'YouTube' }],
          selectedCategories: [],
          enabled: true,
          setupCompleted: true,
          temporaryOpenAllowed: true,
          temporaryOpenMinutes: 20,
        },
      ],
    });

    await reconcileScreenTimeRestrictionsForSettings({
      settings,
      focusSessionActive: false,
      now,
      bridge: {
        apply: applyScreenTimeRestrictions,
        clearSelection: clearScreenTimeRestrictionsForSelection,
      },
    });

    expect(applyScreenTimeRestrictions).toHaveBeenCalledWith(expect.objectContaining({
      selectionId: 'personal_real_step',
      ruleId: 'personal_real_step',
      reasons: ['meaningful_first_locked'],
    }));
    expect(clearScreenTimeRestrictionsForSelection).toHaveBeenCalledWith('personal_focus');
    expect(clearScreenTimeRestrictions).not.toHaveBeenCalled();
  });
