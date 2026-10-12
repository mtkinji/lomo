import { evaluatePersonalCompositeRule } from './personalCompositeRuleEvaluation';
import { normalizePersonalCompositeScreenTimeRule } from './personalCompositeScreenTimeRule';
import { resolvePersonalRuleEvidence } from './personalRuleEvidence';
import { groupRuleNodes, ungroupRuleNode } from './personalRuleExpression';
import type { PersonalCompositeScreenTimeRule } from './personalCompositeScreenTimeRule';

const rule: PersonalCompositeScreenTimeRule = {
  id: 'grouped', selectionId: 'apps', selectedApps: [{ token: 'app' }], selectedCategories: [],
  enabled: true, setupCompleted: true, connector: 'all', outcome: 'pause', lastUpdated: null,
  conditions: [
    { id: 'days', type: 'day_of_week', operator: 'is', days: [1,2,3,4,5] },
    { id: 'early', type: 'time_of_day', operator: 'before', minuteOfDay: 540 },
    { id: 'late', type: 'time_of_day', operator: 'after', minuteOfDay: 1020 },
  ],
  expression: { type: 'group', id: 'root', connector: 'all', children: [
    { type: 'condition', conditionId: 'days' },
    { type: 'group', id: 'outside', connector: 'any', children: [
      { type: 'condition', conditionId: 'early' }, { type: 'condition', conditionId: 'late' },
    ] },
  ] },
};
it('preserves nested weekday windows and respects their parentheses', () => {
  expect(normalizePersonalCompositeScreenTimeRule(rule)?.expression).toEqual(rule.expression);
  expect(evaluatePersonalCompositeRule(rule, { days: true, early: false, late: true }).status).toBe('paused');
  expect(evaluatePersonalCompositeRule(rule, { days: false, early: true, late: false }).status).toBe('available');
  expect(evaluatePersonalCompositeRule(rule, { days: true, early: false, late: false }).status).toBe('available');
  expect(evaluatePersonalCompositeRule(rule, { days: true, early: 'unknown', late: false }).status).toBe('unknown');
  expect(evaluatePersonalCompositeRule(rule, { days: false, early: 'unknown', late: false }).status).toBe('available');
});
it('rejects expressions that lose, repeat, or invent conditions', () => {
  for (const children of [[], [{ type: 'condition', conditionId: 'missing' }], [
    { type: 'condition', conditionId: 'days' }, { type: 'condition', conditionId: 'days' },
  ]]) expect(normalizePersonalCompositeScreenTimeRule({ ...rule, expression: { ...rule.expression, children } })).toBeNull();
});
it('groups and ungroups without dropping conditions', () => {
  const root = { type: 'group' as const, id: 'root', connector: 'all' as const,
    children: rule.conditions.map(c => ({ type: 'condition' as const, conditionId: c.id })) };
  const grouped = groupRuleNodes(root, ['early', 'late'], 'outside', 'any')!;
  expect(grouped).toEqual(rule.expression);
  expect(ungroupRuleNode(grouped, 'outside')).toEqual(root);
});
it('distinguishes missing, false, expired, future, and current evidence', () => {
  expect(resolvePersonalRuleEvidence(undefined, 100)).toBe('unknown');
  expect(resolvePersonalRuleEvidence({ value: false, observedAtMs: 90, expiresAtMs: 110 }, 100)).toBe(false);
  expect(resolvePersonalRuleEvidence({ value: true, observedAtMs: 90, expiresAtMs: 100 }, 100)).toBe('unknown');
  expect(resolvePersonalRuleEvidence({ value: true, observedAtMs: 101, expiresAtMs: 110 }, 100)).toBe('unknown');
  expect(resolvePersonalRuleEvidence({ value: true, observedAtMs: 90, expiresAtMs: 110 }, 100)).toBe(true);
});
