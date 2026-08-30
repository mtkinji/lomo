import {
  getPersonalCompositeScreenTimeRuleById,
  normalizeScreenTimeProtectionSettings,
  removePersonalCompositeScreenTimeRule,
  replacePersonalCompositeScreenTimeRule,
  type ScreenTimeProtectionSettings,
} from '../../../services/screenTimeProtection';
import type {
  PersonalCompositeRuleActionBoundary,
  PersonalCompositeRuleSummary,
} from './personalCompositeRuleActions';
import type { PersonalCompositeScreenTimeRule } from './personalCompositeScreenTimeRule';

/** The public operation remains "personal rule"; its only current representation is the composite aggregate. */
export type PersonalScreenTimeRuleSummary = PersonalCompositeRuleSummary & { kind: 'composite' };
export type PersonalScreenTimeRuleActionBoundary = PersonalCompositeRuleActionBoundary;

type Receipt<OperationId extends string> = {
  operationId: OperationId;
  status: 'completed';
  resultRefs: readonly { kind: 'personal_screen_time_rule'; id: string }[];
  reversible: boolean;
  result: PersonalScreenTimeRuleSummary;
  undoOperation: Record<string, unknown> | null;
};

export class PersonalScreenTimeRuleAuthorizationError extends Error {
  constructor() { super('screen_time_rule_authorization_required'); }
}
export class PersonalScreenTimeRuleStaleError extends Error {
  constructor() { super('screen_time_rule_stale'); }
}
export class PersonalScreenTimeRuleNotFoundError extends Error {
  constructor() { super('screen_time_rule_not_found'); }
}
export class PersonalScreenTimeRuleConfirmationError extends Error {
  constructor() { super('screen_time_rule_confirmation_required'); }
}

function summarize(rule: PersonalCompositeScreenTimeRule, fallbackUpdatedAt?: string): PersonalScreenTimeRuleSummary {
  const updatedAt = rule.lastUpdated ?? fallbackUpdatedAt;
  if (!updatedAt) throw new PersonalScreenTimeRuleStaleError();
  return {
    id: rule.id,
    kind: 'composite',
    targetLabels: [...rule.selectedApps, ...rule.selectedCategories]
      .map((target) => target.label?.trim() || 'Selected app or category'),
    conditionCount: rule.conditions.length,
    connector: rule.connector,
    outcome: rule.outcome,
    enabled: rule.enabled,
    updatedAt,
  };
}

function currentSettings(boundary: PersonalScreenTimeRuleActionBoundary) {
  return normalizeScreenTimeProtectionSettings(boundary.readSettings());
}

function exactRule(
  settings: ScreenTimeProtectionSettings,
  ruleId: string,
  expectedUpdatedAt?: string | 'unversioned',
) {
  const rule = getPersonalCompositeScreenTimeRuleById(settings, ruleId.trim());
  if (!rule) throw new PersonalScreenTimeRuleNotFoundError();
  if (expectedUpdatedAt === 'unversioned') {
    if (rule.lastUpdated) throw new PersonalScreenTimeRuleStaleError();
    return rule;
  }
  if (!rule.lastUpdated || (expectedUpdatedAt !== undefined && rule.lastUpdated !== expectedUpdatedAt)) {
    throw new PersonalScreenTimeRuleStaleError();
  }
  return rule;
}

function confirm(value: boolean) {
  if (!value) throw new PersonalScreenTimeRuleConfirmationError();
}

function authorize(settings: ScreenTimeProtectionSettings) {
  if (settings.authorizationStatus !== 'approved') throw new PersonalScreenTimeRuleAuthorizationError();
}

export function listPersonalScreenTimeRules(boundary: PersonalScreenTimeRuleActionBoundary) {
  const settings = currentSettings(boundary);
  const result = settings.personalCompositeRules.map((rule) => summarize(
    rule,
    settings.lastUpdated ?? '1970-01-01T00:00:00.000Z',
  ));
  return {
    operationId: 'screen_time.personal_rule.list' as const,
    status: 'completed' as const,
    resultRefs: result.map((item) => ({ kind: 'personal_screen_time_rule' as const, id: item.id })),
    reversible: true,
    result,
  };
}

