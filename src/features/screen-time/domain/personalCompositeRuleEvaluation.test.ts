import { evaluatePersonalCompositeRule } from './personalCompositeRuleEvaluation';
import type { PersonalCompositeScreenTimeRule } from './personalCompositeScreenTimeRule';

const rule: PersonalCompositeScreenTimeRule = {
  id: 'rule-social-evening', selectionId: 'selection-social', selectedApps: [],
  selectedCategories: [{ token: 'social', label: 'Social' }], enabled: true,
  setupCompleted: true, connector: 'all', outcome: 'available',
  conditions: [
    { id: 'after-five', type: 'time_of_day', operator: 'after', minuteOfDay: 1020 },
    { id: 'under-limit', type: 'daily_usage', operator: 'below', minutes: 15 },
  ], lastUpdated: null,
};

describe('evaluatePersonalCompositeRule', () => {
  it('makes Social available only when every ALL condition is true', () => {
    expect(evaluatePersonalCompositeRule(rule, { 'after-five': true, 'under-limit': true }))
      .toEqual({ status: 'available', matched: true });
    expect(evaluatePersonalCompositeRule(rule, { 'after-five': true, 'under-limit': false }))
      .toEqual({ status: 'paused', matched: false });
  });

  it('supports an explicit OR connector', () => {
    expect(evaluatePersonalCompositeRule({ ...rule, connector: 'any', outcome: 'pause' }, {
      'after-five': false,
      'under-limit': true,
    })).toEqual({ status: 'paused', matched: true });
  });

  it('preserves unknown until known values determine the result', () => {
    expect(evaluatePersonalCompositeRule(rule, { 'after-five': true, 'under-limit': 'unknown' }))
      .toEqual({ status: 'unknown', matched: null });
    expect(evaluatePersonalCompositeRule(rule, { 'after-five': false, 'under-limit': 'unknown' }))
      .toEqual({ status: 'paused', matched: false });
    expect(evaluatePersonalCompositeRule({ ...rule, connector: 'any' }, {
      'after-five': true,
      'under-limit': 'unknown',
    })).toEqual({ status: 'available', matched: true });
  });

  it('inverts availability for pause outcomes', () => {
    expect(evaluatePersonalCompositeRule({ ...rule, outcome: 'pause' }, {
      'after-five': true,
      'under-limit': true,
    })).toEqual({ status: 'paused', matched: true });
    expect(evaluatePersonalCompositeRule({ ...rule, outcome: 'pause' }, {
      'after-five': false,
      'under-limit': true,
    })).toEqual({ status: 'available', matched: false });
  });
});
