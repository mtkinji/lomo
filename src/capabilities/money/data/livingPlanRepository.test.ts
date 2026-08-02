import type { SupabaseClient } from '@supabase/supabase-js';
import {
  applyGovernedCategoryPlanChange,
  getLivingPlanReceiptDetail,
  holdLivingPlanCandidate,
  savePlanningBasisOverride,
} from './livingPlanRepository';
import type { LivingPlanCandidate } from '../domain/living-plan';

function createClient() {
  const calls: Array<{ table: string; upsert?: Record<string, unknown>; options?: { onConflict?: string } }> = [];
  const client = {
    auth: { getUser: jest.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })) },
    from(table: string) {
      const call = { table } as typeof calls[number];
      calls.push(call);
      return {
        upsert: async (value: Record<string, unknown>, options?: { onConflict?: string }) => {
          call.upsert = value;
          call.options = options;
          return { error: null };
        },
      };
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

describe('living plan governed persistence', () => {
  it('commits the category input and promoted plan through one RPC', async () => {
    const candidate = {
      periodId: '2026-07', livingPercent: 80, allocatorVersion: 'living-plan-v2', evidenceHash: 'evidence-1',
      candidateHash: 'candidate-1', status: 'ready', resourceBasisCents: 500_000, targetCents: 400_000,
      plannedCents: 400_000, unassignedCents: 0, overTargetCents: 0, allocations: [],
    } satisfies LivingPlanCandidate;
    const rpc = jest.fn(async () => ({ data: 'version-2', error: null }));
    const client = { rpc } as unknown as SupabaseClient;

    await expect(applyGovernedCategoryPlanChange(client, {
      planCategoryId: '00000000-0000-0000-0000-000000000001',
      allocationCategoryId: 'food',
      amountCents: 75_000,
      fundingRhythm: 'reserve',
      expectedNeedCents: 300_000,
      expectedNeedDueMonth: '2026-12',
      expectedActiveVersionId: 'version-1',
      candidate,
      comparison: { outcome: 'material', materialReasons: ['funding_policy_changed'], changedCategoryIds: ['food'], reversible: true },
      trigger: 'category_changed',
      cause: 'A category plan change updated 1 category contribution.',
    })).resolves.toBe('version-2');

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('apply_governed_category_plan_change', expect.objectContaining({
      p_plan_category_id: '00000000-0000-0000-0000-000000000001',
      p_allocation_category_id: 'food',
      p_budget_cents: 75_000,
      p_funding_rhythm: 'reserve',
      p_expected_need_cents: 300_000,
      p_expected_need_due_month: '2026-12',
      expected_active_version_id: 'version-1',
      candidate,
      components: candidate.allocations,
      receipt: expect.objectContaining({ outcome: 'material', changedCategoryIds: ['food'] }),
    }));
  });

  it('turns an active-version conflict into a review-again error', async () => {
    const candidate = {
      periodId: '2026-07', livingPercent: 80, allocatorVersion: 'living-plan-v2', evidenceHash: 'evidence-1',
      candidateHash: 'candidate-1', status: 'ready', resourceBasisCents: 500_000, targetCents: 400_000,
      plannedCents: 400_000, unassignedCents: 0, overTargetCents: 0, allocations: [],
    } satisfies LivingPlanCandidate;
    const client = {
      rpc: jest.fn(async () => ({ data: null, error: { message: 'active living plan changed' } })),
    } as unknown as SupabaseClient;

    await expect(applyGovernedCategoryPlanChange(client, {
      planCategoryId: '00000000-0000-0000-0000-000000000001', allocationCategoryId: 'food',
      amountCents: 75_000, fundingRhythm: 'monthly', expectedNeedCents: null, expectedNeedDueMonth: null,
      expectedActiveVersionId: 'version-1', candidate,
      comparison: { outcome: 'material', materialReasons: ['allocation_changed'], changedCategoryIds: ['food'], reversible: true },
      trigger: 'category_changed', cause: 'Changed.',
    })).rejects.toThrow('changed since you reviewed');
  });

  it('reconstructs the committed limit facts and category values from receipt versions', async () => {
    const selected = new Map<string, string>();
    const results: Record<string, { data: unknown; error: null }> = {
      budget_living_plan_receipts: { data: {
        id: 'receipt-1', user_id: 'user-1', plan_version_id: 'version-2', prior_version_id: 'version-1',
        trigger: 'category_changed', outcome: 'material', cause: 'Changed.', changed_category_ids: ['food'],
        material_reasons: ['allocation_changed'], seen_at: null,
      }, error: null },
      budget_active_living_plans: { data: { plan_version_id: 'version-2' }, error: null },
      budget_living_plan_components: { data: [
        { plan_version_id: 'version-1', category_id: 'home', amount_cents: 200000, fixed_cents: 200000, override_cents: 0 },
        { plan_version_id: 'version-1', category_id: 'food', amount_cents: 140000, fixed_cents: 0, override_cents: 0 },
        { plan_version_id: 'version-2', category_id: 'home', amount_cents: 200000, fixed_cents: 200000, override_cents: 0 },
        { plan_version_id: 'version-2', category_id: 'food', amount_cents: 150000, fixed_cents: 0, override_cents: 0 },
      ], error: null },
      budget_living_plan_versions: { data: [
        { id: 'version-1', candidate_hash: 'candidate-1', living_percent: 70, resource_basis_cents: 500000, target_cents: 350000, planned_cents: 340000, unassigned_cents: 10000, over_target_cents: 0 },
        { id: 'version-2', candidate_hash: 'candidate-2', living_percent: 70, resource_basis_cents: 500000, target_cents: 350000, planned_cents: 350000, unassigned_cents: 0, over_target_cents: 0 },
      ], error: null },
    };
    const client = {
      auth: { getUser: jest.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })) },
      from(table: string) {
        const result = results[table];
        const query = {
          select(columns: string) { selected.set(table, columns); return query; },
          eq() { return query; },
          in() { return query; },
          single: () => Promise.resolve(result),
          then: (resolve: (value: typeof result) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject),
        };
        return query;
      },
    } as unknown as SupabaseClient;

    const detail = await getLivingPlanReceiptDetail(client, 'receipt-1');

    expect(selected.get('budget_living_plan_versions')).toContain('candidate_hash');
    expect(selected.get('budget_living_plan_components')).toContain('fixed_cents');
    expect(detail.after).toEqual({
      candidateHash: 'candidate-2', livingPercent: 70, resourceBasisCents: 500000, targetCents: 350000,
      plannedCents: 350000, unassignedCents: 0, overTargetCents: 0,
      protectedPlanCents: 200000, flexibleCapacityCents: 150000,
    });
    expect(detail.changed).toEqual([{ categoryId: 'food', beforeCents: 140000, afterCents: 150000 }]);
  });

  it('saves one user-governed planning basis', async () => {
    const { client, calls } = createClient();

    await savePlanningBasisOverride(client, 450_000);

    expect(calls).toEqual([{
      table: 'budget_planning_basis_overrides',
      options: { onConflict: 'user_id' },
      upsert: expect.objectContaining({
        user_id: 'user-1',
        monthly_basis_cents: 450_000,
        active: true,
        provenance: 'user_set',
      }),
    }]);
  });

  it('holds an automatic candidate for the next period without promoting it', async () => {
    const { client, calls } = createClient();
    const candidate = {
      periodId: '2026-07',
      livingPercent: 80,
      allocatorVersion: 'living-plan-v2',
      evidenceHash: 'evidence-1',
      candidateHash: 'candidate-1',
      status: 'ready',
      resourceBasisCents: 500_000,
      targetCents: 400_000,
      plannedCents: 400_000,
      unassignedCents: 0,
      overTargetCents: 0,
      allocations: [],
    } satisfies LivingPlanCandidate;

    await holdLivingPlanCandidate(client, {
      activationPeriodId: '2026-08',
      candidate,
      trigger: 'sync_evidence_changed',
      cause: 'New account history prepared next month’s plan.',
    });

    expect(calls[0]).toMatchObject({
      table: 'budget_held_living_plan_candidates',
      options: { onConflict: 'user_id' },
      upsert: {
        user_id: 'user-1',
        activation_period_id: '2026-08',
        candidate,
        trigger: 'sync_evidence_changed',
        cause: 'New account history prepared next month’s plan.',
        evidence_hash: 'evidence-1',
        updated_at: expect.any(String),
      },
    });
  });
});
