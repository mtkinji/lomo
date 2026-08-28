import type {
  KwiltActionReceipt,
  KwiltActionRequest,
} from '../../../packages/kwilt-agent-runtime/src/types.ts';

export type MutationReceiptRow = {
  id: string;
  status: string;
  resulting_object_type?: string | null;
  resulting_object_id?: string | null;
  can_undo?: boolean | null;
  created_at?: string | null;
  replayed?: boolean | null;
};

function canonicalStatus(status: string): KwiltActionReceipt['status'] {
  if (status === 'applied' || status === 'completed') return 'completed';
  if (status === 'proposed' || status === 'pending') return 'proposed';
  if (status === 'pending_client_action') return 'pending_client_action';
  if (status === 'unavailable') return 'unavailable';
  if (status === 'refused') return 'refused';
  return 'failed';
}

function mapMutationReceipt(
  request: KwiltActionRequest,
  row: MutationReceiptRow,
  fallbackCreatedAt: string,
  replayed = row.replayed === true,
): KwiltActionReceipt {
  const kind = typeof row.resulting_object_type === 'string' ? row.resulting_object_type : '';
  const id = typeof row.resulting_object_id === 'string' ? row.resulting_object_id : '';
  return {
    receiptId: row.id, operationId: request.operationId, requestId: request.requestId,
    actorId: request.actorId, householdId: request.householdId, source: request.source,
    status: canonicalStatus(row.status), resultRefs: kind && id ? [{ kind, id }] : [],
    reversible: row.can_undo === true, targetVersion: null, provider: null,
    retryable: false, reason: null, candidateSummary: null, replayed,
    createdAt: row.created_at ?? fallbackCreatedAt,
  };
}

function syntheticReceipt(
  request: KwiltActionRequest,
  status: 'refused' | 'failed',
  createdAt: string,
): KwiltActionReceipt {
  return {
    receiptId: `${request.requestId}:${status}`, operationId: request.operationId,
    requestId: request.requestId, actorId: request.actorId, householdId: request.householdId,
    source: request.source, status, resultRefs: [], reversible: false,
    targetVersion: null, provider: null, retryable: status === 'failed',
    reason: status === 'refused' ? 'authorization_refused' : 'execution_failed',
    candidateSummary: null, replayed: false, createdAt,
  };
}

export async function dispatchServerAction({
  request,
  authorize,
  findMutationReceipt,
  execute,
  now = () => new Date().toISOString(),
}: {
  request: KwiltActionRequest;
  authorize(request: KwiltActionRequest): boolean | Promise<boolean>;
  findMutationReceipt(request: KwiltActionRequest): Promise<MutationReceiptRow | null>;
  execute(request: KwiltActionRequest): Promise<MutationReceiptRow>;
  now?: () => string;
}): Promise<KwiltActionReceipt> {
  const createdAt = now();
  if (!await authorize(request)) return syntheticReceipt(request, 'refused', createdAt);
  const replay = await findMutationReceipt(request);
  if (replay) return mapMutationReceipt(request, replay, createdAt, true);
  try {
    return mapMutationReceipt(request, await execute(request), createdAt);
  } catch {
    return syntheticReceipt(request, 'failed', createdAt);
  }
}
