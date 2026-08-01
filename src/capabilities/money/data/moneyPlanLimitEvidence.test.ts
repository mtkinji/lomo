import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActiveLivingPlan } from './livingPlanRepository';
import { getMoneyPlanLimitEvidence } from './moneyPlanLimitEvidence';

type Result = { data: unknown; error: { code?: string; message?: string } | null };

function clientWith(results: Record<string, Result>): SupabaseClient {
  return {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
    from: (table: string) => {
      const filters: Array<[string, unknown]> = [];
      const filteredResult = (): Result => {
        const result = results[table];
        if (!Array.isArray(result.data)) return result;
        return {
          ...result,
          data: result.data.filter((row) => filters.every(([column, value]) => (
            typeof row !== 'object' || row == null || !(column in row) || (row as Record<string, unknown>)[column] === value
          ))),
        };
      };
      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => { filters.push([column, value]); return query; },
        maybeSingle: () => Promise.resolve(filteredResult()),
        then: (resolve: (value: Result) => unknown, reject?: (reason: unknown) => unknown) => (
          Promise.resolve(filteredResult()).then(resolve, reject)
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

  it('keeps matching detected income supported when newer evidence has a different hash', async () => {
    const result = await getMoneyPlanLimitEvidence(clientWith({
      budget_planning_basis_overrides: { data: null, error: null },
      budget_planning_income_sources: { data: [
        { evidence_hash: 'evidence-2', confidence: 'high', planning_role: 'irregular_planning_income', expected_monthly_cents: 500000, updated_at: '2026-07-31T20:35:54Z' },
      ], error: null },
    }), active);

    expect(result).toEqual({ resourceBasisKind: 'detected_income', resourceBasisUpdatedAtIso: '2026-07-31T20:35:54Z' });
  });

  it('reports a deliberately retained prior basis when the active plan is blocked', async () => {
    const result = await getMoneyPlanLimitEvidence(clientWith({
      budget_planning_basis_overrides: { data: null, error: null },
      budget_planning_income_sources: { data: [], error: null },
    }), { ...active, status: 'blocked' });

    expect(result).toEqual({ resourceBasisKind: 'prior_supported_basis', resourceBasisUpdatedAtIso: null });
  });

  it('keeps the active plan basis when optional provenance cannot currently be reloaded', async () => {
    const mismatched = await getMoneyPlanLimitEvidence(clientWith({
      budget_planning_basis_overrides: { data: null, error: null },
      budget_planning_income_sources: { data: [{ confidence: 'high', planning_role: 'recurring_planning_income', expected_monthly_cents: 450000, updated_at: '2026-07-24T12:00:00Z' }], error: null },
    }), active);
    expect(mismatched).toEqual({ resourceBasisKind: 'prior_supported_basis', resourceBasisUpdatedAtIso: null });

    const missing = await getMoneyPlanLimitEvidence(clientWith({
      budget_planning_basis_overrides: { data: null, error: { code: 'PGRST205', message: 'table missing' } },
      budget_planning_income_sources: { data: null, error: { code: 'PGRST205', message: 'table missing' } },
    }), active);
    expect(missing).toEqual({ resourceBasisKind: 'prior_supported_basis', resourceBasisUpdatedAtIso: null });
  });
});
