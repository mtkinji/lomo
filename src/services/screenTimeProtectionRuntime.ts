import { useAppStore } from '../store/useAppStore';
import {
  applyScreenTimeRestrictions,
  clearScreenTimeRestrictions,
  clearScreenTimeRestrictionsForSelection,
  applyPersonalScreenTimeUsageLimit,
  clearPersonalScreenTimeUsageLimit,
  applyPersonalCompositeScreenTimeRule,
  clearPersonalCompositeScreenTimeRule,
} from './appleEcosystem/screenTimeProtection';
import {
  getActivePersonalScreenTimeRestrictions,
  getActiveRestrictionReasons,
  normalizeScreenTimeProtectionSettings,
  type PersonalScreenTimeRule,
  type ScreenTimeProtectionSettings,
  type ScreenTimeRestrictionReason,
} from './screenTimeProtection';
import type { PersonalCompositeScreenTimeRule } from '../features/screen-time/domain/personalCompositeScreenTimeRule';
import type { MoneySnapshot } from '../capabilities/money/data/moneySnapshot';
import { createMoneyRepository } from '../capabilities/money/data/moneyRepository';
import { evaluateMoneyBudgetCondition } from '../capabilities/money/domain/moneyAppControl';
import { loadMoneyAppControlSettings } from '../capabilities/money/runtime/moneyAppControlStorage';

async function resolveBudgetConditionTruth(rule: PersonalCompositeScreenTimeRule, suppliedSnapshot?: MoneySnapshot): Promise<Record<string, boolean>> {
  const budgetConditions = rule.conditions.filter((condition) => condition.type === 'budget');
  if (!budgetConditions.length) return {};
  const [settings, snapshot] = await Promise.all([
    loadMoneyAppControlSettings(),
    suppliedSnapshot ? Promise.resolve(suppliedSnapshot) : createMoneyRepository().loadSnapshot(),
  ]);
  const now = new Date();
  return Object.fromEntries(budgetConditions.flatMap((condition) => {
    const value = evaluateMoneyBudgetCondition({
      settings, snapshot, categorySourceId: condition.categorySourceId, preset: condition.preset, now,
    });
    return value === null ? [] : [[condition.id, value]];
  }));
}

export async function activatePersonalCompositeScreenTimeRule(params: {
  rule: PersonalCompositeScreenTimeRule;
  focusSessionActive?: boolean;
  realStepComplete?: boolean;
}): Promise<boolean> {
  if (!params.rule.enabled) return true;
  const budgetConditionTruth = await resolveBudgetConditionTruth(params.rule).catch(() => ({}));
  return applyPersonalCompositeScreenTimeRule(params.rule, {
    focusActive: params.focusSessionActive ?? false,
    realStepComplete: params.realStepComplete ?? false,
    budgetConditionTruth,
  }).catch(() => false);
}

export async function deactivatePersonalCompositeScreenTimeRule(
  rule: PersonalCompositeScreenTimeRule,
): Promise<boolean> {
  return clearPersonalCompositeScreenTimeRule(rule.id).catch(() => false);
}

export async function activatePersonalScreenTimeRule(params: {
  rule: PersonalScreenTimeRule;
  focusSessionActive: boolean;
}): Promise<boolean> {
  const { rule } = params;
  if (!rule.enabled) return true;
  if (rule.kind === 'daily_limit') {
    return applyPersonalScreenTimeUsageLimit({
      settings: {
        selectedApps: rule.selectedApps,
        selectedCategories: rule.selectedCategories,
      },
      selectionId: rule.selectionId,
      ruleId: rule.id,
      limitMinutes: rule.limitMinutes,
      reset: rule.reset,
      restrictionLabel: 'Daily app limit',
    }).catch(() => false);
  }
  if (rule.kind === 'focus' && !params.focusSessionActive) return true;
  const reason: ScreenTimeRestrictionReason = rule.kind === 'focus'
    ? 'focus_session_active'
    : 'meaningful_first_locked';
  return applyScreenTimeRestrictions({
    settings: {
      selectedApps: rule.selectedApps,
      selectedCategories: rule.selectedCategories,
    },
    reasons: [reason],
    selectionId: rule.selectionId,
    ruleId: rule.id,
    reason,
    restrictionLabel: rule.kind === 'focus' ? 'Focus' : 'A real step',
  }).catch(() => false);
}

export async function deactivatePersonalScreenTimeRule(rule: PersonalScreenTimeRule): Promise<boolean> {
  if (rule.kind === 'daily_limit') {
    return clearPersonalScreenTimeUsageLimit(rule.id).catch(() => false);
  }
  return clearScreenTimeRestrictionsForSelection(rule.selectionId).catch(() => false);
}

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
  applyUsageLimit?: (params: {
    settings: Pick<ScreenTimeProtectionSettings, 'selectedApps' | 'selectedCategories'>;
    selectionId: string;
    ruleId: string;
    limitMinutes: number;
    reset: 'daily';
    restrictionLabel?: string;
  }) => Promise<boolean>;
  clearUsageLimit?: (ruleId: string) => Promise<boolean>;
  applyComposite?: (rule: PersonalCompositeScreenTimeRule, context: {
    focusActive: boolean;
    realStepComplete: boolean;
    budgetConditionTruth?: Record<string, boolean>;
  }) => Promise<boolean>;
  clearComposite?: (ruleId: string) => Promise<boolean>;
};

