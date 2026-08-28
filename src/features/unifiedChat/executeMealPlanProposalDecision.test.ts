import { executeMealPlanProposalDecision } from './executeMealPlanProposalDecision';
import type { UnifiedChatProposal } from './types';

type PlanOperation = Extract<
  Extract<UnifiedChatProposal, { capabilityId: 'meal_planning' }>['operation'],
  { type: 'meal_planning.plan.create' | 'meal_planning.plan.update' | 'meal_planning.candidate.add' | 'meal_planning.candidate.remove'
    | 'meal_planning.round.open' | 'meal_planning.round.close' | 'meal_planning.response.submit'
    | 'meal_planning.response.withdraw' | 'meal_planning.plan.finalize' | 'meal_planning.plan.revise' }
>;

function proposal(operation: PlanOperation) {
  return {
    id: 'proposal-1', threadId: 'thread-1', runId: 'run-1', messageId: 'message-1',
    capabilityId: 'meal_planning', title: 'Meal Plan change', body: 'Reviewed change',
    status: 'pending', version: 1, permissionPolicy: { requiresExplicitApproval: true },
    createdAt: 'now', updatedAt: 'now', operation,
  } as Extract<UnifiedChatProposal, { capabilityId: 'meal_planning' }> & { operation: PlanOperation };
}

function repository() {
  return {
    decideProposal: jest.fn().mockResolvedValue({ status: 'approved', version: 2 }),
    transitionProposalStatus: jest.fn()
      .mockResolvedValueOnce({ status: 'applying', version: 3 })
      .mockResolvedValueOnce({ status: 'applied', version: 4 }),
    persistMutationReceipt: jest.fn().mockResolvedValue({ id: 'receipt-1' }),
    finalizeMutationReceipt: jest.fn().mockResolvedValue({ id: 'receipt-1' }),
    failMutationReceipt: jest.fn().mockResolvedValue({ id: 'receipt-1' }),
  };
}

const baseOperation = {
  id: 'operation-1', proposalId: 'proposal-1', capabilityId: 'meal_planning' as const,
  summary: 'Meal Plan change', idempotencyKey: 'meal-plan-request-1', sequence: 1,
};

