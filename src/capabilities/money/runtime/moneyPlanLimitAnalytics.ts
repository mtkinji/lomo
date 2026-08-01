import type { AnalyticsProps } from '../../../services/analytics/analytics';
import type { MoneyPlanLimitAnswer } from '../domain/moneyPlanLimitAnswer';
import type { MoneyRebalanceAnswer } from '../domain/moneyRebalanceAnswer';

export function buildMoneyBudgetAnswerViewedProps(input: {
  answer: MoneyPlanLimitAnswer;
  periodRelation: 'current' | 'past' | 'future';
}): AnalyticsProps {
  return {
    state: input.answer.state,
    period_relation: input.periodRelation,
    freshness_bucket: input.answer.facts.freshness,
    projection_version: input.answer.facts.policyVersion,
  };
}

export function buildMoneyBudgetExplanationOpenedProps(input: {
  answer: MoneyPlanLimitAnswer;
  surface: 'budget';
}): AnalyticsProps {
  return { state: input.answer.state, surface: input.surface };
}

export function buildMoneyRebalancePreviewViewedProps(input: { answer: MoneyRebalanceAnswer }): AnalyticsProps {
  return {
    outcome_class: input.answer.state,
    changed_count_bucket: countBucket(input.answer.changedCategories.length),
    used_unassigned: input.answer.state === 'within_unassigned',
  };
}

export function buildMoneyRebalanceChangesOpenedProps(input: { changedCount: number }): AnalyticsProps {
  return { changed_count_bucket: countBucket(input.changedCount) };
}

export function buildMoneyRebalanceOutcomeProps(input: {
  outcome: 'saved' | 'cancelled' | 'stale_rejected';
  answerState: MoneyRebalanceAnswer['state'];
}): AnalyticsProps {
  return { outcome: input.outcome, outcome_class: input.answerState };
}

export function buildMoneyBudgetRecoveryInvokedProps(input: {
  reason: 'stale' | 'missing_income' | 'needs_meaning' | 'insufficient_meaning';
}): AnalyticsProps {
  return { recovery_reason: input.reason };
}

function countBucket(count: number): 'none' | 'one' | 'two' | 'three_or_more' {
  if (count <= 0) return 'none';
  if (count === 1) return 'one';
  if (count === 2) return 'two';
  return 'three_or_more';
}
