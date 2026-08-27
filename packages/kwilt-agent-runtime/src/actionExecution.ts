import type {
  AgentToolExecutionResult,
  AgentToolProvider,
  KwiltActionAuthorization,
  KwiltActionConfirmation,
  KwiltActionReceipt,
  KwiltActionSource,
} from './types.ts';

export type KwiltActionExecutionEnvelope = {
  actorId: string;
  householdId: string;
  source: KwiltActionSource;
  operationId: string;
  requestId: string;
  target: { id: string; expectedVersion: number } | null;
  authorization: KwiltActionAuthorization;
  confirmation: KwiltActionConfirmation;
  arguments: Record<string, unknown>;
  reversible: boolean;
};

export type ActionExecutionReceiptStore = {
  load(key: Pick<KwiltActionExecutionEnvelope, 'actorId' | 'operationId' | 'requestId'>): Promise<KwiltActionReceipt | null>;
  save(receipt: KwiltActionReceipt): Promise<void>;
};

export type ResolvedActionTarget = {
  version: number;
  summary: string;
};

function refs(value: unknown): readonly { kind: string; id: string }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const candidate = item as Record<string, unknown>;
    return typeof candidate.kind === 'string' && candidate.kind
      && typeof candidate.id === 'string' && candidate.id
      ? [{ kind: candidate.kind, id: candidate.id }]
      : [];
  });
}

function resultRefs(result: AgentToolExecutionResult): readonly { kind: string; id: string }[] {
  const record = result.status === 'completed' ? result.output
    : result.status === 'proposed' ? result.proposal
      : result.status === 'pending_client_action' ? result.request
        : null;
  const explicit = record ? refs(record.resultRefs) : [];
  if (explicit.length > 0 || !record) return explicit;
  if (result.status === 'proposed') {
    const id = typeof record.proposalId === 'string' ? record.proposalId
      : typeof record.id === 'string' ? record.id : '';
    return id ? [{ kind: 'proposal', id }] : [];
  }
  if (result.status === 'pending_client_action') {
    const id = typeof record.handoffId === 'string' ? record.handoffId
      : typeof record.actionId === 'string' ? record.actionId
        : typeof record.id === 'string' ? record.id : '';
    return id ? [{ kind: 'handoff', id }] : [];
  }
  return [];
}

function provider(result: AgentToolExecutionResult): AgentToolProvider | null {
  return result.status === 'pending_client_action' ? result.provider : null;
}

function retryable(result: AgentToolExecutionResult): boolean {
  if (result.status === 'failed' || result.status === 'unavailable') return result.retryable;
  return result.status === 'needs_input';
}

function reason(result: AgentToolExecutionResult): string | null {
  if (result.status === 'failed') return result.code;
  if (result.status === 'unavailable' || result.status === 'refused') return result.reason;
  if (result.status === 'needs_input') return 'needs_input';
  return null;
}

function receiptFor(input: {
  envelope: KwiltActionExecutionEnvelope;
  receiptId: string;
  createdAt: string;
  status: KwiltActionReceipt['status'];
  resultRefs?: readonly { kind: string; id: string }[];
  provider?: AgentToolProvider | null;
  retryable?: boolean;
  reason?: string | null;
  candidateSummary?: string | null;
  targetVersion?: number | null;
  replayed?: boolean;
}): KwiltActionReceipt {
  return {
    receiptId: input.receiptId,
    operationId: input.envelope.operationId,
    requestId: input.envelope.requestId,
    actorId: input.envelope.actorId,
    householdId: input.envelope.householdId,
    source: input.envelope.source,
    status: input.status,
    resultRefs: input.resultRefs ?? [],
    reversible: input.envelope.reversible,
    targetVersion: input.targetVersion ?? input.envelope.target?.expectedVersion ?? null,
    provider: input.provider ?? null,
    retryable: input.retryable ?? false,
    reason: input.reason ?? null,
    candidateSummary: input.candidateSummary ?? null,
    replayed: input.replayed ?? false,
    createdAt: input.createdAt,
  };
}

