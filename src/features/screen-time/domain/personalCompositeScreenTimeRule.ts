import type {
  PersonalScreenTimeRule,
  ScreenTimeToken,
} from '../../../services/screenTimeProtection';
import type { MoneyAppControlPreset } from '../../../capabilities/money/domain/moneyAppControl';

export type PersonalRuleConnector = 'all' | 'any';
export type PersonalRuleOutcome = 'available' | 'pause';

export type PersonalRuleCondition =
  | { id: string; type: 'real_step_complete'; operator: 'is' | 'is_not' }
  | { id: string; type: 'focus_active'; operator: 'is' | 'is_not'; value: true }
  | { id: string; type: 'daily_usage'; operator: 'below' | 'reaches'; minutes: number }
  | { id: string; type: 'time_of_day'; operator: 'after' | 'before'; minuteOfDay: number }
  | { id: string; type: 'budget'; categorySourceId: string; categoryName: string; preset: MoneyAppControlPreset };

export type PersonalCompositeScreenTimeRule = {
  id: string;
  selectionId: string;
  selectedApps: ScreenTimeToken[];
  selectedCategories: ScreenTimeToken[];
  enabled: boolean;
  setupCompleted: boolean;
  connector: PersonalRuleConnector;
  outcome: PersonalRuleOutcome;
  conditions: PersonalRuleCondition[];
  temporaryOpenUntilIso?: string | null;
  lastUpdated: string | null;
};

export type PersonalCompositeRuleValidationIssue =
  | 'id'
  | 'selection'
  | 'targets'
  | 'connector'
  | 'outcome'
  | 'conditions'
  | 'condition_ids'
  | 'condition_type'
  | 'condition_operator'
  | 'condition_value';

export type PersonalCompositeRuleValidation = {
  valid: boolean;
  issues: PersonalCompositeRuleValidationIssue[];
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  !!value && typeof value === 'object' && !Array.isArray(value)
);

function cleanId(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeTokens(value: unknown): ScreenTimeToken[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((candidate) => {
    if (!isRecord(candidate)) return [];
    const token = cleanId(candidate.token);
    if (!token || seen.has(token)) return [];
    seen.add(token);
    const label = cleanId(candidate.label);
    return [{ token, ...(label ? { label } : {}) }];
  });
}

function normalizeCondition(value: unknown): PersonalRuleCondition | null {
  if (!isRecord(value)) return null;
  const id = cleanId(value.id);
  if (!id) return null;

  if (value.type === 'real_step_complete') {
    const operator = value.operator ?? 'is';
    if (operator !== 'is' && operator !== 'is_not') return null;
    return { id, type: 'real_step_complete', operator };
  }
  if (value.type === 'focus_active') {
    if ((value.operator !== 'is' && value.operator !== 'is_not') || value.value !== true) return null;
    return { id, type: 'focus_active', operator: value.operator, value: true };
  }
  if (value.type === 'daily_usage') {
    const minutes = Number(value.minutes);
    if ((value.operator !== 'below' && value.operator !== 'reaches') || !Number.isInteger(minutes) || minutes < 1 || minutes > 1440) return null;
    return { id, type: 'daily_usage', operator: value.operator, minutes };
  }
  if (value.type === 'time_of_day') {
    const minuteOfDay = Number(value.minuteOfDay);
    if ((value.operator !== 'after' && value.operator !== 'before') || !Number.isInteger(minuteOfDay) || minuteOfDay < 0 || minuteOfDay > 1439) return null;
    return { id, type: 'time_of_day', operator: value.operator, minuteOfDay };
  }
  if (value.type === 'budget') {
    const categorySourceId = cleanId(value.categorySourceId);
    const categoryName = cleanId(value.categoryName);
    const preset = value.preset;
    if (!categorySourceId || !categoryName || !['always_review', 'when_hot', 'at_95_percent', 'when_over', 'needs_review'].includes(String(preset))) return null;
    return { id, type: 'budget', categorySourceId, categoryName, preset: preset as MoneyAppControlPreset };
  }
  return null;
}

export function validatePersonalCompositeScreenTimeRule(value: unknown): PersonalCompositeRuleValidation {
  const issues = new Set<PersonalCompositeRuleValidationIssue>();
  if (!isRecord(value)) return { valid: false, issues: ['id', 'selection', 'targets', 'connector', 'outcome', 'conditions'] };

  if (!cleanId(value.id)) issues.add('id');
  if (!cleanId(value.selectionId)) issues.add('selection');
  const selectedApps = normalizeTokens(value.selectedApps);
  const selectedCategories = normalizeTokens(value.selectedCategories);
  if (selectedApps.length + selectedCategories.length === 0) issues.add('targets');
  if (value.connector !== 'all' && value.connector !== 'any') issues.add('connector');
  if (value.outcome !== 'available' && value.outcome !== 'pause') issues.add('outcome');

  if (!Array.isArray(value.conditions) || value.conditions.length === 0) {
    issues.add('conditions');
  } else {
    const ids = new Set<string>();
    const types = new Set<string>();
    value.conditions.forEach((candidate) => {
      if (!isRecord(candidate)) {
        issues.add('condition_type');
        return;
      }
      const id = cleanId(candidate.id);
      if (!id) issues.add('condition_ids');
      else if (ids.has(id)) issues.add('condition_ids');
      else ids.add(id);

      if (!['real_step_complete', 'focus_active', 'daily_usage', 'time_of_day', 'budget'].includes(String(candidate.type))) {
        issues.add('condition_type');
        return;
      }
      const conditionType = String(candidate.type);
      if (conditionType !== 'budget' && types.has(conditionType)) issues.add('condition_type');
      else types.add(conditionType);
      if (candidate.type === 'focus_active') {
        if (candidate.operator !== 'is' && candidate.operator !== 'is_not') issues.add('condition_operator');
        if (candidate.value !== true) issues.add('condition_value');
      }
      if (candidate.type === 'real_step_complete' && candidate.operator !== undefined
        && candidate.operator !== 'is' && candidate.operator !== 'is_not') issues.add('condition_operator');
      if (candidate.type === 'daily_usage') {
        if (candidate.operator !== 'below' && candidate.operator !== 'reaches') issues.add('condition_operator');
        const minutes = Number(candidate.minutes);
        if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) issues.add('condition_value');
      }
      if (candidate.type === 'time_of_day') {
        if (candidate.operator !== 'after' && candidate.operator !== 'before') issues.add('condition_operator');
        const minuteOfDay = Number(candidate.minuteOfDay);
        if (!Number.isInteger(minuteOfDay) || minuteOfDay < 0 || minuteOfDay > 1439) issues.add('condition_value');
      }
      if (candidate.type === 'budget') {
        if (!cleanId(candidate.categorySourceId) || !cleanId(candidate.categoryName)) issues.add('condition_value');
        if (!['always_review', 'when_hot', 'at_95_percent', 'when_over', 'needs_review'].includes(String(candidate.preset))) issues.add('condition_operator');
      }
    });
  }
  return { valid: issues.size === 0, issues: [...issues] };
}

