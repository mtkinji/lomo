import type { KwiltActionRegistry } from './createActionRegistry';
import type { KwiltActionReceipt, KwiltActionReceiptStatus, KwiltActionRequest } from './types';

export type KwiltActionDispatchStore = {
  load(request: Pick<KwiltActionRequest, 'operationId' | 'requestId' | 'actorId'>): Promise<KwiltActionReceipt | null>;
  save(receipt: KwiltActionReceipt): Promise<void>;
};

function receiptFor(
  request: KwiltActionRequest,
  status: KwiltActionReceiptStatus,
  resultRefs: readonly { kind: string; id: string }[],
  reversible: boolean,
  receiptId: string,
  createdAt: string,
): KwiltActionReceipt {
  return {
    receiptId, operationId: request.operationId, requestId: request.requestId,
    actorId: request.actorId, householdId: request.householdId, source: request.source,
    status, resultRefs, reversible,
    targetVersion: null,
    provider: status === 'pending_client_action' ? 'device' : null,
    retryable: status === 'needs_input' || status === 'failed',
    reason: null,
    candidateSummary: null,
    replayed: false,
    createdAt,
  };
}

export async function dispatchKwiltAction<Context>({
  registry,
  request,
  context,
  store,
  authorize,
  confirmed = false,
  createReceiptId,
  now,
}: {
  registry: KwiltActionRegistry<Context>;
  request: KwiltActionRequest;
  context: Context;
  store: KwiltActionDispatchStore;
  authorize(request: KwiltActionRequest): boolean | Promise<boolean>;
  confirmed?: boolean;
  createReceiptId(): string;
  now(): string;
}): Promise<KwiltActionReceipt> {
  const registration = registry.get(request.operationId);
  if (!registration) {
    return receiptFor(request, 'unavailable', [], false, createReceiptId(), now());
  }
  if (!await authorize(request)) {
    const denied = receiptFor(request, 'refused', [], false, createReceiptId(), now());
    await store.save(denied);
    return denied;
  }
  const replay = await store.load(request);
  if (replay) return replay;
  if (registration.confirmation === 'explicit' && !confirmed) {
    return receiptFor(request, 'needs_input', [], registration.reversible, createReceiptId(), now());
  }
  let receipt: KwiltActionReceipt;
  try {
    const result = await registration.execute(request, context);
    receipt = receiptFor(
      request, result.status, result.resultRefs, registration.reversible,
      createReceiptId(), now(),
    );
  } catch {
    receipt = receiptFor(request, 'failed', [], false, createReceiptId(), now());
  }
  await store.save(receipt);
  return receipt;
}
