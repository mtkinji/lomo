import {
  normalizeScreenTimeProtectionSettings,
  type ScreenTimeProtectionSettings,
} from '../../../services/screenTimeProtection';
import type { PersonalCompositeScreenTimeRule } from '../domain/personalCompositeScreenTimeRule';
import { classifyPersonalRuleAccess } from '../domain/screenTimeAccessPolicy';

export type ScreenTimeMonetizationLifecycleBoundary = {
  readSettings(): ScreenTimeProtectionSettings;
  persistSettings(settings: ScreenTimeProtectionSettings): void | Promise<void>;
  deactivateRule(rule: PersonalCompositeScreenTimeRule): Promise<boolean>;
  now(): string;
};

export async function deactivateAdvancedPersonalRulesForConfirmedDowngrade(
  boundary: ScreenTimeMonetizationLifecycleBoundary,
): Promise<{ deactivated: string[]; pending: string[] }> {
  const settings = normalizeScreenTimeProtectionSettings(boundary.readSettings());
  const advanced = settings.personalCompositeRules.filter((rule) => (
    rule.enabled && classifyPersonalRuleAccess(rule) === 'pro_advanced'
  ));
  const results = await Promise.all(advanced.map(async (rule) => ({
    rule,
    acknowledged: await boundary.deactivateRule(rule).catch(() => false),
  })));
  if (!results.length) return { deactivated: [], pending: [] };

  const byId = new Map(results.map((result) => [result.rule.id, result]));
  const changedAt = boundary.now();
  await boundary.persistSettings({
    ...settings,
    personalCompositeRules: settings.personalCompositeRules.map((rule) => {
      const result = byId.get(rule.id);
      if (!result) return rule;
      return {
        ...rule,
        enabled: false,
        temporaryOpenUntilIso: null,
        monetizationState: result.acknowledged
          ? 'inactive_subscription_ended' as const
          : 'deactivation_pending' as const,
        monetizationChangedAt: changedAt,
        lastUpdated: changedAt,
      };
    }),
  });
  return {
    deactivated: results.filter((result) => result.acknowledged).map((result) => result.rule.id),
    pending: results.filter((result) => !result.acknowledged).map((result) => result.rule.id),
  };
}
