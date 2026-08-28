import { applyChoreOperation, executeChoreProposalDecision } from './executeChoreProposalDecision';

test('approval applies the exact staged Chore action and finalizes a truthful receipt', async () => {
  const actions = { completeOccurrence: jest.fn(async () => ({ result: { status: 'completed' } })) };
  const repository = {
    decideProposal: jest.fn(async () => ({ status: 'approved', version: 2 })),
    transitionProposalStatus: jest.fn(async () => ({ status: 'applying', version: 3 })),
    persistMutationReceipt: jest.fn(async () => ({ id: 'receipt-1' })),
    finalizeMutationReceipt: jest.fn(async () => ({ id: 'receipt-1' })),
    failMutationReceipt: jest.fn(),
  };
  await executeChoreProposalDecision({ proposal: {
    id: 'proposal-1', threadId: 'thread-1', version: 1, capabilityId: 'chores',
    operation: { id: 'operation-1', idempotencyKey: 'request-1', summary: 'Complete Feed Scout',
      capabilityId: 'chores', type: 'chores.occurrence.complete', targetId: 'occurrence-1', expectedUpdatedAt: 'occurrence-v1', payload: { evidenceRefIds: ['evidence-1'] } },
  } as never, action: 'approve', repository: repository as never, actions: actions as never });
  expect(actions.completeOccurrence).toHaveBeenCalledWith({ requestId: 'request-1', confirmed: true,
    occurrenceId: 'occurrence-1', expectedUpdatedAt: 'occurrence-v1', evidenceRefIds: ['evidence-1'] });
  expect(repository.finalizeMutationReceipt).toHaveBeenCalledWith('receipt-1', expect.objectContaining({ resultingObjectType: 'chore_occurrence' }));
});

test('server field arrays are normalized before the capability action applies them', async () => {
  const actions = { createDefinition: jest.fn(async () => ({ status: 'completed' })) };
  await applyChoreOperation({
    id: 'operation-create', idempotencyKey: 'request-create', summary: 'Create Chore',
    capabilityId: 'chores', type: 'chores.definition.create', targetId: null,
    expectedUpdatedAt: null, payload: { fields: [{ key: 'title', value: 'Feed Scout' }] },
  } as never, actions as never);
  expect(actions.createDefinition).toHaveBeenCalledWith({
    requestId: 'request-create', confirmed: true, fields: { title: 'Feed Scout' },
  });
});
