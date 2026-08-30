import * as Device from 'expo-device';
import { Platform } from 'react-native';
import {
  loadMoneyAppControlSettings,
  retireMoneyAppControlSettings,
} from '../../../capabilities/money/runtime/moneyAppControlStorage';
import {
  clearPersonalCompositeScreenTimeRule,
  clearPersonalScreenTimeUsageLimit,
  clearScreenTimeRestrictionsForSelection,
} from '../../../services/appleEcosystem/screenTimeProtection';
import { normalizeScreenTimeProtectionSettings } from '../../../services/screenTimeProtection';
import { useAppStore } from '../../../store/useAppStore';
import { runScreenTimeRuleSystemCleanup } from './screenTimeRuleSystemCleanup';

let cleanupInFlight: Promise<boolean> | null = null;

export function ensureCurrentScreenTimeRuleSystem(): Promise<boolean> {
  const settings = normalizeScreenTimeProtectionSettings(useAppStore.getState().screenTimeProtection);
  if (settings.ruleSystemVersion === 1) return Promise.resolve(true);
  if (cleanupInFlight) return cleanupInFlight;

  cleanupInFlight = (async () => {
    const moneySettings = await loadMoneyAppControlSettings();
    const result = await runScreenTimeRuleSystemCleanup({
      personalSettings: settings,
      moneySettings,
      requireNativeConfirmation: Platform.OS === 'ios' && Device.isDevice,
      clearComposite: clearPersonalCompositeScreenTimeRule,
      clearUsageLimit: clearPersonalScreenTimeUsageLimit,
      clearSelection: clearScreenTimeRestrictionsForSelection,
      retireMoneySettings: retireMoneyAppControlSettings,
      persistPersonalSettings: (next) => useAppStore.getState().setScreenTimeProtection(next),
      reportNativeCleanupFailure: () => useAppStore.getState().setScreenTimeProtection((current) => ({
        ...current,
        ruleSystemCleanupStatus: 'needs_attention',
      })),
    });
    return result.status !== 'native_cleanup_failed';
  })().finally(() => {
    cleanupInFlight = null;
  });
  return cleanupInFlight;
}

export function resetScreenTimeRuleSystemCleanupRuntimeForTests(): void {
  cleanupInFlight = null;
}
