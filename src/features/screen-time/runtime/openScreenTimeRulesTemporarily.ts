import {
  replacePersonalCompositeScreenTimeRule,
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
  clearSelection: (selectionId: string) => Promise<boolean>;
  clearComposite: (ruleId: string) => Promise<boolean>;
  savePersonalSettings: (settings: ScreenTimeProtectionSettings) => void | Promise<void>;
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

  try {
    const clearResults = await Promise.all(localRules.map((rule) => (
      rule.domain === 'personal' && rule.trigger.type === 'composite'
        ? params.clearComposite(rule.id)
        : params.clearSelection(rule.selectionId)
    )));
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
      const stored = personalSettings.personalCompositeRules.find((candidate) => candidate.id === rule.id);
      if (!stored) return;
      personalSettings = replacePersonalCompositeScreenTimeRule(personalSettings, {
        ...stored,
        temporaryOpenUntilIso: expiresAtIso,
        lastUpdated: now.toISOString(),
      });
    });
    await params.savePersonalSettings(personalSettings);
    return { status: familyState === 'applying' ? 'applying' : 'opened', expiresAtIso };
  } catch {
    await params.restoreRestrictions?.();
    return { status: 'failed' };
  }
}
