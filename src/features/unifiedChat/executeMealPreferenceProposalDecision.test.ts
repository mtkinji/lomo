import { executeMealPreferenceProposalDecision, type MealPreferenceProposal } from './executeMealPreferenceProposalDecision';

const proposal = {
  id: 'proposal-1', threadId: 'thread-1', runId: 'run-1', messageId: 'message-1',
  capabilityId: 'meal_planning', title: 'Update household meal preferences', body: 'Reviewed update',
  status: 'pending', version: 1, permissionPolicy: { requiresExplicitApproval: true },
  createdAt: 'now', updatedAt: 'now',
  operation: {
    id: 'operation-1', proposalId: 'proposal-1', capabilityId: 'meal_planning',
    type: 'meal_planning.preferences.update', targetId: 'household-1', expectedVersion: 3,
    payload: { patch: { usualDinerCount: 5 } }, summary: 'Update preferences',
    idempotencyKey: 'meal-preference-request-1', sequence: 1,
  },
} as MealPreferenceProposal;

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

describe('executeMealPreferenceProposalDecision', () => {
  it('applies the exact reviewed patch and writes a truthful receipt', async () => {
    const repo = repository();
    const actions = { update: jest.fn().mockResolvedValue({
      status: 'completed', operationId: 'meal_planning.preferences.update', resourceId: 'household-1',
      beforeVersion: 3, effectiveVersion: 4, replayed: false,
    }) };
    await executeMealPreferenceProposalDecision({ proposal, action: 'approve', repository: repo as never, actions: actions as never, now: () => 'applied' });
    expect(actions.update).toHaveBeenCalledWith({
      requestId: 'meal-preference-request-1', confirmed: true, expectedVersion: 3,
      patch: { usualDinerCount: 5 },
    });
    expect(repo.finalizeMutationReceipt).toHaveBeenCalledWith('receipt-1', expect.objectContaining({
      resultingObjectType: 'household_meal_preferences', resultingObjectId: 'household-1', appliedAt: 'applied',
    }));
    expect(repo.transitionProposalStatus).toHaveBeenLastCalledWith(expect.objectContaining({ toStatus: 'applied' }));
  });

  it('does not mutate after rejection', async () => {
    const repo = repository();
    const actions = { update: jest.fn() };
    await executeMealPreferenceProposalDecision({ proposal, action: 'reject', repository: repo as never, actions: actions as never });
    expect(actions.update).not.toHaveBeenCalled();
    expect(repo.transitionProposalStatus).not.toHaveBeenCalled();
  });

  it('records a failed receipt and proposal when the exact version is stale', async () => {
    const repo = repository();
    const actions = { update: jest.fn().mockRejectedValue(new Error('meal_preferences.stale_version')) };
    await expect(executeMealPreferenceProposalDecision({ proposal, action: 'approve', repository: repo as never, actions: actions as never }))
      .rejects.toThrow('meal_preferences.stale_version');
    expect(repo.failMutationReceipt).toHaveBeenCalledWith('receipt-1', 'meal_preference_mutation_failed', 'meal_preferences.stale_version');
    expect(repo.transitionProposalStatus).toHaveBeenLastCalledWith(expect.objectContaining({ toStatus: 'failed' }));
  });
});
