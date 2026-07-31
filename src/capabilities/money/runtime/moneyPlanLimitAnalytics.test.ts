import type { MoneyPlanLimitAnswer } from '../domain/moneyPlanLimitAnswer';
import type { MoneyRebalanceAnswer } from '../domain/moneyRebalanceAnswer';
import {
  buildMoneyBudgetAnswerViewedProps,
  buildMoneyBudgetExplanationOpenedProps,
  buildMoneyBudgetRecoveryInvokedProps,
  buildMoneyRebalanceChangesOpenedProps,
  buildMoneyRebalanceOutcomeProps,
  buildMoneyRebalancePreviewViewedProps,
} from './moneyPlanLimitAnalytics';

const answer = {
  state: 'supported', facts: { freshness: 'fresh', policyVersion: 'money-plan-limit-v1' },
} as MoneyPlanLimitAnswer;
const rebalance = {
  state: 'within_reallocated',
  changedCategories: [{ categoryId: 'secret-category', beforeCents: 1, afterCents: 2, deltaCents: 1 }],
} as MoneyRebalanceAnswer;

describe('money living-limit analytics allowlists', () => {
  it('emits only bounded answer-view metadata', () => {
    const props = buildMoneyBudgetAnswerViewedProps({ answer, periodRelation: 'current' });
    expect(Object.keys(props).sort()).toEqual(['freshness_bucket', 'period_relation', 'projection_version', 'state']);
    expect(JSON.stringify(props)).not.toMatch(/merchant|category|account|amount|income|transaction/i);
  });

  it('keeps every interaction builder free of financial content and identifiers', () => {
    const values = [
      buildMoneyBudgetExplanationOpenedProps({ answer, surface: 'budget' }),
      buildMoneyRebalancePreviewViewedProps({ answer: rebalance }),
      buildMoneyRebalanceChangesOpenedProps({ changedCount: 4 }),
      buildMoneyRebalanceOutcomeProps({ outcome: 'saved', answerState: 'within_reallocated' }),
      buildMoneyRebalanceOutcomeProps({ outcome: 'cancelled', answerState: 'no_change' }),
      buildMoneyRebalanceOutcomeProps({ outcome: 'stale_rejected', answerState: 'within_unassigned' }),
      buildMoneyBudgetRecoveryInvokedProps({ reason: 'needs_meaning' }),
    ];
    expect(JSON.stringify(values)).not.toMatch(/secret|merchant|category_id|account|cents|income|transaction/i);
    expect(values.map((value) => Object.keys(value).sort())).toEqual([
      ['state', 'surface'],
      ['changed_count_bucket', 'outcome_class', 'used_unassigned'],
      ['changed_count_bucket'],
      ['outcome', 'outcome_class'],
      ['outcome', 'outcome_class'],
      ['outcome', 'outcome_class'],
      ['recovery_reason'],
    ]);
  });
});
