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
  const values = rule.conditions.map((condition) => truth[condition.id] ?? 'unknown');
  let matched: boolean | null;
  if (rule.connector === 'all') {
    matched = values.includes(false) ? false : values.includes('unknown') ? null : true;
  } else {
    matched = values.includes(true) ? true : values.includes('unknown') ? null : false;
  }
  if (matched === null) return { status: 'unknown', matched: null };
  const available = rule.outcome === 'available' ? matched : !matched;
  return { status: available ? 'available' : 'paused', matched };
}

export type PersonalRuleEvaluationContext = {
  minuteOfDay: number;
  dailyUsageMinutes: number | null;
  focusActive: boolean | null;
  realStepComplete: boolean | null;
};

export function resolvePersonalRuleCondition(
  condition: PersonalRuleCondition,
  context: PersonalRuleEvaluationContext,
): boolean | 'unknown' {
  if (condition.type === 'real_step_complete') return context.realStepComplete ?? 'unknown';
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
