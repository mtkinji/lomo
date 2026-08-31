import { evaluatePersonalCompositeRule } from './personalCompositeRuleEvaluation';
import type { PersonalRuleConditionTruth } from './personalCompositeRuleEvaluation';
import type {
  PersonalCompositeScreenTimeRule,
  PersonalRuleCondition,
} from './personalCompositeScreenTimeRule';

export type PersonalCompositeConditionExplanation = {
  conditionId: string;
  whenMatched: string;
  whenUnmatched: string;
};

function pluralizedMinutes(minutes: number): string {
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

function timeLabel(minuteOfDay: number): string {
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
}

function budgetRulePhrase(
  condition: Extract<PersonalRuleCondition, { type: 'budget' }>,
): string {
  if (condition.preset === 'always_review') return `until ${condition.categoryName} is reviewed`;
  if (condition.preset === 'when_hot') return `when ${condition.categoryName} spending runs ahead of the month`;
  if (condition.preset === 'at_95_percent') return `when ${condition.categoryName} reaches 95% of its plan`;
  if (condition.preset === 'when_over') return `when ${condition.categoryName} is over its monthly plan`;
  return `while ${condition.categoryName} has transactions to review`;
}

export function personalCompositeConditionRulePhrase(condition: PersonalRuleCondition): string {
  if (condition.type === 'real_step_complete') return 'after a to-do, progress update, or Focus';
  if (condition.type === 'focus_active') {
    return condition.operator === 'is' ? 'while Focus is active' : 'while Focus is not active';
  }
  if (condition.type === 'daily_usage') {
    return condition.operator === 'below'
      ? `while daily use is under ${pluralizedMinutes(condition.minutes)}`
      : `when daily use reaches ${pluralizedMinutes(condition.minutes)}`;
  }
  if (condition.type === 'budget') return budgetRulePhrase(condition);
  return `${condition.operator === 'before' ? 'before' : 'after'} ${timeLabel(condition.minuteOfDay)}`;
}

function budgetExplanation(
  condition: Extract<PersonalRuleCondition, { type: 'budget' }>,
): Omit<PersonalCompositeConditionExplanation, 'conditionId'> {
  const category = condition.categoryName;
  if (condition.preset === 'always_review') {
    return {
      whenMatched: `Review ${category} in Kwilt Money to continue.`,
      whenUnmatched: `${category} has been reviewed.`,
    };
  }
  if (condition.preset === 'when_hot') {
    return {
      whenMatched: `${category} is running ahead of the month. Review it in Kwilt Money.`,
      whenUnmatched: `${category} is not running ahead of the month.`,
    };
  }
  if (condition.preset === 'at_95_percent') {
    return {
      whenMatched: `${category} reached 95% of its plan. Review it in Kwilt Money.`,
      whenUnmatched: `${category} is below 95% of its plan.`,
    };
  }
  if (condition.preset === 'when_over') {
    return {
      whenMatched: `${category} is over its monthly plan. Review it in Kwilt Money.`,
      whenUnmatched: `${category} is not over its monthly plan.`,
    };
  }
  return {
    whenMatched: `${category} has transactions to review. Review them in Kwilt Money.`,
    whenUnmatched: `${category} has no transactions waiting for review.`,
  };
}

function explainCondition(
  condition: PersonalRuleCondition,
): PersonalCompositeConditionExplanation {
  if (condition.type === 'real_step_complete') {
    const complete = 'A to-do, progress update, or Focus is complete.';
    const incomplete = 'No to-do, progress update, or Focus is complete yet.';
    return {
      conditionId: condition.id,
      whenMatched: condition.operator === 'is' ? complete : incomplete,
      whenUnmatched: condition.operator === 'is'
        ? 'Complete a to-do, record progress, or finish Focus.'
        : 'A to-do, progress update, or Focus is already complete.',
    };
  }
  if (condition.type === 'focus_active') {
    const active = 'Focus is active. End Focus to continue.';
    const inactive = 'Focus is not active. Start Focus to continue.';
    return {
      conditionId: condition.id,
      whenMatched: condition.operator === 'is' ? active : inactive,
      whenUnmatched: condition.operator === 'is' ? inactive : active,
    };
  }
  if (condition.type === 'daily_usage') {
    const minutes = pluralizedMinutes(condition.minutes);
    const below = `Daily use is under ${minutes}.`;
    const reached = `Daily use reached ${minutes}. Try again tomorrow or change this rule.`;
    return {
      conditionId: condition.id,
      whenMatched: condition.operator === 'below' ? below : reached,
      whenUnmatched: condition.operator === 'below' ? reached : below,
    };
  }
  if (condition.type === 'time_of_day') {
    const time = timeLabel(condition.minuteOfDay);
    const before = `It's before ${time}.`;
    const after = `It's after ${time}.`;
    return {
      conditionId: condition.id,
      whenMatched: condition.operator === 'before' ? before : after,
      whenUnmatched: condition.operator === 'before'
        ? `It's after ${time}. Try again before ${time}.`
        : `It's before ${time}. Try again after ${time}.`,
    };
  }
  return { conditionId: condition.id, ...budgetExplanation(condition) };
}

export function buildPersonalCompositeConditionExplanations(
  rule: PersonalCompositeScreenTimeRule,
): PersonalCompositeConditionExplanation[] {
  return rule.conditions.map(explainCondition);
}

export function selectPersonalCompositeBlockingDetails(params: {
  rule: PersonalCompositeScreenTimeRule;
  truth: PersonalRuleConditionTruth;
}): string[] {
  if (evaluatePersonalCompositeRule(params.rule, params.truth).status !== 'paused') return [];
  const explanationById = new Map(
    buildPersonalCompositeConditionExplanations(params.rule)
      .map((explanation) => [explanation.conditionId, explanation]),
  );
  return params.rule.conditions.flatMap((condition) => {
    const value = params.truth[condition.id] ?? 'unknown';
    if (value === 'unknown') return [];
    const causesPause = params.rule.outcome === 'pause' ? value : !value;
    if (!causesPause) return [];
    const explanation = explanationById.get(condition.id);
    if (!explanation) return [];
    return [value ? explanation.whenMatched : explanation.whenUnmatched];
  });
}
