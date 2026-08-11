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
    schemaVersion: 2 as const,
    userJob: 'Rename every Money category', desiredOutcome: 'Every category begins with an emoji',
    constraints: ['emoji at the beginning'], requestClass: 'capability_action' as const,
    participatingCapabilities: ['money' as const], usePrivateContext: true,
    authorization: 'explicit_request' as const, evidenceScope: 'broad' as const,
    responseContract: 'evidence_linked' as const,
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

test('reviews a broad Money inventory including transactions for a budget-system question', async () => {
  const transactions = Array.from({ length: 80 }, (_, index) => ({
    id: `transaction-${index + 1}`,
    accountId: 'checking', accountName: 'Checking', institutionName: 'Bank',
    merchantName: `Merchant ${index + 1}`, amountCents: 1000 + index,
    direction: 'outflow' as const, date: `2026-07-${String((index % 28) + 1).padStart(2, '0')}`,
    pending: false, currencyCode: 'USD', categoryId: 'category-1', categoryName: 'Category 1',
    reviewState: 'assigned' as const, moneyMeaning: null,
  }));
  const categories = Array.from({ length: 12 }, (_, index) => ({
    id: `category-${index + 1}`, sourceId: `category-source-${index + 1}`,
    name: `Category ${index + 1}`, description: null, accentColor: '#315545',
    plannedCents: 10000, spentCents: 5000, remainingCents: 5000, percentUsed: 50,
    transactionCount: 5, rolloverEnabled: false, fundingRhythm: 'monthly' as const,
    fundingPolicyVersion: null, starterWeight: 0, monthlyContributionCents: 10000,
    reserveAvailableCents: 0, reserveBalanceCents: 0, reserveBalancePeriodId: null,
    reserveAvailabilityKnown: true, expectedNeed: null, fundingCoverage: { status: 'none' as const },
    forecast: {
      mode: 'paced' as const, claim: 'monthly_range' as const, confidence: 'medium' as const,
      expectedSpendCents: 5000, projectedSpendCents: 5000, projectionRangeLowCents: 4500,
      projectionRangeHighCents: 5500, projectedRemainingCents: 5000,
      projectedOverageCents: 0, status: 'steady' as const,
    },
  }));
  const persistRunEvidence = jest.fn(async () => undefined);
  const result = await authorizeUnifiedChatContextPhase({
    prompt: 'Look into my budgets and transactions. What changes might make my budget system better?',
    run: {
      id: 'run-money-review', threadId: 'thread-1', userMessageId: 'user-1', assistantMessageId: null,
      status: 'active', errorCode: null, errorMessage: null, createdAt: '2026-08-11T12:00:00.000Z',
      updatedAt: '2026-08-11T12:00:00.000Z', completedAt: null, requestClass: 'capability_question',
      participatingCapabilities: ['money'], contextPolicy: { usePrivateContext: true, reason: 'test', clarification: null },
      version: 1, stopRequestedAt: null, steerCount: 0,
    },
    turnContract: {
      schemaVersion: 2, userJob: 'Improve my budget system', desiredOutcome: 'Explain useful budget changes',
      constraints: [], requestClass: 'capability_question', participatingCapabilities: ['money'],
      usePrivateContext: true, authorization: 'none', evidenceScope: 'broad',
      responseContract: 'evidence_linked', action: null, referent: null,
    },
    requestPolicy: {
      requestClass: 'capability_question', participatingCapabilities: ['money'], usePrivateContext: true,
      clarification: null, policyReason: 'semantic-route:read-only system review',
    },
    activeContext: [], turnAttachments: [],
    repository: { appendRunEvents: jest.fn(async () => undefined), persistRunEvidence },
    loadCapabilitySnapshots: async () => ({
      goals: { goals: [] }, todos: { activities: [], goals: [] }, chapters: { chapters: [] },
      profile: { profile: null }, money: { ...raw, categories, transactions },
    }),
  });

  expect(result.context.evidence.filter((item) => item.object.type === 'money_category')).toHaveLength(12);
  expect(result.context.evidence.filter((item) => item.object.type === 'money_transaction')).toHaveLength(80);
  expect(result.context.coverage).toMatchObject({ consideredCount: 92, includedCount: 92, omittedCount: 0 });
  expect(persistRunEvidence).toHaveBeenCalledWith(expect.objectContaining({
    evidence: expect.arrayContaining([
      expect.objectContaining({ objectType: 'money_transaction', objectId: 'transaction-1' }),
    ]),
  }));
});
