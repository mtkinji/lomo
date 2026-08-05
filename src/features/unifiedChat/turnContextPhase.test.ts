import type { MoneySnapshot } from '../../capabilities/money/data/moneySnapshot';
import { authorizeUnifiedChatContextPhase, loadMoneySnapshotForChat } from './turnContextPhase';
import type { UnifiedChatRun } from './types';

const raw: MoneySnapshot = {
  periodLabel: 'July 2026', generatedAt: '2026-07-31T12:00:00.000Z', lastSyncedAt: '2026-07-31T11:00:00.000Z',
  totals: { plannedCents: 0, spentCents: 0, remainingCents: 0, needsReviewCount: 0 },
  forecast: { projectedSpendCents: 0, projectionRangeLowCents: 0, projectionRangeHighCents: 0, projectedRemainingCents: 0, projectedOverageCents: 0, confidence: 'low', atRiskCategoryCount: 0 },
  outsidePlan: { spentCents: 0, transactionCount: 0 }, categories: [], transactions: [], accounts: [],
};

describe('loadMoneySnapshotForChat', () => {
  it('loads the authoritative living-limit projection from the current snapshot', async () => {
    const projected = { ...raw, livingLimitAnswer: { state: 'missing_income_basis' } } as unknown as MoneySnapshot;
    const repository = { loadSnapshot: jest.fn(async () => raw) };
    const project = jest.fn(async () => ({ snapshot: projected, versionId: 'plan-1', receipt: null }));
    const client = { auth: {} };

    const snapshot = await loadMoneySnapshotForChat(repository, client, project);

    expect(repository.loadSnapshot).toHaveBeenCalledTimes(1);
    expect(project).toHaveBeenCalledWith(client, raw);
    expect(snapshot).toBe(projected);
  });

  it('returns the current snapshot when no active plan exists', async () => {
    const repository = { loadSnapshot: jest.fn(async () => raw) };
    const project = jest.fn(async () => null);
    await expect(loadMoneySnapshotForChat(repository, {}, project)).resolves.toBe(raw);
  });
});

test('persists the durable Turn Contract with the authorized scope event', async () => {
  const appendRunEvents = jest.fn(async () => undefined);
  const turnContract = {
    schemaVersion: 1 as const,
    userJob: 'Rename every Money category', desiredOutcome: 'Every category begins with an emoji',
    constraints: ['emoji at the beginning'], requestClass: 'capability_action' as const,
    participatingCapabilities: ['money' as const], usePrivateContext: true,
    action: {
      operationIds: ['money.category.rename'], targetScope: 'all_matching' as const,
      targetQuery: 'Add an emoji to every category.',
    },
    referent: null,
  };
  const run = {
    id: 'run-1', threadId: 'thread-1', userMessageId: 'user-1', assistantMessageId: null,
    status: 'active', errorCode: null, errorMessage: null,
    createdAt: '2026-08-04T22:00:00.000Z', updatedAt: '2026-08-04T22:00:00.000Z',
    completedAt: null, requestClass: 'capability_action', participatingCapabilities: ['money'],
    contextPolicy: { usePrivateContext: true, reason: 'test', clarification: null },
    version: 1, stopRequestedAt: null, steerCount: 0,
  } satisfies UnifiedChatRun;

  await authorizeUnifiedChatContextPhase({
    prompt: 'Rename every category.', run, turnContract,
    requestPolicy: {
      requestClass: 'capability_action', participatingCapabilities: ['money'], usePrivateContext: true,
      clarification: null, policyReason: 'test',
    },
    activeContext: [], turnAttachments: [],
    repository: { appendRunEvents, persistRunEvidence: jest.fn(async () => undefined) },
    loadCapabilitySnapshots: async () => ({
      goals: { goals: [] }, todos: { activities: [], goals: [] }, chapters: { chapters: [] },
      profile: { profile: null }, money: raw,
    }),
  });

  expect(appendRunEvents).toHaveBeenCalledWith(expect.objectContaining({
    events: expect.arrayContaining([
      expect.objectContaining({ type: 'scope', payload: { turnContract } }),
    ]),
  }));
});