export async function executeActionEnvelope(input: {
  envelope: KwiltActionExecutionEnvelope;
  store: ActionExecutionReceiptStore;
  execute(envelope: KwiltActionExecutionEnvelope): Promise<AgentToolExecutionResult>;
  resolveTarget?(envelope: KwiltActionExecutionEnvelope): Promise<ResolvedActionTarget | null>;
  createReceiptId(): string;
  now(): string;
}): Promise<KwiltActionReceipt> {
  const createdAt = input.now();
  const make = (overrides: Omit<Parameters<typeof receiptFor>[0], 'envelope' | 'receiptId' | 'createdAt'>) =>
    receiptFor({ envelope: input.envelope, receiptId: input.createReceiptId(), createdAt, ...overrides });

  if (input.envelope.authorization.decision === 'refused') {
    const denied = make({ status: 'refused', reason: input.envelope.authorization.reason ?? 'authorization_refused' });
    await input.store.save(denied);
    return denied;
  }

  const replay = await input.store.load(input.envelope);
  if (replay && !replay.retryable) return { ...replay, replayed: true };

  if (input.envelope.confirmation.state === 'declined') {
    const declined = make({ status: 'refused', reason: 'confirmation_declined' });
    await input.store.save(declined);
    return declined;
  }
  if (input.envelope.confirmation.state === 'pending') {
    const pending = make({ status: 'needs_input', retryable: true, reason: 'confirmation_required' });
    await input.store.save(pending);
    return pending;
  }

  if (input.envelope.target && input.resolveTarget) {
    const current = await input.resolveTarget(input.envelope);
    if (!current || current.version !== input.envelope.target.expectedVersion) {
      const stale = make({
        status: 'needs_input', retryable: true, reason: 'target_version_conflict',
        candidateSummary: current?.summary ?? 'The target is no longer available.',
        targetVersion: current?.version ?? input.envelope.target.expectedVersion,
      });
      await input.store.save(stale);
      return stale;
    }
  }

  let result: AgentToolExecutionResult;
  try {
    result = await input.execute(input.envelope);
  } catch {
    result = { status: 'failed', code: 'execution_failed', message: 'Kwilt could not complete the action.', retryable: true };
  }
  const receipt = make({
    status: result.status,
    resultRefs: resultRefs(result),
    provider: provider(result),
    retryable: retryable(result),
    reason: reason(result),
  });
  await input.store.save(receipt);
  return receipt;
}

/** Converts the durable cross-channel receipt back into the model-facing tool protocol. */
export function toolResultFromActionReceipt(receipt: KwiltActionReceipt): AgentToolExecutionResult {
  const reference = {
    receiptId: receipt.receiptId,
    resultRefs: receipt.resultRefs,
    replayed: receipt.replayed,
  };
  if (receipt.status === 'completed') return { status: 'completed', output: reference, receipt };
  if (receipt.status === 'proposed') return { status: 'proposed', proposal: reference };
  if (receipt.status === 'pending_client_action') {
    return {
      status: 'pending_client_action',
      provider: receipt.provider === 'connector' ? 'connector' : 'device',
      request: reference,
    };
  }
  if (receipt.status === 'needs_input') {
    return {
      status: 'needs_input',
      prompt: receipt.candidateSummary
        ?? (receipt.reason === 'confirmation_required'
          ? 'Please confirm this action before Kwilt continues.'
          : 'The target changed. Please review the current item before Kwilt continues.'),
      fields: receipt.reason === 'confirmation_required' ? ['confirmation'] : ['target'],
    };
  }
  if (receipt.status === 'unavailable') {
    return { status: 'unavailable', reason: receipt.reason ?? 'action_unavailable', retryable: receipt.retryable };
  }
  if (receipt.status === 'refused') {
    return { status: 'refused', reason: receipt.reason ?? 'action_refused' };
  }
  return {
    status: 'failed',
    code: receipt.reason ?? 'action_failed',
    message: 'Kwilt could not complete that action.',
    retryable: receipt.retryable,
  };
}
