import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActiveLivingPlan } from './livingPlanRepository';
import { getMoneyPlanLimitEvidence } from './moneyPlanLimitEvidence';

type Result = { data: unknown; error: { code?: string; message?: string } | null };

function clientWith(results: Record<string, Result>): SupabaseClient {
  return {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: () => Promise.resolve(results[table]),
        then: (resolve: (value: Result) => unknown, reject?: (reason: unknown) => unknown) => (
          Promise.resolve(results[table]).then(resolve, reject)
        ),
      };
      return query;
    },
  } as unknown as SupabaseClient;
}

const active = {
  versionId: 'version-1', evidenceHash: 'evidence-1', resourceBasisCents: 500000, status: 'ready',
} as ActiveLivingPlan;

describe('getMoneyPlanLimitEvidence', () => {
  it('recognizes a matching user-set basis before detected income', async () => {
    const result = await getMoneyPlanLimitEvidence(clientWith({
      budget_planning_basis_overrides: { data: { monthly_basis_cents: 500000, updated_at: '2026-07-24T13:00:00Z' }, error: null },
      budget_planning_income_sources: { data: [{ confidence: 'high', planning_role: 'recurring_planning_income', expected_monthly_cents: 500000, updated_at: '2026-07-24T12:00:00Z' }], error: null },
    }), active);

    expect(result).toEqual({ resourceBasisKind: 'user_set', resourceBasisUpdatedAtIso: '2026-07-24T13:00:00Z' });
  });

  it('recognizes matching high-confidence eligible detected income', async () => {
    const result = await getMoneyPlanLimitEvidence(clientWith({
      budget_planning_basis_overrides: { data: null, error: null },
      budget_planning_income_sources: { data: [
        { confidence: 'high', planning_role: 'recurring_planning_income', expected_monthly_cents: 300000, updated_at: '2026-07-23T12:00:00Z' },
        { confidence: 'high', planning_role: 'irregular_planning_income', expected_monthly_cents: 200000, updated_at: '2026-07-24T12:00:00Z' },
        { confidence: 'medium', planning_role: 'recurring_planning_income', expected_monthly_cents: 99999, updated_at: '2026-07-25T12:00:00Z' },
      ], error: null },
    }), active);

    expect(result).toEqual({ resourceBasisKind: 'detected_income', resourceBasisUpdatedAtIso: '2026-07-24T12:00:00Z' });
  });

  it('reports a deliberately retained prior basis when the active plan is blocked', async () => {
    const result = await getMoneyPlanLimitEvidence(clientWith({
      budget_planning_basis_overrides: { data: null, error: null },
      budget_planning_income_sources: { data: [], error: null },
    }), { ...active, status: 'blocked' });

    expect(result).toEqual({ resourceBasisKind: 'prior_supported_basis', resourceBasisUpdatedAtIso: null });
  });

  it('returns unknown when evidence does not reconcile or an optional table is missing', async () => {
    const mismatched = await getMoneyPlanLimitEvidence(clientWith({
      budget_planning_basis_overrides: { data: null, error: null },
      budget_planning_income_sources: { data: [{ confidence: 'high', planning_role: 'recurring_planning_income', expected_monthly_cents: 450000, updated_at: '2026-07-24T12:00:00Z' }], error: null },
    }), active);
    expect(mismatched.resourceBasisKind).toBe('unknown');

    const missing = await getMoneyPlanLimitEvidence(clientWith({
      budget_planning_basis_overrides: { data: null, error: { code: 'PGRST205', message: 'table missing' } },
      budget_planning_income_sources: { data: null, error: { code: 'PGRST205', message: 'table missing' } },
    }), active);
    expect(missing).toEqual({ resourceBasisKind: 'unknown', resourceBasisUpdatedAtIso: null });
  });
});
