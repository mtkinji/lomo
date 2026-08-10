import { useAppStore } from '../store/useAppStore';
import {
  applyScreenTimeRestrictions,
  clearScreenTimeRestrictions,
  clearScreenTimeRestrictionsForSelection,
} from './appleEcosystem/screenTimeProtection';
import {
  getActivePersonalScreenTimeRestrictions,
  getActiveRestrictionReasons,
  normalizeScreenTimeProtectionSettings,
  type ScreenTimeProtectionSettings,
  type ScreenTimeRestrictionReason,
} from './screenTimeProtection';

type ScreenTimeProtectionBridge = {
  apply: (params: {
    settings: Pick<ScreenTimeProtectionSettings, 'selectedApps' | 'selectedCategories'>;
    reasons: ScreenTimeRestrictionReason[];
    selectionId?: string;
    ruleId?: string;
    reason?: string;
    restrictionLabel?: string;
  }) => Promise<boolean>;
  clear?: () => Promise<boolean>;
  clearSelection?: (selectionId: string) => Promise<boolean>;
};

export async function reconcileScreenTimeRestrictionsForSettings(params: {
  settings: ScreenTimeProtectionSettings;
  focusSessionActive: boolean;
  now?: Date;
  bridge: ScreenTimeProtectionBridge;
}): Promise<ScreenTimeRestrictionReason[]> {
  const settings = normalizeScreenTimeProtectionSettings(params.settings);
  if (settings.personalRules.length > 0) {
    const active = getActivePersonalScreenTimeRestrictions(settings, {
      now: params.now ?? new Date(),
      focusSessionActive: params.focusSessionActive,
    });
    const activeByRuleId = new Map(active.map((restriction) => [restriction.rule.id, restriction]));
    await Promise.all(settings.personalRules.map(async (rule) => {
      const restriction = activeByRuleId.get(rule.id);
      if (restriction) {
        await params.bridge.apply({
          settings: {
            selectedApps: rule.selectedApps,
            selectedCategories: rule.selectedCategories,
          },
          reasons: restriction.reasons,
          selectionId: rule.selectionId,
          ruleId: rule.id,
          reason: restriction.reasons[0],
          restrictionLabel: rule.kind === 'focus' ? 'Focus' : 'A real step',
        }).catch(() => false);
        return;
      }
      if (params.bridge.clearSelection) {
        await params.bridge.clearSelection(rule.selectionId).catch(() => false);
      }
    }));
    return active.flatMap(({ reasons }) => reasons);
  }
  const reasons = getActiveRestrictionReasons(settings, {
    now: params.now ?? new Date(),
    focusSessionActive: params.focusSessionActive,
  });

  if (reasons.length > 0) {
    await params.bridge.apply({ settings, reasons }).catch(() => false);
    return reasons;
  }

  if (params.bridge.clear) await params.bridge.clear().catch(() => false);
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
      clearSelection: clearScreenTimeRestrictionsForSelection,
    },
  });
}

export async function applyMeaningfulFirstRestrictionsIfLocked(params: {
  now?: Date;
} = {}): Promise<boolean> {
  const settings = normalizeScreenTimeProtectionSettings(useAppStore.getState().screenTimeProtection);
  const restriction = getActivePersonalScreenTimeRestrictions(settings, {
    now: params.now ?? new Date(),
    focusSessionActive: false,
  }).find(({ rule }) => rule.kind === 'real_step');

  if (!restriction) return false;
  return applyScreenTimeRestrictions({
    settings: {
      selectedApps: restriction.rule.selectedApps,
      selectedCategories: restriction.rule.selectedCategories,
    },
    reasons: restriction.reasons,
    selectionId: restriction.rule.selectionId,
    ruleId: restriction.rule.id,
    reason: restriction.reasons[0],
    restrictionLabel: 'A real step',
  }).catch(() => false);
}