export function normalizePersonalCompositeScreenTimeRule(value: unknown): PersonalCompositeScreenTimeRule | null {
  const validation = validatePersonalCompositeScreenTimeRule(value);
  if (!validation.valid || !isRecord(value)) return null;
  const id = cleanId(value.id)!;
  const selectionId = cleanId(value.selectionId)!;
  const timestamp = typeof value.lastUpdated === 'string' && Number.isFinite(Date.parse(value.lastUpdated))
    ? new Date(value.lastUpdated).toISOString()
    : null;
  return {
    id,
    selectionId,
    selectedApps: normalizeTokens(value.selectedApps),
    selectedCategories: normalizeTokens(value.selectedCategories),
    enabled: value.enabled === true,
    setupCompleted: value.setupCompleted === true,
    connector: value.connector as PersonalRuleConnector,
    outcome: value.outcome as PersonalRuleOutcome,
    conditions: (value.conditions as unknown[]).map(normalizeCondition).filter((condition): condition is PersonalRuleCondition => !!condition),
    temporaryOpenUntilIso: typeof value.temporaryOpenUntilIso === 'string'
      && Number.isFinite(Date.parse(value.temporaryOpenUntilIso))
      ? new Date(value.temporaryOpenUntilIso).toISOString()
      : null,
    lastUpdated: timestamp,
  };
}

export function migrateLegacyPersonalRule(rule: PersonalScreenTimeRule): PersonalCompositeScreenTimeRule {
  const condition: PersonalRuleCondition = rule.kind === 'real_step'
    ? { id: `${rule.id}:condition`, type: 'real_step_complete', operator: 'is' }
    : rule.kind === 'focus'
      ? { id: `${rule.id}:condition`, type: 'focus_active', operator: 'is', value: true }
      : { id: `${rule.id}:condition`, type: 'daily_usage', operator: 'reaches', minutes: rule.limitMinutes };
  return {
    id: rule.id,
    selectionId: rule.selectionId,
    selectedApps: rule.selectedApps,
    selectedCategories: rule.selectedCategories,
    enabled: rule.enabled,
    setupCompleted: rule.setupCompleted,
    connector: 'all',
    outcome: rule.kind === 'real_step' ? 'available' : 'pause',
    conditions: [condition],
    temporaryOpenUntilIso: rule.currentUnlockUntilIso,
    lastUpdated: rule.lastUpdated,
  };
}

export function normalizePersonalCompositeScreenTimeRules(value: unknown): PersonalCompositeScreenTimeRule[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value.flatMap((candidate) => {
    const rule = normalizePersonalCompositeScreenTimeRule(candidate);
    if (!rule || ids.has(rule.id)) return [];
    ids.add(rule.id);
    return [rule];
  });
}
