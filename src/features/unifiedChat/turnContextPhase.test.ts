import type { MoneySnapshot } from '../../capabilities/money/data/moneySnapshot';
import { loadMoneySnapshotForChat } from './turnContextPhase';

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
