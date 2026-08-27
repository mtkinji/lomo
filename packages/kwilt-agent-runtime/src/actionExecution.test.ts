import {
  executeActionEnvelope,
  toolResultFromActionReceipt,
  type ActionExecutionReceiptStore,
  type KwiltActionExecutionEnvelope,
} from './actionExecution';
import type { AgentToolExecutionResult, KwiltActionReceipt } from './types';

const envelope = (overrides: Partial<KwiltActionExecutionEnvelope> = {}): KwiltActionExecutionEnvelope => ({
  actorId: 'actor-1',
  householdId: 'household-1',
  source: 'mobile_chat',
  operationId: 'household.member.update',
  requestId: 'request-1',
  target: { id: 'membership-1', expectedVersion: 4 },
  authorization: { decision: 'authorized', reason: null },
  confirmation: { state: 'confirmed' },
  arguments: { membershipId: 'membership-1', fields: [{ key: 'displayName', value: 'Charlie' }] },
  reversible: true,
  ...overrides,
});

function store(): ActionExecutionReceiptStore & { receipts: KwiltActionReceipt[] } {
  const receipts: KwiltActionReceipt[] = [];
  return {
    receipts,
    async load(key) {
      return receipts.find((receipt) => receipt.actorId === key.actorId
        && receipt.operationId === key.operationId && receipt.requestId === key.requestId) ?? null;
    },
    async save(receipt) {
      const index = receipts.findIndex((candidate) => candidate.actorId === receipt.actorId
        && candidate.operationId === receipt.operationId && candidate.requestId === receipt.requestId);
      if (index >= 0) receipts[index] = receipt;
      else receipts.push(receipt);
    },
  };
}

const execute = (result: AgentToolExecutionResult) => jest.fn(async () => result);
const common = { createReceiptId: () => 'receipt-1', now: () => '2026-08-27T18:00:00.000Z' };

describe('executeActionEnvelope', () => {
  test.each([
    ['direct completion', { status: 'completed', output: { resultRefs: [{ kind: 'membership', id: 'membership-1' }] }, receipt: null }, 'completed'],
    ['reviewed proposal', { status: 'proposed', proposal: { proposalId: 'proposal-1' } }, 'proposed'],
    ['native handoff', { status: 'pending_client_action', provider: 'device', request: { handoffId: 'handoff-1' } }, 'pending_client_action'],
    ['provider handoff', { status: 'pending_client_action', provider: 'connector', request: { handoffId: 'handoff-2' } }, 'pending_client_action'],
    ['needs input', { status: 'needs_input', prompt: 'Choose one member.', fields: ['membershipId'] }, 'needs_input'],
    ['unavailable', { status: 'unavailable', reason: 'provider_offline', retryable: true }, 'unavailable'],
    ['refused', { status: 'refused', reason: 'household_authority_required' }, 'refused'],
    ['failed', { status: 'failed', code: 'write_failed', message: 'Try again.', retryable: false }, 'failed'],
  ] as const)('%s returns the canonical receipt state', async (_label, result, expectedStatus) => {
    const receipt = await executeActionEnvelope({
      envelope: envelope(), store: store(), execute: execute(result), ...common,
    });
    expect(receipt).toMatchObject({
      receiptId: 'receipt-1', operationId: 'household.member.update', requestId: 'request-1',
      actorId: 'actor-1', householdId: 'household-1', source: 'mobile_chat',
      status: expectedStatus, targetVersion: 4,
    });
  });

  test('refuses an unauthorized envelope without calling the capability executor', async () => {
    const handler = execute({ status: 'completed', output: {}, receipt: null });
    const receipt = await executeActionEnvelope({
      envelope: envelope({ authorization: { decision: 'refused', reason: 'wrong_household' } }),
      store: store(), execute: handler, ...common,
    });
    expect(receipt).toMatchObject({ status: 'refused', reason: 'wrong_household', retryable: false });
    expect(handler).not.toHaveBeenCalled();
  });

  test('turns a target-version conflict into retryable needs-input with the fresh candidate summary', async () => {
    const handler = execute({ status: 'completed', output: {}, receipt: null });
    const receipt = await executeActionEnvelope({
      envelope: envelope(), store: store(), execute: handler,
      resolveTarget: async () => ({ version: 5, summary: 'Charlie is now Charles.' }),
      ...common,
    });
    expect(receipt).toMatchObject({
      status: 'needs_input', retryable: true, reason: 'target_version_conflict',
      candidateSummary: 'Charlie is now Charles.', targetVersion: 5,
    });
    expect(handler).not.toHaveBeenCalled();
  });

  test('replays a terminal duplicate request and retries a retryable failure', async () => {
    const receipts = store();
    const completed = execute({ status: 'completed', output: {}, receipt: null });
    await executeActionEnvelope({ envelope: envelope(), store: receipts, execute: completed, ...common });
    const replay = await executeActionEnvelope({ envelope: envelope(), store: receipts, execute: completed, ...common });
    expect(replay.replayed).toBe(true);
    expect(completed).toHaveBeenCalledTimes(1);

    const retryStore = store();
    const retry = execute({ status: 'failed', code: 'offline', message: 'Retry.', retryable: true });
    await executeActionEnvelope({ envelope: envelope(), store: retryStore, execute: retry, ...common });
    await executeActionEnvelope({ envelope: envelope(), store: retryStore, execute: retry, ...common });
    expect(retry).toHaveBeenCalledTimes(2);
  });
});

describe('toolResultFromActionReceipt', () => {
  test('preserves connector handoffs and authorization refusals across channel adapters', () => {
    const base: KwiltActionReceipt = {
      receiptId: 'receipt-1', operationId: 'money.connection.repair', requestId: 'request-1',
      actorId: 'actor-1', householdId: 'household-1', source: 'mcp',
      status: 'pending_client_action', resultRefs: [], reversible: false, targetVersion: null,
      provider: 'connector', retryable: false, reason: null, candidateSummary: null,
      replayed: false, createdAt: '2026-08-27T18:00:00.000Z',
    };
    expect(toolResultFromActionReceipt(base)).toEqual({
      status: 'pending_client_action', provider: 'connector',
      request: { receiptId: 'receipt-1', resultRefs: [], replayed: false },
    });
    expect(toolResultFromActionReceipt({ ...base, status: 'refused', provider: null, reason: 'wrong_household' }))
      .toEqual({ status: 'refused', reason: 'wrong_household' });
  });

  test('records stable proposal and handoff references when providers return canonical ids', async () => {
    const proposal = await executeActionEnvelope({
      envelope: envelope(), store: store(),
      execute: execute({ status: 'proposed', proposal: { proposalId: 'proposal-1' } }), ...common,
    });
    const handoff = await executeActionEnvelope({
      envelope: envelope({ requestId: 'request-2' }), store: store(),
      execute: execute({ status: 'pending_client_action', provider: 'device', request: { handoffId: 'handoff-1' } }),
      ...common,
    });
    expect(proposal.resultRefs).toEqual([{ kind: 'proposal', id: 'proposal-1' }]);
    expect(handoff.resultRefs).toEqual([{ kind: 'handoff', id: 'handoff-1' }]);
  });
});
