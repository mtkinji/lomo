import {
  createPersonalScreenTimeRule,
  addPersonalScreenTimeRule,
  getPersonalScreenTimeRuleById,
  normalizeScreenTimeProtectionSettings,
  removePersonalScreenTimeRule,
  replacePersonalScreenTimeRule,
  type PersonalScreenTimeRule,
  type PersonalScreenTimeRuleKind,
  type ScreenTimeProtectionSettings,
} from '../../../services/screenTimeProtection';

export type PersonalScreenTimeRuleSummary = {
  id: string;
  kind: PersonalScreenTimeRuleKind;
  targetLabels: string[];
  appCount: number;
  categoryCount: number;
  enabled: boolean;
  limitMinutes: number | null;
  updatedAt: string;
};

export type PersonalScreenTimeRuleActionBoundary = {
  readSettings(): ScreenTimeProtectionSettings;
  persistSettings(settings: ScreenTimeProtectionSettings): void | Promise<void>;
  activateRule(rule: PersonalScreenTimeRule): Promise<boolean>;
  deactivateRule(rule: PersonalScreenTimeRule): Promise<boolean>;
};

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

function targetLabels(rule: PersonalScreenTimeRule): string[] {
  return [
    ...rule.selectedApps.map((item) => item.label?.trim() || 'Selected app'),
    ...rule.selectedCategories.map((item) => item.label?.trim() || 'Selected category'),
  ];
}

function summary(rule: PersonalScreenTimeRule, fallbackUpdatedAt?: string): PersonalScreenTimeRuleSummary {
  const updatedAt = rule.lastUpdated ?? fallbackUpdatedAt;
  if (!updatedAt) throw new PersonalScreenTimeRuleStaleError();
  return {
    id: rule.id,
    kind: rule.kind,
    targetLabels: targetLabels(rule),
    appCount: rule.selectedApps.length,
    categoryCount: rule.selectedCategories.length,
    enabled: rule.enabled,
    limitMinutes: rule.kind === 'daily_limit' ? rule.limitMinutes : null,
    updatedAt,
  };
}

function currentSettings(boundary: PersonalScreenTimeRuleActionBoundary) {
  return normalizeScreenTimeProtectionSettings(boundary.readSettings());
}

function exactRule(settings: ScreenTimeProtectionSettings, ruleId: string, expectedUpdatedAt?: string) {
  const rule = getPersonalScreenTimeRuleById(settings, ruleId.trim());
  if (!rule) throw new PersonalScreenTimeRuleNotFoundError();
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
  const result = settings.personalRules.map((rule) => summary(
    rule, settings.lastUpdated ?? '1970-01-01T00:00:00.000Z',
  ));
  return { operationId: 'screen_time.personal_rule.list' as const, status: 'completed' as const,
    resultRefs: result.map((item) => ({ kind: 'personal_screen_time_rule' as const, id: item.id })),
    reversible: true, result };
}

export function getPersonalScreenTimeRule(input: { ruleId: string }, boundary: PersonalScreenTimeRuleActionBoundary) {
  const result = summary(exactRule(currentSettings(boundary), input.ruleId));
  return { operationId: 'screen_time.personal_rule.get' as const, status: 'completed' as const,
    resultRefs: [{ kind: 'personal_screen_time_rule' as const, id: result.id }], reversible: true, result };
}

/** Native-only save path. Apple selection tokens enter here but never leave in the result. */
export async function savePersonalScreenTimeRule(input: {
  rule: PersonalScreenTimeRule;
  expectedUpdatedAt: string | 'unversioned' | null;
  confirmed: boolean;
}, boundary: PersonalScreenTimeRuleActionBoundary): Promise<PersonalScreenTimeRuleSummary> {
  confirm(input.confirmed);
  const settings = currentSettings(boundary);
  authorize(settings);
  const prior = input.expectedUpdatedAt === null
    ? null
    : input.expectedUpdatedAt === 'unversioned'
      ? (() => {
          const existing = getPersonalScreenTimeRuleById(settings, input.rule.id);
          if (!existing || existing.lastUpdated) throw new PersonalScreenTimeRuleStaleError();
          return existing;
        })()
      : exactRule(settings, input.rule.id, input.expectedUpdatedAt);
  if (input.expectedUpdatedAt === null && getPersonalScreenTimeRuleById(settings, input.rule.id)) {
    throw new PersonalScreenTimeRuleStaleError();
  }
  const withoutCurrent = prior
    ? { ...settings, personalRules: settings.personalRules.filter((rule) => rule.id !== prior.id) }
    : settings;
  const added = addPersonalScreenTimeRule(withoutCurrent, input.rule);
  if (added.status === 'duplicate_rule') throw new Error('duplicate_personal_screen_time_rule');
  if (prior?.enabled && !(await boundary.deactivateRule(prior))) {
    throw new Error('screen_time_rule_deactivation_failed');
  }
  if (input.rule.enabled && !(await boundary.activateRule(input.rule))) {
    if (prior?.enabled) await boundary.activateRule(prior);
    throw new Error('screen_time_rule_activation_failed');
  }
  try {
    await boundary.persistSettings(added.settings);
  } catch (error) {
    if (input.rule.enabled) await boundary.deactivateRule(input.rule);
    if (prior?.enabled) await boundary.activateRule(prior);
    throw error;
  }
  return summary(input.rule);
}

