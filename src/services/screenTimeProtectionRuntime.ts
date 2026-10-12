import { isRunningFocusSessionExpired } from '../features/activities/focusSessionLifecycle';
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

function currentFocusTruth(now: Date): boolean | undefined {
  // Avoid initializing Focus/analytics while the shared app store is still loading.
  const { useFocusSessionStore } = require('../features/activities/focusSessionStore') as typeof import('../features/activities/focusSessionStore');
  const session = useFocusSessionStore.getState().activeSession;
  if (session) return session.mode === 'running' && !isRunningFocusSessionExpired(session, now.getTime());
  return useFocusSessionStore.persist.hasHydrated() ? false : undefined;
}

function currentRealStepTruth(settings: ScreenTimeProtectionSettings, now: Date): boolean {
  const until = settings.meaningfulFirst.currentUnlockUntilIso;
  return !!until && Number.isFinite(Date.parse(until)) && now.getTime() < Date.parse(until);
}

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
    focusActive: params.focusSessionActive ?? currentFocusTruth(new Date()),
    realStepComplete: params.realStepComplete ?? (useAppStore.persist.hasHydrated()
      ? currentRealStepTruth(normalizeScreenTimeProtectionSettings(useAppStore.getState().screenTimeProtection), new Date()) : undefined),
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
    focusActive: boolean | undefined;
    realStepComplete: boolean;
    budgetConditionTruth?: Record<string, boolean>;
  }) => Promise<boolean>;
  clearComposite?: (ruleId: string) => Promise<boolean>;
};

export async function reconcileScreenTimeRestrictionsForSettings(params: {
  settings: ScreenTimeProtectionSettings;
  focusSessionActive: boolean | undefined;
  now?: Date;
  bridge: ScreenTimeProtectionBridge;
  budgetConditionTruthByRule?: Record<string, Record<string, boolean>>;
}): Promise<ScreenTimeRestrictionReason[]> {
  const settings = normalizeScreenTimeProtectionSettings(params.settings);
  if (settings.personalCompositeRules.length > 0 && params.bridge.applyComposite) {
    const now = params.now ?? new Date();
    const realStepComplete = currentRealStepTruth(settings, now);
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
  focusSessionActive: boolean | undefined;
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
    focusSessionActive: currentFocusTruth(params.now ?? new Date()),
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
