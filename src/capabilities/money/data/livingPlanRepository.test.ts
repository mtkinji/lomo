import type { SupabaseClient } from '@supabase/supabase-js';
import {
  applyGovernedCategoryPlanChange,
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
