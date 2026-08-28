import {
  getPersonalCompositeScreenTimeRuleById,
  normalizeScreenTimeProtectionSettings,
  removePersonalCompositeScreenTimeRule,
  replacePersonalCompositeScreenTimeRule,
  type ScreenTimeProtectionSettings,
} from '../../../services/screenTimeProtection';
import {
  normalizePersonalCompositeScreenTimeRule,
  type PersonalCompositeScreenTimeRule,
} from './personalCompositeScreenTimeRule';

export type PersonalCompositeRuleActionBoundary = {
  readSettings(): ScreenTimeProtectionSettings;
  persistSettings(settings: ScreenTimeProtectionSettings): void | Promise<void>;
  activateRule(rule: PersonalCompositeScreenTimeRule): Promise<boolean>;
  deactivateRule(rule: PersonalCompositeScreenTimeRule): Promise<boolean>;
};

export type PersonalCompositeRuleSummary = {
  id: string;
  targetLabels: string[];
  conditionCount: number;
  connector: PersonalCompositeScreenTimeRule['connector'];
  outcome: PersonalCompositeScreenTimeRule['outcome'];
  enabled: boolean;
  updatedAt: string;
};

function summarize(rule: PersonalCompositeScreenTimeRule): PersonalCompositeRuleSummary {
  if (!rule.lastUpdated) throw new Error('screen_time_composite_rule_stale');
  return {
    id: rule.id,
    targetLabels: [...rule.selectedApps, ...rule.selectedCategories]
      .map((target) => target.label?.trim() || 'Selected app or category'),
    conditionCount: rule.conditions.length,
    connector: rule.connector,
    outcome: rule.outcome,
    enabled: rule.enabled,
    updatedAt: rule.lastUpdated,
  };
}

function fingerprint(rule: PersonalCompositeScreenTimeRule): string {
  return JSON.stringify({
    targets: [...rule.selectedApps.map(({ token }) => `app:${token}`), ...rule.selectedCategories.map(({ token }) => `category:${token}`)].sort(),
    connector: rule.connector,
    outcome: rule.outcome,
    conditions: rule.conditions.map(({ id: _id, ...condition }) => condition),
  });
}

export async function savePersonalCompositeScreenTimeRule(input: {
  rule: PersonalCompositeScreenTimeRule;
  expectedUpdatedAt: string | null;
  confirmed: boolean;
}, boundary: PersonalCompositeRuleActionBoundary): Promise<PersonalCompositeRuleSummary> {
  if (!input.confirmed) throw new Error('screen_time_composite_rule_confirmation_required');
  const normalized = normalizePersonalCompositeScreenTimeRule(input.rule);
  if (!normalized) throw new Error('invalid_screen_time_composite_rule');
  const settings = normalizeScreenTimeProtectionSettings(boundary.readSettings());
  if (settings.authorizationStatus !== 'approved') throw new Error('screen_time_rule_authorization_required');
  const prior = getPersonalCompositeScreenTimeRuleById(settings, normalized.id);
  if ((input.expectedUpdatedAt === null && prior)
    || (input.expectedUpdatedAt !== null && prior?.lastUpdated !== input.expectedUpdatedAt)) {
    throw new Error('screen_time_composite_rule_stale');
  }
  const duplicate = settings.personalCompositeRules.find((candidate) => (
    candidate.id !== normalized.id && fingerprint(candidate) === fingerprint(normalized)
  ));
  if (duplicate) throw new Error('duplicate_personal_screen_time_rule');

  if (prior?.enabled && !(await boundary.deactivateRule(prior))) {
    throw new Error('screen_time_composite_rule_deactivation_failed');
  }
  if (normalized.enabled && !(await boundary.activateRule(normalized))) {
    if (prior?.enabled) await boundary.activateRule(prior);
    throw new Error('screen_time_composite_rule_activation_failed');
  }
  const nextSettings = replacePersonalCompositeScreenTimeRule(settings, normalized);
  try {
    await boundary.persistSettings(nextSettings);
  } catch (error) {
    if (normalized.enabled) await boundary.deactivateRule(normalized);
    if (prior?.enabled) await boundary.activateRule(prior);
    throw error;
  }
  return summarize(normalized);
}

export async function deletePersonalCompositeScreenTimeRule(input: {
  ruleId: string;
  expectedUpdatedAt: string;
  confirmed: boolean;
}, boundary: PersonalCompositeRuleActionBoundary): Promise<PersonalCompositeRuleSummary> {
  if (!input.confirmed) throw new Error('screen_time_composite_rule_confirmation_required');
  const settings = normalizeScreenTimeProtectionSettings(boundary.readSettings());
  if (settings.authorizationStatus !== 'approved') throw new Error('screen_time_rule_authorization_required');
  const prior = getPersonalCompositeScreenTimeRuleById(settings, input.ruleId.trim());
  if (!prior) throw new Error('screen_time_composite_rule_not_found');
  if (prior.lastUpdated !== input.expectedUpdatedAt) throw new Error('screen_time_composite_rule_stale');
  if (prior.enabled && !(await boundary.deactivateRule(prior))) {
    throw new Error('screen_time_composite_rule_deactivation_failed');
  }
  await boundary.persistSettings(removePersonalCompositeScreenTimeRule(settings, prior.id));
  return summarize(prior);
}
