import {
  moneyAppControlSelectionId,
  type MoneyAppControlSettings,
} from '../../../capabilities/money/domain/moneyAppControl';
import {
  DEFAULT_FOCUS_PROTECTION_SETTINGS,
  DEFAULT_MEANINGFUL_FIRST_SETTINGS,
  normalizeScreenTimeProtectionSettings,
  type ScreenTimeProtectionSettings,
} from '../../../services/screenTimeProtection';

export type ScreenTimeRuleSystemCleanupPlan = {
  compositeRuleIds: string[];
  usageLimitRuleIds: string[];
  selectionIds: string[];
};

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim()))];
}

export function buildScreenTimeRuleSystemCleanupPlan(
  personalSettings: ScreenTimeProtectionSettings,
  moneySettings: MoneyAppControlSettings,
): ScreenTimeRuleSystemCleanupPlan {
  return {
    compositeRuleIds: unique(personalSettings.personalCompositeRules.map((rule) => rule.id)),
    usageLimitRuleIds: unique(personalSettings.personalRules
      .filter((rule) => rule.kind === 'daily_limit')
      .map((rule) => rule.id)),
    selectionIds: unique([
      ...personalSettings.personalRules
        .filter((rule) => rule.kind !== 'daily_limit')
        .map((rule) => rule.selectionId),
      ...Object.keys(moneySettings.policies).map(moneyAppControlSelectionId),
    ]),
  };
}

type CleanupBoundary = {
  personalSettings: ScreenTimeProtectionSettings;
  moneySettings: MoneyAppControlSettings;
  requireNativeConfirmation: boolean;
  clearComposite: (ruleId: string) => Promise<boolean>;
  clearUsageLimit: (ruleId: string) => Promise<boolean>;
  clearSelection: (selectionId: string) => Promise<boolean>;
  retireMoneySettings: () => Promise<void>;
  persistPersonalSettings: (settings: ScreenTimeProtectionSettings) => void | Promise<void>;
  reportNativeCleanupFailure?: () => void | Promise<void>;
};

export async function runScreenTimeRuleSystemCleanup(
  boundary: CleanupBoundary,
): Promise<{ status: 'already_current' | 'completed' | 'native_cleanup_failed' }> {
  if (boundary.personalSettings.ruleSystemVersion === 1) return { status: 'already_current' };

  const plan = buildScreenTimeRuleSystemCleanupPlan(boundary.personalSettings, boundary.moneySettings);
  const nativeResults = await Promise.all([
    ...plan.compositeRuleIds.map(boundary.clearComposite),
    ...plan.usageLimitRuleIds.map(boundary.clearUsageLimit),
    ...plan.selectionIds.map(boundary.clearSelection),
  ]);
  if (boundary.requireNativeConfirmation && nativeResults.some((confirmed) => !confirmed)) {
    await boundary.reportNativeCleanupFailure?.();
    return { status: 'native_cleanup_failed' };
  }

  await boundary.retireMoneySettings();
  await boundary.persistPersonalSettings(normalizeScreenTimeProtectionSettings({
    ...boundary.personalSettings,
    ruleSystemVersion: 1,
    ruleSystemCleanupStatus: 'ready',
    personalRuleSchemaVersion: 2,
    personalCompositeRules: [],
    personalRules: [],
    selectedApps: [],
    selectedCategories: [],
    focusProtection: DEFAULT_FOCUS_PROTECTION_SETTINGS,
    meaningfulFirst: DEFAULT_MEANINGFUL_FIRST_SETTINGS,
    lastUpdated: new Date().toISOString(),
  }));
  return { status: 'completed' };
}
