import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveMoneyHouseholdScope } from './moneyHouseholdScope';
import { getLivingPlanSettings } from './livingPlanRepository';
import { previewLivingPlanOverride } from '../runtime/livingPlanReconciliation';

function setup() {
  const filters: Array<{ table: string; key: string; value: unknown }> = [];
  const results: Record<string, unknown> = { budget_living_target_intents: { living_percent: 70 }, budget_living_plan_config: { promotion_enabled: true } };
  const rpc = jest.fn().mockResolvedValue({ data: 'household-owner', error: null });
  const client = {
    rpc, auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'caregiver' } }, error: null }) },
    from(table: string) {
      const result = { data: results[table] ?? (table === 'budget_active_living_plans' || table === 'budget_planning_basis_overrides' ? null : []), error: null };
      const query = {
        select: () => query, eq: (key: string, value: unknown) => { filters.push({ table, key, value }); return query; },
        order: () => query, limit: () => query, range: () => query, maybeSingle: async () => result,
        then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
      };
      return query;
    },
  };
  return { client: client as unknown as SupabaseClient, rpc, filters };
}
describe('category preview household scope', () => {
  it('uses the canonical owner for all settings and preview reads for a caregiver', async () => {
    const { client, rpc, filters } = setup();
    const scope = await resolveMoneyHouseholdScope(client, 'caregiver');
    expect(scope).toEqual({ actorUserId: 'caregiver', ownerUserId: 'household-owner' });
    const settings = await getLivingPlanSettings(client, scope.ownerUserId);
    expect(settings.promotionEnabled).toBe(true);
    await previewLivingPlanOverride(client, 'food', 10000, {}, scope.ownerUserId);
    expect(filters.filter((filter) => filter.key === 'user_id').length).toBeGreaterThan(10);
    expect(filters.filter((filter) => filter.key === 'user_id').every((filter) => filter.value === 'household-owner')).toBe(true);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('budget_effective_owner_user_id');
  });
  it('does not fall back to an actor-owned plan when household lookup fails', async () => {
    const { client, rpc, filters } = setup();
    rpc.mockResolvedValue({ data: null, error: { message: 'Unavailable' } });
    await expect(resolveMoneyHouseholdScope(client, 'caregiver')).rejects.toEqual({ message: 'Unavailable' });
    expect(filters).toEqual([]);
  });
  it('rejects an account change before the preview starts', async () => {
    const { client, rpc } = setup();
    await expect(resolveMoneyHouseholdScope(client, 'different-actor')).rejects.toThrow('account');
    expect(rpc).not.toHaveBeenCalled();
  });
  it('rejects a child or signed-out scope with no effective owner', async () => {
    const { client, rpc } = setup(); rpc.mockResolvedValue({ data: null, error: null });
    await expect(resolveMoneyHouseholdScope(client, 'caregiver')).rejects.toThrow('adult');
  });
});
