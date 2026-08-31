import {
  buildPersonalCompositeConditionExplanations,
  personalCompositeConditionRulePhrase,
  selectPersonalCompositeBlockingDetails,
} from './personalCompositeRuleExplanation';
import type { PersonalCompositeScreenTimeRule } from './personalCompositeScreenTimeRule';

const rule: PersonalCompositeScreenTimeRule = {
  id: 'rule-social-evening',
  selectionId: 'selection-social',
  selectedApps: [],
  selectedCategories: [{ token: 'social', label: 'Social' }],
  enabled: true,
  setupCompleted: true,
  connector: 'all',
  outcome: 'available',
  conditions: [
    { id: 'after-eight', type: 'time_of_day', operator: 'after', minuteOfDay: 1200 },
    { id: 'under-limit', type: 'daily_usage', operator: 'below', minutes: 15 },
  ],
  lastUpdated: null,
};

describe('personal composite rule explanations', () => {
  it('builds stable matched and unmatched copy for every condition', () => {
    expect(buildPersonalCompositeConditionExplanations(rule)).toEqual([
      {
        conditionId: 'after-eight',
        whenMatched: "It's after 8:00 PM.",
        whenUnmatched: "It's before 8:00 PM. Try again after 8:00 PM.",
      },
      {
        conditionId: 'under-limit',
        whenMatched: 'Daily use is under 15 minutes.',
        whenUnmatched: 'Daily use reached 15 minutes. Try again tomorrow or change this rule.',
      },
    ]);
  });

  it('selects only known condition states that currently cause an available-outcome rule to pause', () => {
    expect(selectPersonalCompositeBlockingDetails({
      rule,
      truth: { 'after-eight': false, 'under-limit': false },
    })).toEqual([
      "It's before 8:00 PM. Try again after 8:00 PM.",
      'Daily use reached 15 minutes. Try again tomorrow or change this rule.',
    ]);
    expect(selectPersonalCompositeBlockingDetails({
      rule,
      truth: { 'after-eight': true, 'under-limit': 'unknown' },
    })).toEqual([]);
  });

  it('uses matching conditions as blockers for a pause-outcome rule', () => {
    expect(selectPersonalCompositeBlockingDetails({
      rule: { ...rule, connector: 'any', outcome: 'pause' },
      truth: { 'after-eight': true, 'under-limit': false },
    })).toEqual(["It's after 8:00 PM."]);
  });

  it('explains Focus, real-step, usage, time, and Money conditions truthfully', () => {
    const conditions: PersonalCompositeScreenTimeRule['conditions'] = [
      { id: 'real', type: 'real_step_complete', operator: 'is_not' },
      { id: 'focus', type: 'focus_active', operator: 'is', value: true },
      { id: 'usage', type: 'daily_usage', operator: 'reaches', minutes: 1 },
      { id: 'before', type: 'time_of_day', operator: 'before', minuteOfDay: 30 },
      {
        id: 'budget', type: 'budget', categorySourceId: 'shopping', categoryName: 'Shopping',
        preset: 'at_95_percent',
      },
    ];
    const explanations = buildPersonalCompositeConditionExplanations({ ...rule, conditions });

    expect(explanations).toEqual([
      {
        conditionId: 'real',
        whenMatched: 'No to-do, progress update, or Focus is complete yet.',
        whenUnmatched: 'A to-do, progress update, or Focus is already complete.',
      },
      {
        conditionId: 'focus',
        whenMatched: 'Focus is active. End Focus to continue.',
        whenUnmatched: 'Focus is not active. Start Focus to continue.',
      },
      {
        conditionId: 'usage',
        whenMatched: 'Daily use reached 1 minute. Try again tomorrow or change this rule.',
        whenUnmatched: 'Daily use is under 1 minute.',
      },
      {
        conditionId: 'before',
        whenMatched: "It's before 12:30 AM.",
        whenUnmatched: "It's after 12:30 AM. Try again before 12:30 AM.",
      },
      {
        conditionId: 'budget',
        whenMatched: 'Shopping reached 95% of its plan. Review it in Kwilt Money.',
        whenUnmatched: 'Shopping is below 95% of its plan.',
      },
    ]);
  });

  it('shares the rule-summary phrases used in the inventory', () => {
    expect(rule.conditions.map(personalCompositeConditionRulePhrase)).toEqual([
      'after 8:00 PM',
      'while daily use is under 15 minutes',
    ]);
  });
});
