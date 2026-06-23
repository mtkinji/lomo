import { useAppStore } from '../store/useAppStore';
import {
  applyScreenTimeRestrictions,
  clearScreenTimeRestrictions,
} from './appleEcosystem/screenTimeProtection';
import {
  getActiveRestrictionReasons,
  normalizeScreenTimeProtectionSettings,
  type ScreenTimeProtectionSettings,
  type ScreenTimeRestrictionReason,
} from './screenTimeProtection';

type ScreenTimeProtectionBridge = {
  apply: (params: {
    settings: ScreenTimeProtectionSettings;
    reasons: ScreenTimeRestrictionReason[];
  }) => Promise<boolean>;
  clear: () => Promise<boolean>;
};

export async function reconcileScreenTimeRestrictionsForSettings(params: {
  settings: ScreenTimeProtectionSettings;
  focusSessionActive: boolean;
  now?: Date;
  bridge: ScreenTimeProtectionBridge;
}): Promise<ScreenTimeRestrictionReason[]> {
  const settings = normalizeScreenTimeProtectionSettings(params.settings);
  const reasons = getActiveRestrictionReasons(settings, {
    now: params.now ?? new Date(),
    focusSessionActive: params.focusSessionActive,
  });

  if (reasons.length > 0) {
    await params.bridge.apply({ settings, reasons }).catch(() => false);
    return reasons;
  }

  await params.bridge.clear().catch(() => false);
  return [];
}

export async function reconcileScreenTimeRestrictions(params: {
  focusSessionActive: boolean;
  now?: Date;
}): Promise<ScreenTimeRestrictionReason[]> {
  const settings = useAppStore.getState().screenTimeProtection;
  return reconcileScreenTimeRestrictionsForSettings({
    settings,
    focusSessionActive: params.focusSessionActive,
    now: params.now,
    bridge: {
      apply: applyScreenTimeRestrictions,
      clear: clearScreenTimeRestrictions,
    },
  });
}

export async function applyMeaningfulFirstRestrictionsIfLocked(params: {
  now?: Date;
} = {}): Promise<boolean> {
  const settings = normalizeScreenTimeProtectionSettings(useAppStore.getState().screenTimeProtection);
  const reasons = getActiveRestrictionReasons(settings, {
    now: params.now ?? new Date(),
    focusSessionActive: false,
  }).filter((reason) => reason === 'meaningful_first_locked');

  if (reasons.length === 0) return false;
  return applyScreenTimeRestrictions({ settings, reasons }).catch(() => false);
}
