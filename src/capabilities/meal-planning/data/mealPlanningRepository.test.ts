import { createMealPlanningRepository, mapMealPlanRow } from './mealPlanningRepository';

describe('Meal Planning repository', () => {
  it('does not reuse a subscribed Realtime topic during an async React remount cleanup', () => {
    const channels = new Map<string, { subscribed: boolean; on: jest.Mock; subscribe: jest.Mock }>();
    const channel = jest.fn((topic: string) => {
      const existing = channels.get(topic);
      if (existing) return existing;
      const created = {
        subscribed: false,
        on: jest.fn(function on(this: { subscribed: boolean }) {
          if (this.subscribed) throw new Error('cannot add `postgres_changes` callbacks after `subscribe()`.');
          return this;
        }),
        subscribe: jest.fn(function subscribe(this: { subscribed: boolean }) {
          this.subscribed = true;
          return this;
        }),
      };
      channels.set(topic, created);
      return created;
    });
    const client = { channel, removeChannel: jest.fn(() => new Promise(() => undefined)) };

    const firstCleanup = createMealPlanningRepository(client as never).subscribe(jest.fn());
    firstCleanup();

    expect(() => createMealPlanningRepository(client as never).subscribe(jest.fn())).not.toThrow();
    expect(channel.mock.calls[0][0]).not.toBe(channel.mock.calls[1][0]);
  });

  it('reads and mutates the shared cart only through actor-aware RPCs', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce({ data: {
        planId: null, householdId: 'household-1', version: null, state: null, activeCount: 0, groceryListId: null,
        viewer: { personId: 'person-1', role: 'caregiver', canAdd: true, canManage: true }, candidates: [],
      }, error: null })
      .mockResolvedValue({ data: {}, error: null });
    const invoke = jest.fn().mockResolvedValue({ data: { receipt: {} }, error: null });
    const repository = createMealPlanningRepository({ rpc, functions: { invoke } } as never);

    expect(await repository.getSharedCart('household-1')).toMatchObject({ householdId: 'household-1', candidates: [] });
    await repository.addSharedCandidate('household-1', { id: 'candidate-1', kind: 'meal_note', title: 'Tacos', recipeSnapshot: null });
    await repository.withdrawSharedCandidate('candidate-1');
    await repository.setSharedReaction('candidate-1', true);
    await repository.sendSharedCandidates('plan-1', 2, ['candidate-1']);
    await repository.removeSentSharedCandidate('plan-1', 3, 'candidate-1');
    await repository.keepGroceriesAndRemoveSharedCandidate('candidate-2', 4);
    await repository.markSharedCandidateMade('candidate-3', 5);

    expect(rpc.mock.calls).toEqual([
      ['get_kwilt_shared_meal_cart', { p_household_id: 'household-1' }],
      ['add_kwilt_shared_meal_candidate', { p_household_id: 'household-1', p_candidate_id: 'candidate-1', p_candidate: { id: 'candidate-1', kind: 'meal_note', title: 'Tacos', recipeSnapshot: null } }],
      ['withdraw_kwilt_shared_meal_candidate', { p_candidate_id: 'candidate-1' }],
      ['set_kwilt_shared_meal_reaction', { p_candidate_id: 'candidate-1', p_reacted: true }],
      ['remove_kwilt_sent_plan_candidate_keep_groceries', { p_candidate_id: 'candidate-2', p_expected_version: 4 }],
      ['mark_kwilt_plan_candidate_made', { p_candidate_id: 'candidate-3', p_expected_version: 5 }],
    ]);
    expect(invoke.mock.calls).toEqual([
      ['grocery-compile', { body: { planAction: 'send', planId: 'plan-1', expectedVersion: 2, candidateIds: ['candidate-1'] } }],
      ['grocery-compile', { body: { planAction: 'remove', planId: 'plan-1', expectedVersion: 3, candidateIds: ['candidate-1'] } }],
    ]);
  });

  it('creates, opens, responds, finalizes, and revises only through authority RPCs', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: {}, error: null });
    const repository = createMealPlanningRepository({ rpc } as never);
    await repository.create({ householdId: 'household-1', horizon: { kind: 'next_shop', shopBy: null }, candidates: [] });
    await repository.openRound({ planId: 'plan-1', expectedVersion: 1, participantMembershipIds: ['member-1'], closesAt: null });
    await repository.submitResponse({ roundId: 'round-1', expectedRoundVersion: 1, selectedCandidateIds: [], pass: true, suggestion: null });
    const occasions = [{ id: 'occasion-1', title: null, placementDate: null, timing: { kind: 'flexible' as const }, dishes: [{ id: 'dish-1', candidateId: 'candidate-1', dinerPersonIds: ['person-1'], servings: 1 }] }];
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
        { id: 'old-occasion', plan_version: 2, position: 0, title: null, placement_date: null, timing_kind: 'flexible', not_eating_person_ids: [] },
        { id: 'current-occasion', plan_version: 4, position: 0, title: null, placement_date: null, timing_kind: 'flexible', not_eating_person_ids: [] },
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
