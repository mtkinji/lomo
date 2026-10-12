import { resolvePersonalRuleEvidence, type PersonalRuleEvidence } from './personalRuleEvidence';
import catalog from './personalRuleConditionCatalog.json';
import { evaluateRuleExpression, flatRuleExpression } from './personalRuleExpression';
import type {
  PersonalCompositeScreenTimeRule,
  PersonalRuleCondition,
} from './personalCompositeScreenTimeRule';

export type PersonalRuleConditionTruth = Record<string, boolean | 'unknown'>;
export type PersonalCompositeRuleEvaluation = {
  status: 'available' | 'paused' | 'unknown';
  matched: boolean | null;
};

export function evaluatePersonalCompositeRule(
  rule: PersonalCompositeScreenTimeRule,
  truth: PersonalRuleConditionTruth,
): PersonalCompositeRuleEvaluation {
  if (!rule.enabled) return { status: 'available', matched: false };
  const result = evaluateRuleExpression(rule.expression ?? flatRuleExpression(rule.connector, rule.conditions.map(c => c.id)), truth);
  const matched = result === 'unknown' ? null : result;
  if (matched === null) return { status: 'unknown', matched: null };
  const available = rule.outcome === 'available' ? matched : !matched;
  return { status: available ? 'available' : 'paused', matched };
}

export type PersonalRuleEvaluationContext = {
  minuteOfDay: number;
  /** Local ISO weekday: Monday = 1, Sunday = 7. */
  dayOfWeek?: number;
  dailyUsageMinutes: number | null;
  focusActive: boolean | null;
  realStepComplete: boolean | null;
  budgetConditionTruth?: Record<string, boolean>;
  hostEvidence?: Record<string, PersonalRuleEvidence>;
  nowMs?: number;
};

export function resolvePersonalRuleCondition(
  condition: PersonalRuleCondition,
  context: PersonalRuleEvaluationContext,
): boolean | 'unknown' {
  if (catalog[condition.type].source === 'host' && context.hostEvidence !== undefined) {
    const evidence = context.hostEvidence[condition.id];
    if (evidence && evidence.expiresAtMs - evidence.observedAtMs > catalog[condition.type].maxAgeMs) return 'unknown';
    const value = resolvePersonalRuleEvidence(evidence, context.nowMs ?? Number.NaN);
    if (value === 'unknown') return value;
    return 'operator' in condition && condition.operator === 'is_not' ? !value : value;
  }
  if (condition.type === 'real_step_complete') {
    if (context.realStepComplete === null) return 'unknown';
    return condition.operator === 'is_not' ? !context.realStepComplete : context.realStepComplete;
  }
  if (condition.type === 'focus_active') {
    if (context.focusActive === null) return 'unknown';
    return condition.operator === 'is' ? context.focusActive : !context.focusActive;
  }
  if (condition.type === 'daily_usage') {
    if (context.dailyUsageMinutes === null) return 'unknown';
    return condition.operator === 'below'
      ? context.dailyUsageMinutes < condition.minutes
      : context.dailyUsageMinutes >= condition.minutes;
  }
  if (condition.type === 'day_of_week') {
    if (!Number.isInteger(context.dayOfWeek) || context.dayOfWeek! < 1 || context.dayOfWeek! > 7) return 'unknown';
    const included = condition.days.includes(context.dayOfWeek!);
    return condition.operator === 'is' ? included : !included;
  }
  if (condition.type === 'budget') return context.budgetConditionTruth?.[condition.id] ?? 'unknown';
  return condition.operator === 'after'
    ? context.minuteOfDay >= condition.minuteOfDay
    : context.minuteOfDay < condition.minuteOfDay;
}

export function evaluatePersonalCompositeRuleAtContext(
  rule: PersonalCompositeScreenTimeRule,
  context: PersonalRuleEvaluationContext,
): PersonalCompositeRuleEvaluation {
  return evaluatePersonalCompositeRule(rule, Object.fromEntries(
    rule.conditions.map((condition) => [condition.id, resolvePersonalRuleCondition(condition, context)]),
  ));
}
