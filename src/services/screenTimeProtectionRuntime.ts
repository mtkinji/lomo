import { useAppStore } from '../store/useAppStore';
import {
  clearScreenTimeRestrictions,
  applyPersonalCompositeScreenTimeRule,
  clearPersonalCompositeScreenTimeRule,
} from './appleEcosystem/screenTimeProtection';
import {
  normalizeScreenTimeProtectionSettings,
  type ScreenTimeProtectionSettings,
  type ScreenTimeRestrictionReason,
} from './screenTimeProtection';
import type { PersonalCompositeScreenTimeRule } from '../features/screen-time/domain/personalCompositeScreenTimeRule';
import type { MoneySnapshot } from '../capabilities/money/data/moneySnapshot';
import { createMoneyRepository } from '../capabilities/money/data/moneyRepository';
import { evaluateMoneyBudgetCondition } from '../capabilities/money/domain/moneyAppControl';

async function resolveBudgetConditionTruth(rule: PersonalCompositeScreenTimeRule, suppliedSnapshot?: MoneySnapshot): Promise<Record<string, boolean>> {
  const budgetConditions = rule.conditions.filter((condition) => condition.type === 'budget');
  if (!budgetConditions.length) return {};
  const snapshot = suppliedSnapshot ?? await createMoneyRepository().loadSnapshot();
  const now = new Date();
  return Object.fromEntries(budgetConditions.flatMap((condition) => {
    const value = evaluateMoneyBudgetCondition({
      snapshot, categorySourceId: condition.categorySourceId, preset: condition.preset, now,
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
    activeCompositeRuleIds: normalizeScreenTimeProtectionSettings(
      useAppStore.getState().screenTimeProtection,
    ).personalCompositeRules.map((rule) => rule.id),
  }).catch(() => false);
}

export async function deactivatePersonalCompositeScreenTimeRule(
  rule: PersonalCompositeScreenTimeRule,
): Promise<boolean> {
  return clearPersonalCompositeScreenTimeRule(rule.id).catch(() => false);
}

type ScreenTimeProtectionBridge = {
  clear?: () => Promise<boolean>;
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
      const temporaryOpenUntilMs = rule.temporaryOpenUntilIso ? Date.parse(rule.temporaryOpenUntilIso) : Number.NaN;
      const temporarilyOpen = Number.isFinite(temporaryOpenUntilMs) && now.getTime() < temporaryOpenUntilMs;
      if (rule.enabled && !temporarilyOpen) {
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
      clear: clearScreenTimeRestrictions,
      applyComposite: (rule, context) => applyPersonalCompositeScreenTimeRule(rule, {
        ...context,
        activeCompositeRuleIds: normalized.personalCompositeRules.map((candidate) => candidate.id),
      }),
      clearComposite: clearPersonalCompositeScreenTimeRule,
    },
  });
}