export function getPersonalScreenTimeRule(input: { ruleId: string }, boundary: PersonalScreenTimeRuleActionBoundary) {
  const result = summarize(exactRule(currentSettings(boundary), input.ruleId));
  return {
    operationId: 'screen_time.personal_rule.get' as const,
    status: 'completed' as const,
    resultRefs: [{ kind: 'personal_screen_time_rule' as const, id: result.id }],
    reversible: true,
    result,
  };
}

/** Chat owns lifecycle changes. Structural edits hand off to the native sentence composer. */
export async function updatePersonalScreenTimeRule(input: {
  ruleId: string;
  expectedUpdatedAt: string;
  fields: { enabled?: boolean };
  confirmed: boolean;
}, boundary: PersonalScreenTimeRuleActionBoundary, now = () => new Date().toISOString()):
Promise<Receipt<'screen_time.personal_rule.update'>> {
  confirm(input.confirmed);
  const settings = currentSettings(boundary);
  authorize(settings);
  const prior = exactRule(settings, input.ruleId, input.expectedUpdatedAt);
  if (Object.keys(input.fields).length !== 1 || typeof input.fields.enabled !== 'boolean') {
    throw new Error('screen_time_rule_structural_edit_requires_native_composer');
  }
  const updatedAt = now();
  const next: PersonalCompositeScreenTimeRule = { ...prior, enabled: input.fields.enabled, lastUpdated: updatedAt };
  if (prior.enabled && !(await boundary.deactivateRule(prior))) {
    throw new Error('screen_time_rule_deactivation_failed');
  }
  if (next.enabled && !(await boundary.activateRule(next))) {
    if (prior.enabled) await boundary.activateRule(prior);
    throw new Error('screen_time_rule_activation_failed');
  }
  try {
    await boundary.persistSettings(replacePersonalCompositeScreenTimeRule(settings, next));
  } catch (error) {
    if (next.enabled) await boundary.deactivateRule(next);
    if (prior.enabled) await boundary.activateRule(prior);
    throw error;
  }
  return {
    operationId: 'screen_time.personal_rule.update',
    status: 'completed',
    resultRefs: [{ kind: 'personal_screen_time_rule', id: next.id }],
    reversible: true,
    result: summarize(next),
    undoOperation: {
      type: 'screen_time.personal_rule.update',
      ruleId: prior.id,
      expectedUpdatedAt: updatedAt,
      fields: { enabled: prior.enabled },
    },
  };
}

export async function deactivatePersonalScreenTimeRuleReviewed(input: {
  ruleId: string;
  expectedUpdatedAt: string;
  confirmed: boolean;
}, boundary: PersonalScreenTimeRuleActionBoundary, now = () => new Date().toISOString()):
Promise<Receipt<'screen_time.personal_rule.deactivate'>> {
  const updated = await updatePersonalScreenTimeRule({ ...input, fields: { enabled: false } }, boundary, now);
  return { ...updated, operationId: 'screen_time.personal_rule.deactivate' };
}

export async function deletePersonalScreenTimeRule(input: {
  ruleId: string;
  expectedUpdatedAt: string | 'unversioned';
  confirmed: boolean;
}, boundary: PersonalScreenTimeRuleActionBoundary): Promise<Receipt<'screen_time.personal_rule.delete'>> {
  confirm(input.confirmed);
  const settings = currentSettings(boundary);
  authorize(settings);
  const prior = exactRule(settings, input.ruleId, input.expectedUpdatedAt);
  if (prior.enabled && !(await boundary.deactivateRule(prior))) {
    throw new Error('screen_time_rule_deactivation_failed');
  }
  await boundary.persistSettings(removePersonalCompositeScreenTimeRule(settings, prior.id));
  return {
    operationId: 'screen_time.personal_rule.delete',
    status: 'completed',
    resultRefs: [{ kind: 'personal_screen_time_rule', id: prior.id }],
    reversible: false,
    result: summarize(prior, settings.lastUpdated ?? '1970-01-01T00:00:00.000Z'),
    undoOperation: null,
  };
}
