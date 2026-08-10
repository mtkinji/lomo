import {
  recordMoneyAppControlReview,
  type MoneyAppControlSettings,
} from '../../../capabilities/money/domain/moneyAppControl';
import {
  replacePersonalScreenTimeRule,
  type ScreenTimeProtectionSettings,
} from '../../../services/screenTimeProtection';
import {
  projectScreenTimeGuideActions,
  type ScreenTimeActor,
} from '../domain/screenTimeGuideActions';
import {
  DEFAULT_TEMPORARY_OPEN_MINUTES,
  type ScreenTimeRule,
} from '../domain/screenTimeRule';

export type TemporaryOpenResult =
  | { status: 'opened'; expiresAtIso: string }
  | { status: 'applying'; expiresAtIso: string }
  | { status: 'denied' }
  | { status: 'failed' };

export async function openScreenTimeRulesTemporarily(params: {
  actor: ScreenTimeActor;
  rules: ScreenTimeRule[];
  personalSettings: ScreenTimeProtectionSettings;
  moneySettings: MoneyAppControlSettings;
  clearSelection: (selectionId: string) => Promise<boolean>;
  savePersonalSettings: (settings: ScreenTimeProtectionSettings) => void | Promise<void>;
  saveMoneySettings: (settings: MoneyAppControlSettings) => void | Promise<void>;
  openFamilyRules?: (rules: ScreenTimeRule[], expiresAtIso: string) => Promise<'applied' | 'applying'>;
  restoreRestrictions?: () => void | Promise<void>;
  now?: Date;
}): Promise<TemporaryOpenResult> {
  const actions = projectScreenTimeGuideActions({ actor: params.actor, activeRules: params.rules });
  if (!actions.canTemporarilyOpen) return { status: 'denied' };

  const now = params.now ?? new Date();
  const expiresAtIso = new Date(
    now.getTime() + DEFAULT_TEMPORARY_OPEN_MINUTES * 60_000,
  ).toISOString();
  const localRules = params.rules.filter((rule) => rule.domain !== 'family');
  const familyRules = params.rules.filter((rule) => rule.domain === 'family');
  const selections = [...new Set(localRules.map((rule) => rule.selectionId))];

  try {
    const clearResults = await Promise.all(selections.map(params.clearSelection));
    if (clearResults.some((cleared) => !cleared)) {
      await params.restoreRestrictions?.();
      return { status: 'failed' };
    }

    let familyState: 'applied' | 'applying' = 'applied';
    if (familyRules.length > 0) {
      if (!params.openFamilyRules) {
        await params.restoreRestrictions?.();
        return { status: 'failed' };
      }
      familyState = await params.openFamilyRules(familyRules, expiresAtIso);
    }

    let personalSettings = params.personalSettings;
    params.rules.filter((rule) => rule.domain === 'personal').forEach((rule) => {
      const stored = personalSettings.personalRules.find((candidate) => candidate.id === rule.id);
      if (!stored) return;
      personalSettings = replacePersonalScreenTimeRule(personalSettings, {
        ...stored,
        currentUnlockUntilIso: expiresAtIso,
        lastUpdated: now.toISOString(),
      });
    });

    let moneySettings = params.moneySettings;
    params.rules.filter((rule) => rule.trigger.type === 'money_review').forEach((rule) => {
      if (rule.trigger.type !== 'money_review') return;
      moneySettings = recordMoneyAppControlReview(
        moneySettings,
        rule.trigger.categorySourceId,
        'opened_for_now',
        now,
      );
    });
    await params.savePersonalSettings(personalSettings);
    await params.saveMoneySettings(moneySettings);
    return { status: familyState === 'applying' ? 'applying' : 'opened', expiresAtIso };
  } catch {
    await params.restoreRestrictions?.();
    return { status: 'failed' };
  }
}