export async function updatePersonalScreenTimeRule(input: {
  ruleId: string;
  expectedUpdatedAt: string;
  fields: { enabled?: boolean; kind?: PersonalScreenTimeRuleKind; limitMinutes?: number };
  confirmed: boolean;
}, boundary: PersonalScreenTimeRuleActionBoundary, now = () => new Date().toISOString()):
Promise<Receipt<'screen_time.personal_rule.update'>> {
  confirm(input.confirmed);
  const settings = currentSettings(boundary);
  authorize(settings);
  const prior = exactRule(settings, input.ruleId, input.expectedUpdatedAt);
  if (!Object.keys(input.fields).length || Object.keys(input.fields).some((key) => !['enabled', 'kind', 'limitMinutes'].includes(key))) {
    throw new Error('invalid_personal_screen_time_rule_patch');
  }
  const kind = input.fields.kind ?? prior.kind;
  const enabled = input.fields.enabled ?? prior.enabled;
  const limitMinutes = input.fields.limitMinutes
    ?? (prior.kind === 'daily_limit' ? prior.limitMinutes : 10);
  if (!['real_step', 'focus', 'daily_limit'].includes(kind)
    || !Number.isInteger(limitMinutes) || limitMinutes < 1 || limitMinutes > 1440
    || (input.fields.limitMinutes !== undefined && kind !== 'daily_limit')) {
    throw new Error('invalid_personal_screen_time_rule_patch');
  }
  const updatedAt = now();
  const next = kind === prior.kind
    ? { ...prior, enabled, ...(kind === 'daily_limit' ? { limitMinutes } : {}), lastUpdated: updatedAt } as PersonalScreenTimeRule
    : createPersonalScreenTimeRule({
      id: prior.id, selectionId: prior.selectionId, kind,
      selectedApps: prior.selectedApps, selectedCategories: prior.selectedCategories,
      enabled, setupCompleted: true, ...(kind === 'daily_limit' ? { limitMinutes } : {}), nowIso: updatedAt,
    });
  if (prior.enabled && !(await boundary.deactivateRule(prior))) {
    throw new Error('screen_time_rule_deactivation_failed');
  }
  if (next.enabled && !(await boundary.activateRule(next))) {
    if (prior.enabled) await boundary.activateRule(prior);
    throw new Error('screen_time_rule_activation_failed');
  }
  await boundary.persistSettings(replacePersonalScreenTimeRule(settings, next));
  const result = summary(next);
  return {
    operationId: 'screen_time.personal_rule.update', status: 'completed',
    resultRefs: [{ kind: 'personal_screen_time_rule', id: next.id }], reversible: true, result,
    undoOperation: {
      type: 'screen_time.personal_rule.update', ruleId: prior.id, expectedUpdatedAt: updatedAt,
      fields: { enabled: prior.enabled, kind: prior.kind,
        ...(prior.kind === 'daily_limit' ? { limitMinutes: prior.limitMinutes } : {}) },
    },
  };
}

export async function deactivatePersonalScreenTimeRuleReviewed(input: {
  ruleId: string; expectedUpdatedAt: string; confirmed: boolean;
}, boundary: PersonalScreenTimeRuleActionBoundary, now = () => new Date().toISOString()):
Promise<Receipt<'screen_time.personal_rule.deactivate'>> {
  const updated = await updatePersonalScreenTimeRule({ ...input, fields: { enabled: false } }, boundary, now);
  return { ...updated, operationId: 'screen_time.personal_rule.deactivate' };
}

export async function deletePersonalScreenTimeRule(input: {
  ruleId: string; expectedUpdatedAt: string; confirmed: boolean;
}, boundary: PersonalScreenTimeRuleActionBoundary):
Promise<Receipt<'screen_time.personal_rule.delete'>> {
  confirm(input.confirmed);
  const settings = currentSettings(boundary);
  authorize(settings);
  const prior = exactRule(settings, input.ruleId, input.expectedUpdatedAt);
  if (prior.enabled && !(await boundary.deactivateRule(prior))) {
    throw new Error('screen_time_rule_deactivation_failed');
  }
  await boundary.persistSettings(removePersonalScreenTimeRule(settings, prior.id));
  return {
    operationId: 'screen_time.personal_rule.delete', status: 'completed',
    resultRefs: [{ kind: 'personal_screen_time_rule', id: prior.id }],
    reversible: false, result: summary(prior), undoOperation: null,
  };
}
