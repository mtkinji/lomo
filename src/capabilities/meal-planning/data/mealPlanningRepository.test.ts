import { createMealPlanningRepository, mapMealPlanRow } from './mealPlanningRepository';

describe('Meal Planning repository', () => {
  it('creates, opens, responds, finalizes, and revises only through authority RPCs', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: {}, error: null });
    const repository = createMealPlanningRepository({ rpc } as never);
    await repository.create({ householdId: 'household-1', horizon: { kind: 'next_shop', shopBy: null }, candidates: [] });
    await repository.openRound({ planId: 'plan-1', expectedVersion: 1, participantMembershipIds: ['member-1'], closesAt: null });
    await repository.submitResponse({ roundId: 'round-1', expectedRoundVersion: 1, selectedCandidateIds: [], pass: true, suggestion: null });
    const occasions = [{ id: 'occasion-1', title: null, placementDate: null, dishes: [{ id: 'dish-1', candidateId: 'candidate-1', dinerPersonIds: ['person-1'], servings: 1 }] }];
    await repository.finalize({ planId: 'plan-1', expectedVersion: 2, occasions, organizerNote: null });
    await repository.revise('plan-1', 3);
    expect(rpc.mock.calls.map((call) => call[0])).toEqual([
      'create_kwilt_meal_plan','open_kwilt_meal_choice_round','submit_kwilt_meal_choice_response','finalize_kwilt_meal_plan','revise_kwilt_meal_plan',
    ]);
    expect(rpc.mock.calls[3][1]).toEqual(expect.objectContaining({
      p_idempotency_key: 'finalize:plan-1:v2',
      p_content_hash: expect.stringMatching(/^fnv1a32:/),
      p_occasions: occasions,
    }));
  });

  it('never queues a response when offline', async () => {
    const repository = createMealPlanningRepository({ rpc: jest.fn().mockRejectedValue(new Error('offline')) } as never);
    await expect(repository.submitResponse({ roundId: 'round-1', expectedRoundVersion: 1, selectedCandidateIds: ['candidate-1'], pass: false, suggestion: null })).rejects.toThrow('offline');
  });

  it('projects only the latest immutable entry and occasion version', () => {
    const projection = mapMealPlanRow({
      id: 'plan-1', household_id: 'household-1', version: 4, state: 'finalized',
      horizon: { kind: 'next_shop', shopBy: null }, updated_at: '2026-08-07T00:00:00.000Z',
      candidates: [], rounds: [],
      occasions: [
        { id: 'old-occasion', plan_version: 2, position: 0, title: null, placement_date: null, not_eating_person_ids: [] },
        { id: 'current-occasion', plan_version: 4, position: 0, title: null, placement_date: null, not_eating_person_ids: [] },
      ],
      entries: [
        { id: 'old-dish', plan_version: 2, position: 0, occasion_id: 'old-occasion', candidate_id: 'candidate-old', title: 'Old', servings: 2, placement_date: null, diner_person_ids: [] },
        { id: 'current-dish', plan_version: 4, position: 0, occasion_id: 'current-occasion', candidate_id: 'candidate-current', title: 'Current', servings: 2, placement_date: null, diner_person_ids: [] },
      ],
    });

    expect(projection.entries.map((entry) => entry.id)).toEqual(['current-dish']);
    expect(projection.occasions.map((occasion) => occasion.id)).toEqual(['current-occasion']);
  });
});