describe('executeMealPlanProposalDecision', () => {
  it.each([
    ['create', { ...baseOperation, type: 'meal_planning.plan.create' as const, targetId: null, expectedVersion: 0,
      payload: { householdId: null, horizon: { kind: 'open' as const } } },
    { requestId: 'meal-plan-request-1', confirmed: true, householdId: null, horizon: { kind: 'open' } }],
    ['update', { ...baseOperation, type: 'meal_planning.plan.update' as const, targetId: 'plan-1', expectedVersion: 2,
      payload: { horizon: { kind: 'meal_count' as const, count: 4 } } },
    { requestId: 'meal-plan-request-1', confirmed: true, planId: 'plan-1', expectedVersion: 2, horizon: { kind: 'meal_count', count: 4 } }],
    ['addCandidate', { ...baseOperation, type: 'meal_planning.candidate.add' as const, targetId: 'plan-1', expectedVersion: 2,
      payload: { candidate: { id: 'candidate-1', kind: 'meal_note' as const, title: 'Tacos', recipeSnapshot: null } } },
    { requestId: 'meal-plan-request-1', confirmed: true, planId: 'plan-1', expectedVersion: 2,
      candidate: { id: 'candidate-1', kind: 'meal_note', title: 'Tacos', recipeSnapshot: null } }],
    ['removeCandidate', { ...baseOperation, type: 'meal_planning.candidate.remove' as const, targetId: 'plan-1', expectedVersion: 2,
      payload: { candidateId: 'candidate-1' } },
    { requestId: 'meal-plan-request-1', confirmed: true, planId: 'plan-1', expectedVersion: 2, candidateId: 'candidate-1' }],
    ['openRound', { ...baseOperation, type: 'meal_planning.round.open' as const, targetId: 'plan-1', expectedVersion: 2,
      payload: { participantPersonIds: ['person-2'] } },
    { requestId: 'meal-plan-request-1', confirmed: true, planId: 'plan-1', expectedVersion: 2, participantPersonIds: ['person-2'] }],
    ['closeRound', { ...baseOperation, type: 'meal_planning.round.close' as const, targetId: 'round-1', expectedVersion: 1, payload: {} },
    { requestId: 'meal-plan-request-1', confirmed: true, roundId: 'round-1', expectedVersion: 1 }],
    ['submitResponse', { ...baseOperation, type: 'meal_planning.response.submit' as const, targetId: 'round-1', expectedVersion: 1,
      payload: { candidateIds: ['candidate-1'], availableCandidateIds: ['candidate-1'], pass: false, suggestion: null } },
    { requestId: 'meal-plan-request-1', confirmed: true, roundId: 'round-1', expectedVersion: 1,
      candidateIds: ['candidate-1'], availableCandidateIds: ['candidate-1'], pass: false, suggestion: null }],
    ['withdrawResponse', { ...baseOperation, type: 'meal_planning.response.withdraw' as const, targetId: 'round-1', expectedVersion: 1, payload: {} },
    { requestId: 'meal-plan-request-1', confirmed: true, roundId: 'round-1', expectedVersion: 1 }],
    ['revise', { ...baseOperation, type: 'meal_planning.plan.revise' as const, targetId: 'plan-1', expectedVersion: 4, payload: {} },
    { requestId: 'meal-plan-request-1', confirmed: true, planId: 'plan-1', expectedVersion: 4 }],
    ['finalize', { ...baseOperation, type: 'meal_planning.plan.finalize' as const, targetId: 'plan-1', expectedVersion: 4,
      payload: { organizerNote: null, occasions: [{ id: 'occasion-1', title: null, placementDate: null,
        timing: { kind: 'flexible' as const }, notEatingPersonIds: [],
        dishes: [{ id: 'dish-1', candidateId: 'candidate-1', dinerPersonIds: ['person-1'], servings: 2 }] }] } },
    { requestId: 'meal-plan-request-1', confirmed: true, planId: 'plan-1', expectedVersion: 4,
      organizerNote: null, occasions: [{ id: 'occasion-1', title: null, placementDate: null,
        timing: { kind: 'flexible' }, notEatingPersonIds: [],
        dishes: [{ id: 'dish-1', candidateId: 'candidate-1', dinerPersonIds: ['person-1'], servings: 2 }] }] }],
  ])('applies %s through the exact action and finalizes a truthful receipt', async (method, operation, expectedInput) => {
    const repo = repository();
    const actions = {
      create: jest.fn(), update: jest.fn(), addCandidate: jest.fn(), removeCandidate: jest.fn(),
      openRound: jest.fn(), closeRound: jest.fn(), submitResponse: jest.fn(), withdrawResponse: jest.fn(), revise: jest.fn(),
      finalize: jest.fn(),
    };
    actions[method as keyof typeof actions].mockResolvedValue({ planId: 'plan-1', roundId: 'round-1', version: 3, state: 'draft', replayed: false });
    await executeMealPlanProposalDecision({ proposal: proposal(operation as PlanOperation), action: 'approve', repository: repo as never,
      actions: actions as never, now: () => 'applied' });
    expect(actions[method as keyof typeof actions]).toHaveBeenCalledWith(expectedInput);
    const resultingObjectType = method === 'openRound' || method === 'closeRound'
      ? 'meal_choice_round' : method === 'submitResponse' || method === 'withdrawResponse'
        ? 'meal_choice_response' : 'meal_plan';
    expect(repo.finalizeMutationReceipt).toHaveBeenCalledWith('receipt-1', expect.objectContaining({
      resultingObjectType, resultingObjectId: resultingObjectType === 'meal_plan' ? 'plan-1' : 'round-1', appliedAt: 'applied',
    }));
  });

  it('does not apply after rejection', async () => {
    const repo = repository();
    const actions = { create: jest.fn(), update: jest.fn(), addCandidate: jest.fn(), removeCandidate: jest.fn(),
      openRound: jest.fn(), closeRound: jest.fn(), submitResponse: jest.fn(), withdrawResponse: jest.fn(),
      finalize: jest.fn(), revise: jest.fn() };
    await executeMealPlanProposalDecision({ proposal: proposal({ ...baseOperation,
      type: 'meal_planning.plan.create', targetId: null, expectedVersion: 0,
      payload: { householdId: null, horizon: { kind: 'open' } },
    }), action: 'reject', repository: repo as never, actions });
    expect(actions.create).not.toHaveBeenCalled();
  });
});