export async function reconcileScreenTimeRestrictionsForSettings(params: {
  settings: ScreenTimeProtectionSettings;
  focusSessionActive: boolean;
  now?: Date;
  bridge: ScreenTimeProtectionBridge;
  budgetConditionTruthByRule?: Record<string, Record<string, boolean>>;
}): Promise<ScreenTimeRestrictionReason[]> {
  const settings = normalizeScreenTimeProtectionSettings(params.settings);
  if (settings.personalCompositeRules.length > 0 && params.bridge.applyComposite) {
    const now = params.now ?? new Date();
    const unlockUntil = settings.meaningfulFirst.currentUnlockUntilIso;
    const realStepComplete = !!unlockUntil && Number.isFinite(Date.parse(unlockUntil))
      && now.getTime() < Date.parse(unlockUntil);
    await Promise.all(settings.personalCompositeRules.map(async (rule) => {
      if (rule.enabled) {
        await params.bridge.applyComposite!(rule, {
          focusActive: params.focusSessionActive,
          realStepComplete,
          budgetConditionTruth: params.budgetConditionTruthByRule?.[rule.id],
        }).catch(() => false);
      } else if (params.bridge.clearComposite) {
        await params.bridge.clearComposite(rule.id).catch(() => false);
      }
    }));
    return [];
  }
  if (settings.personalRules.length > 0) {
    const active = getActivePersonalScreenTimeRestrictions(settings, {
      now: params.now ?? new Date(),
      focusSessionActive: params.focusSessionActive,
    });
    const activeByRuleId = new Map(active.map((restriction) => [restriction.rule.id, restriction]));
    await Promise.all(settings.personalRules.map(async (rule) => {
      if (rule.kind === 'daily_limit') {
        if (rule.enabled && params.bridge.applyUsageLimit) {
          await params.bridge.applyUsageLimit({
            settings: {
              selectedApps: rule.selectedApps,
              selectedCategories: rule.selectedCategories,
            },
            selectionId: rule.selectionId,
            ruleId: rule.id,
            limitMinutes: rule.limitMinutes,
            reset: rule.reset,
            restrictionLabel: 'Daily app limit',
          }).catch(() => false);
        } else if (params.bridge.clearUsageLimit) {
          await params.bridge.clearUsageLimit(rule.id).catch(() => false);
        }
        return;
      }
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
  moneySnapshot?: MoneySnapshot;
}): Promise<ScreenTimeRestrictionReason[]> {
  const settings = useAppStore.getState().screenTimeProtection;
  const normalized = normalizeScreenTimeProtectionSettings(settings);
  const budgetConditionTruthByRule = Object.fromEntries(await Promise.all(
    normalized.personalCompositeRules.map(async (rule) => [
      rule.id,
      await resolveBudgetConditionTruth(rule, params.moneySnapshot).catch(() => ({})),
    ] as const),
  ));
  return reconcileScreenTimeRestrictionsForSettings({
    settings,
    focusSessionActive: params.focusSessionActive,
    now: params.now,
    budgetConditionTruthByRule,
    bridge: {
      apply: applyScreenTimeRestrictions,
      clear: clearScreenTimeRestrictions,
      clearSelection: clearScreenTimeRestrictionsForSelection,
      applyUsageLimit: applyPersonalScreenTimeUsageLimit,
      clearUsageLimit: clearPersonalScreenTimeUsageLimit,
      applyComposite: (rule, context) => applyPersonalCompositeScreenTimeRule(rule, context),
      clearComposite: clearPersonalCompositeScreenTimeRule,
    },
  });
}

export async function applyMeaningfulFirstRestrictionsIfLocked(params: {
  now?: Date;
} = {}): Promise<boolean> {
  const settings = normalizeScreenTimeProtectionSettings(useAppStore.getState().screenTimeProtection);
  const restrictions = getActivePersonalScreenTimeRestrictions(settings, {
    now: params.now ?? new Date(),
    focusSessionActive: false,
  }).filter(({ rule }) => rule.kind === 'real_step');

  if (restrictions.length === 0) return false;
  const results = await Promise.all(restrictions.map((restriction) => applyScreenTimeRestrictions({
    settings: {
      selectedApps: restriction.rule.selectedApps,
      selectedCategories: restriction.rule.selectedCategories,
    },
    reasons: restriction.reasons,
    selectionId: restriction.rule.selectionId,
    ruleId: restriction.rule.id,
    reason: restriction.reasons[0],
    restrictionLabel: 'A real step',
  }).catch(() => false)));
  return results.every(Boolean);
}
