import { createMealPlanningRepository } from './mealPlanningRepository';

describe('Meal Planning repository', () => {
  it('creates, opens, responds, finalizes, and revises only through authority RPCs', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: {}, error: null });
    const repository = createMealPlanningRepository({ rpc } as never);
    await repository.create({ householdId: 'household-1', horizon: { kind: 'next_shop', shopBy: null }, candidates: [] });
    await repository.openRound({ planId: 'plan-1', expectedVersion: 1, participantMembershipIds: ['member-1'], closesAt: null });
    await repository.submitResponse({ roundId: 'round-1', expectedRoundVersion: 1, selectedCandidateIds: [], pass: true, suggestion: null });
    await repository.finalize({ planId: 'plan-1', expectedVersion: 2, selected: [], organizerNote: null });
    await repository.revise('plan-1', 3);
    expect(rpc.mock.calls.map((call) => call[0])).toEqual([
      'create_kwilt_meal_plan','open_kwilt_meal_choice_round','submit_kwilt_meal_choice_response','finalize_kwilt_meal_plan','revise_kwilt_meal_plan',
    ]);
    expect(rpc.mock.calls[3][1]).toEqual(expect.objectContaining({
      p_idempotency_key: 'finalize:plan-1:v2',
      p_content_hash: expect.stringMatching(/^fnv1a32:/),
    }));
  });

  it('never queues a response when offline', async () => {
    const repository = createMealPlanningRepository({ rpc: jest.fn().mockRejectedValue(new Error('offline')) } as never);
    await expect(repository.submitResponse({ roundId: 'round-1', expectedRoundVersion: 1, selectedCandidateIds: ['candidate-1'], pass: false, suggestion: null })).rejects.toThrow('offline');
  });
});
