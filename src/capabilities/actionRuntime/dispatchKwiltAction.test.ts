import { createActionRegistry, type KwiltActionRegistration } from './createActionRegistry';
import { dispatchKwiltAction, type KwiltActionDispatchStore } from './dispatchKwiltAction';
import type { KwiltActionReceipt, KwiltActionRequest } from './types';

const request: KwiltActionRequest = {
  operationId: 'goals.update', requestId: 'request-1', actorId: 'actor-1', householdId: 'house-1',
  source: 'mobile_chat', input: { goalId: 'goal-1' },
};

function store(): KwiltActionDispatchStore {
  const receipts = new Map<string, KwiltActionReceipt>();
  return {
    load: jest.fn(async (value) => receipts.get(`${value.actorId}:${value.operationId}:${value.requestId}`) ?? null),
    save: jest.fn(async (receipt) => { receipts.set(`${receipt.actorId}:${receipt.operationId}:${receipt.requestId}`, receipt); }),
  };
}

function registration(overrides: Partial<KwiltActionRegistration<{}>> = {}): KwiltActionRegistration<{}> {
  return {
    operationId: 'goals.update', confirmation: 'none', reversible: true,
    execute: jest.fn(async () => ({ status: 'completed' as const, resultRefs: [{ kind: 'goal', id: 'goal-1' }] })),
    ...overrides,
  };
}

test('denies unauthorized actions without invoking capability logic', async () => {
  const action = registration();
  const receipt = await dispatchKwiltAction({
    registry: createActionRegistry([action]), request, context: {}, store: store(),
    authorize: () => false, createReceiptId: () => 'receipt-1', now: () => '2026-08-26T12:00:00.000Z',
  });
  expect(receipt.status).toBe('refused');
  expect(action.execute).not.toHaveBeenCalled();
});

test('replays a persisted receipt without repeating the handler', async () => {
  const action = registration();
  const receiptStore = store();
  const args = {
    registry: createActionRegistry([action]), request, context: {}, store: receiptStore,
    authorize: () => true, createReceiptId: () => 'receipt-1', now: () => '2026-08-26T12:00:00.000Z',
  };
  const first = await dispatchKwiltAction(args);
  const replay = await dispatchKwiltAction(args);
  expect(replay).toEqual(first);
  expect(action.execute).toHaveBeenCalledTimes(1);
});

test('returns needs_input until explicit confirmation is supplied', async () => {
  const action = registration({ confirmation: 'explicit' });
  const registry = createActionRegistry([action]);
  const receiptStore = store();
  const base = {
    registry, request, context: {}, store: receiptStore, authorize: () => true,
    createReceiptId: () => 'receipt-1', now: () => '2026-08-26T12:00:00.000Z',
  };
  await expect(dispatchKwiltAction(base)).resolves.toMatchObject({ status: 'needs_input' });
  await expect(dispatchKwiltAction({ ...base, confirmed: true })).resolves.toMatchObject({ status: 'completed' });
  expect(action.execute).toHaveBeenCalledTimes(1);
});

test('preserves native handoffs and reversible result references', async () => {
  const handoff = registration({
    execute: jest.fn(async () => ({ status: 'pending_client_action' as const, resultRefs: [{ kind: 'client_action', id: 'action-1' }] })),
  });
  const receipt = await dispatchKwiltAction({
    registry: createActionRegistry([handoff]), request, context: {}, store: store(), authorize: () => true,
    createReceiptId: () => 'receipt-1', now: () => '2026-08-26T12:00:00.000Z',
  });
  expect(receipt).toMatchObject({
    receiptId: 'receipt-1', status: 'pending_client_action', reversible: true,
    resultRefs: [{ kind: 'client_action', id: 'action-1' }],
  });
});

test('normalizes handler failures into a durable failed receipt', async () => {
  const action = registration({ execute: jest.fn(async () => { throw new Error('private database detail'); }) });
  const receipt = await dispatchKwiltAction({
    registry: createActionRegistry([action]), request, context: {}, store: store(), authorize: () => true,
    createReceiptId: () => 'receipt-1', now: () => '2026-08-26T12:00:00.000Z',
  });
  expect(receipt).toMatchObject({ status: 'failed', resultRefs: [] });
  expect(receipt).not.toHaveProperty('error');
});
