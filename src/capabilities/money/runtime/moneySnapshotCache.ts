import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MoneySnapshot } from '../data/moneySnapshot';

type StorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
  removeItem: (key: string) => Promise<unknown>;
};

type MoneySnapshotCacheDocument = {
  schemaVersion: 1;
  savedAt: string;
  snapshot: MoneySnapshot;
};

export type MoneySnapshotCache = {
  load: (userId: string) => Promise<MoneySnapshot | null>;
  save: (userId: string, snapshot: MoneySnapshot) => Promise<void>;
  remove: (userId: string) => Promise<void>;
};

export function moneySnapshotCacheKey(userId: string): string {
  return `kwilt:money:snapshot:v1:${encodeURIComponent(userId.trim())}`;
}

export function createMoneySnapshotCache(adapter: StorageAdapter): MoneySnapshotCache {
  return {
    async load(userId) {
      const normalizedUserId = userId.trim();
      if (!normalizedUserId) return null;
      try {
        const raw = await adapter.getItem(moneySnapshotCacheKey(normalizedUserId));
        if (!raw) return null;
        const document = JSON.parse(raw) as Partial<MoneySnapshotCacheDocument>;
        if (document.schemaVersion !== 1 || !isMoneySnapshot(document.snapshot)) return null;
        return normalizeSnapshot(document.snapshot);
      } catch {
        return null;
      }
    },

    async save(userId, snapshot) {
      const normalizedUserId = userId.trim();
      if (!normalizedUserId || !isMoneySnapshot(snapshot)) return;
      const document: MoneySnapshotCacheDocument = {
        schemaVersion: 1,
        savedAt: new Date().toISOString(),
        snapshot,
      };
      await adapter.setItem(moneySnapshotCacheKey(normalizedUserId), JSON.stringify(document));
    },

    async remove(userId) {
      const normalizedUserId = userId.trim();
      if (!normalizedUserId) return;
      await adapter.removeItem(moneySnapshotCacheKey(normalizedUserId));
    },
  };
}

function isMoneySnapshot(value: unknown): value is MoneySnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const snapshot = value as Partial<MoneySnapshot>;
  return typeof snapshot.periodLabel === 'string'
    && typeof snapshot.generatedAt === 'string'
    && (snapshot.lastSyncedAt === null || typeof snapshot.lastSyncedAt === 'string')
    && hasNumericFields(snapshot.totals, ['plannedCents', 'spentCents', 'remainingCents', 'needsReviewCount'])
    && hasNumericFields(snapshot.forecast, [
      'projectedSpendCents',
      'projectionRangeLowCents',
      'projectionRangeHighCents',
      'projectedRemainingCents',
      'projectedOverageCents',
      'atRiskCategoryCount',
    ])
    && hasNumericFields(snapshot.outsidePlan, ['spentCents', 'transactionCount'])
    && Array.isArray(snapshot.categories)
    && Array.isArray(snapshot.transactions)
    && Array.isArray(snapshot.accounts);
}

function normalizeSnapshot(snapshot: MoneySnapshot): MoneySnapshot {
  const legacy = snapshot as MoneySnapshot & { connections?: MoneySnapshot['connections'] };
  return {
    ...snapshot,
    categories: snapshot.categories.map((category) => ({
      ...category,
      updatedAt: typeof category.updatedAt === 'string' && category.updatedAt
        ? category.updatedAt : snapshot.generatedAt,
    })),
    transactions: snapshot.transactions.map((transaction) => ({
      ...transaction,
      updatedAt: typeof transaction.updatedAt === 'string' && transaction.updatedAt
        ? transaction.updatedAt : snapshot.generatedAt,
    })),
    connections: Array.isArray(legacy.connections) ? legacy.connections : [],
  };
}

function hasNumericFields(value: unknown, fields: string[]): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return fields.every((field) => typeof record[field] === 'number' && Number.isFinite(record[field]));
}

export const moneySnapshotCache = createMoneySnapshotCache(AsyncStorage);
