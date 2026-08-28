import { dispatchServerAction } from '../serverActionDispatcher';

test('maps an existing mutation receipt row into the canonical wire receipt', async () => {
  const receipt = await dispatchServerAction({
    request: {
      operationId: 'activities.capture', requestId: 'request-1', actorId: 'actor-1', householdId: 'house-1',
      source: 'mobile_chat', input: { title: 'Pack lunches' },
    },
    authorize: () => true,
    findMutationReceipt: async () => null,
    execute: async () => ({
      id: 'mutation-1', status: 'applied', resulting_object_type: 'activity', resulting_object_id: 'activity-1',
      can_undo: true, created_at: '2026-08-26T12:00:00.000Z',
    }),
  });
  expect(receipt).toEqual({
    receiptId: 'mutation-1', operationId: 'activities.capture', requestId: 'request-1',
    actorId: 'actor-1', householdId: 'house-1', source: 'mobile_chat', status: 'completed',
    resultRefs: [{ kind: 'activity', id: 'activity-1' }], reversible: true,
    targetVersion: null, provider: null, retryable: false, reason: null,
    candidateSummary: null, replayed: false,
    createdAt: '2026-08-26T12:00:00.000Z',
  });
});

test('replays existing mutation receipts and normalizes permission and handler failures', async () => {
  const base = {
    request: {
      operationId: 'goals.update', requestId: 'request-1', actorId: 'actor-1', householdId: 'house-1',
      source: 'phone' as const, input: {},
    },
    findMutationReceipt: jest.fn(async () => ({
      id: 'existing', status: 'applied', resulting_object_type: 'goal', resulting_object_id: 'goal-1',
      can_undo: false, created_at: '2026-08-26T12:00:00.000Z',
    })),
    execute: jest.fn(async () => { throw new Error('database secret'); }),
  };
  await expect(dispatchServerAction({ ...base, authorize: () => true })).resolves.toMatchObject({ receiptId: 'existing' });
  expect(base.execute).not.toHaveBeenCalled();
  await expect(dispatchServerAction({ ...base, findMutationReceipt: async () => null, authorize: () => false }))
    .resolves.toMatchObject({ status: 'refused', resultRefs: [] });
  await expect(dispatchServerAction({ ...base, findMutationReceipt: async () => null, authorize: () => true }))
    .resolves.toMatchObject({ status: 'failed', resultRefs: [] });
});
