import { createFoodScenarioRepository } from './foodScenarioRepository';

describe('Food scenario repository', () => {
  it('maps private scenario rows and uses versioned decisions', async () => {
    const row = { id: 'scenario-1', owner_person_id: 'person-1', version: 2, baseline: { mealPlanId: 'plan-1', mealPlanVersion: 3, groceryListId: 'list-1', groceryListVersion: 4, contentHash: 'hash' }, opportunity_ids: [], constraint_ids: [], meal_plan_diffs: [], grocery_diffs: [], estimate_range_cents: { min: 5000, max: 6000 }, current_price_coverage_percent: 75, evidence_observed_at: '2026-08-05T12:00:00.000Z', assumptions: [], lifecycle: 'proposed', content_hash: 'scenario-hash' };
    const chain: any = { select: jest.fn(), eq: jest.fn(), maybeSingle: jest.fn().mockResolvedValue({ data: row, error: null }) }; chain.select.mockReturnValue(chain); chain.eq.mockReturnValue(chain);
    const rpc = jest.fn().mockResolvedValue({ data: { lifecycle: 'accepted' }, error: null });
    const repository = createFoodScenarioRepository({ from: jest.fn(() => chain), rpc } as never);
    await expect(repository.get('scenario-1')).resolves.toMatchObject({ id: 'scenario-1', version: 2, currentPriceCoveragePercent: 75 });
    await repository.decide('scenario-1', 2, 'accept'); await repository.recordPurchase('opp-1');
    expect(rpc).toHaveBeenNthCalledWith(1, 'decide_kwilt_food_scenario', { p_scenario_id: 'scenario-1', p_expected_version: 2, p_decision: 'accept' });
    expect(rpc).toHaveBeenNthCalledWith(2, 'record_kwilt_store_opportunity_purchase', { p_opportunity_id: 'opp-1' });
  });
});
