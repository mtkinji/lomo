jest.mock('./appleEcosystem/screenTimeProtection', () => ({
  applyScreenTimeRestrictions: jest.fn().mockResolvedValue(true),
  clearScreenTimeRestrictions: jest.fn().mockResolvedValue(true),
}));

import {
  applyScreenTimeRestrictions,
  clearScreenTimeRestrictions,
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
    };

    const reasons = await reconcileScreenTimeRestrictionsForSettings({
      settings,
      focusSessionActive: true,
      now,
      bridge,
    });

    expect(reasons).toEqual(['focus_session_active']);
    expect(bridge.apply).toHaveBeenCalledWith({ settings, reasons });
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
    };

    const reasons = await reconcileScreenTimeRestrictionsForSettings({
      settings,
      focusSessionActive: false,
      now,
      bridge,
    });

    expect(reasons).toEqual([]);
    expect(bridge.apply).not.toHaveBeenCalled();
    expect(bridge.clear).toHaveBeenCalledTimes(1);
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
      settings: useAppStore.getState().screenTimeProtection,
      reasons: ['meaningful_first_locked'],
    });
    expect(clearScreenTimeRestrictions).not.toHaveBeenCalled();
  });
});
