import type { MoneySnapshot } from '../data/moneySnapshot';
import { createMoneySnapshotCache, moneySnapshotCacheKey } from './moneySnapshotCache';

const snapshot = {
  periodLabel: 'August 2026',
  generatedAt: '2026-08-04T14:00:00.000Z',
  lastSyncedAt: '2026-08-04T13:55:00.000Z',
  totals: { plannedCents: 100_000, spentCents: 20_000, remainingCents: 80_000, needsReviewCount: 1 },
  forecast: {
    projectedSpendCents: 75_000,
    projectionRangeLowCents: 70_000,
    projectionRangeHighCents: 80_000,
    projectedRemainingCents: 25_000,
    projectedOverageCents: 0,
    confidence: 'high',
    atRiskCategoryCount: 0,
  },
  outsidePlan: { spentCents: 0, transactionCount: 0 },
  categories: [],
  transactions: [],
  accounts: [],
} as MoneySnapshot;

function memoryAdapter() {
  const rows = new Map<string, string>();
  return {
    rows,
    getItem: jest.fn(async (key: string) => rows.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { rows.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { rows.delete(key); }),
  };
}

describe('moneySnapshotCache', () => {
  it('persists and restores a snapshot only inside the signed-in user namespace', async () => {
    const adapter = memoryAdapter();
    const cache = createMoneySnapshotCache(adapter);

    await cache.save('user-a', snapshot);

    await expect(cache.load('user-a')).resolves.toEqual(snapshot);
    await expect(cache.load('user-b')).resolves.toBeNull();
    expect(adapter.rows.get(moneySnapshotCacheKey('user-a'))).toContain('"schemaVersion":1');
  });

  it('ignores malformed, obsolete, and structurally incomplete cache documents', async () => {
    const adapter = memoryAdapter();
    const cache = createMoneySnapshotCache(adapter);
    const key = moneySnapshotCacheKey('user-a');

    adapter.rows.set(key, '{bad json');
    await expect(cache.load('user-a')).resolves.toBeNull();

    adapter.rows.set(key, JSON.stringify({ schemaVersion: 2, snapshot }));
    await expect(cache.load('user-a')).resolves.toBeNull();

    adapter.rows.set(key, JSON.stringify({ schemaVersion: 1, snapshot: { generatedAt: 'missing inventory' } }));
    await expect(cache.load('user-a')).resolves.toBeNull();
  });

  it('removes a user snapshot without touching another user', async () => {
    const adapter = memoryAdapter();
    const cache = createMoneySnapshotCache(adapter);
    await cache.save('user-a', snapshot);
    await cache.save('user-b', { ...snapshot, generatedAt: 'user-b' });

    await cache.remove('user-a');

    await expect(cache.load('user-a')).resolves.toBeNull();
    await expect(cache.load('user-b')).resolves.toEqual({ ...snapshot, generatedAt: 'user-b' });
  });
});
