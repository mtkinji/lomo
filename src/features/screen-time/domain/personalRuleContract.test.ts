import fixtures from './fixtures/personal-rule-contract.json';
import { evaluatePersonalCompositeRule, resolvePersonalRuleCondition } from './personalCompositeRuleEvaluation';
import type { PersonalCompositeScreenTimeRule, PersonalRuleCondition } from './personalCompositeScreenTimeRule';
import { validRuleExpression, type RuleTruth } from './personalRuleExpression';

describe('shared JavaScript/native rule contract', () => {
  it.each(fixtures.validation)('validates $name', f => {
    expect(validRuleExpression(f.expression, f.conditionIds) && f.expression.connector === f.connector).toBe(f.valid);
  });
  it.each(fixtures.expressions)('$name', fixture => {
    const rule = { ...fixture, enabled: true, conditions: fixture.conditionIds.map(id => ({ id })) } as unknown as PersonalCompositeScreenTimeRule;
    const truth = Object.fromEntries(Object.entries(fixture.truth).map(([id, value]) => [id, value === 'unknown' ? value : value === 'true'])) as Record<string, RuleTruth>;
    expect(evaluatePersonalCompositeRule(rule, truth).status).toBe(fixture.expected);
  });
  it.each(fixtures.signals)('$name', fixture => {
    const f = fixture as typeof fixture & { usageDay?: string; usageReached?: boolean; evidence?: { value: boolean; observedAtMs: number; expiresAtMs: number } };
    const condition = f.condition as PersonalRuleCondition;
    const truth = resolvePersonalRuleCondition(condition, {
      minuteOfDay: f.minuteOfDay, dayOfWeek: f.dayOfWeek, nowMs: f.nowMs,
      hostEvidence: f.evidence ? { [condition.id]: f.evidence } : {},
      focusActive: null, realStepComplete: null,
      dailyUsageMinutes: f.usageDay === f.localDay && typeof f.usageReached === 'boolean' ? f.usageReached ? 15 : 0 : null,
    });
    expect(String(truth)).toBe(f.expected);
  });
});
