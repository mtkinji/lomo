import catalog from './personalRuleConditionCatalog.json';
import type { PersonalRuleCondition } from './personalCompositeScreenTimeRule';
import type { RuleTruth } from './personalRuleExpression';

export type PersonalRuleEvidence = { value: boolean; observedAtMs: number; expiresAtMs: number };
export function resolvePersonalRuleEvidence(evidence: PersonalRuleEvidence | undefined, nowMs: number): RuleTruth {
  if (!evidence || typeof evidence.value !== 'boolean' || !Number.isFinite(nowMs)
    || !Number.isFinite(evidence.observedAtMs) || !Number.isFinite(evidence.expiresAtMs)
    || evidence.observedAtMs > nowMs || evidence.expiresAtMs <= nowMs
    || evidence.expiresAtMs <= evidence.observedAtMs) return 'unknown';
  return evidence.value;
}
export function buildPersonalRuleHostEvidence(conditions: PersonalRuleCondition[], values: Record<string, boolean>, nowMs: number): Record<string, PersonalRuleEvidence> {
  return Object.fromEntries(conditions.flatMap(condition => {
    const definition = catalog[condition.type];
    const value = values[condition.id];
    if (definition.source !== 'host' || typeof value !== 'boolean') return [];
    return [[condition.id, { value, observedAtMs: nowMs, expiresAtMs: nowMs + definition.maxAgeMs }]];
  }));
}
