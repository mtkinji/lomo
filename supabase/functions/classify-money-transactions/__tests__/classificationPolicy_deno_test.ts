import { isMoneyClassifierCandidate } from '../classificationPolicy.ts';

const base = { pending: false, direction: 'outflow', budget_id: null, budget_match_source: null, budget_assignment_source: null, budget_assignment_governed: false, money_meaning: null, hasAllocation: false };

Deno.test('classifier candidates exclude every higher-precedence assignment and split', () => {
  if (!isMoneyClassifierCandidate(base)) throw new Error('unresolved outflow should be eligible');
  const excluded = [
    { ...base, hasAllocation: true },
    { ...base, budget_match_source: 'corrected' },
    { ...base, budget_match_source: 'excluded' },
    { ...base, budget_match_source: 'merchant_rule' },
    { ...base, budget_assignment_source: 'provider_policy' },
    { ...base, budget_assignment_governed: true },
    { ...base, budget_id: 'food' },
    { ...base, pending: true },
  ];
  if (excluded.some(isMoneyClassifierCandidate)) throw new Error('higher-precedence row was eligible');
});
