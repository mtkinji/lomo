import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  normalizeMoneySavedCheck,
  updateMoneySavedCheck,
  type MoneySavedCheck,
} from '../domain/moneySavedCheck';

type StorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
  removeItem: (key: string) => Promise<unknown>;
};

type MoneySavedCheckDocument = {
  schemaVersion: 1;
  checks: MoneySavedCheck[];
};

export function moneySavedCheckStorageKey(userId: string): string {
  return `kwilt:money:saved-checks:v1:${userId}`;
}

export function createMoneySavedCheckStorage(adapter: StorageAdapter) {
  const load = async (userId: string): Promise<MoneySavedCheck | null> => {
    if (!userId.trim()) return null;
    try {
      const raw = await adapter.getItem(moneySavedCheckStorageKey(userId));
      if (!raw) return null;
      const document = JSON.parse(raw) as Partial<MoneySavedCheckDocument>;
      if (document.schemaVersion !== 1 || !Array.isArray(document.checks)) return null;
      return document.checks.map(normalizeMoneySavedCheck).find((check): check is MoneySavedCheck => check !== null) ?? null;
    } catch {
      return null;
    }
  };

  const save = async (userId: string, check: MoneySavedCheck): Promise<void> => {
    const normalized = normalizeMoneySavedCheck(check);
    if (!userId.trim() || !normalized) throw new Error('The weekly Money check could not be saved.');
    const document: MoneySavedCheckDocument = { schemaVersion: 1, checks: [normalized] };
    await adapter.setItem(moneySavedCheckStorageKey(userId), JSON.stringify(document));
  };

  const mutate = async (
    userId: string,
    patch: Partial<Pick<MoneySavedCheck, 'active' | 'notificationId' | 'lastRun' | 'updatedAtIso'>>,
  ): Promise<MoneySavedCheck | null> => {
    const current = await load(userId);
    if (!current) return null;
    const next = updateMoneySavedCheck(current, patch);
    await save(userId, next);
    return next;
  };

  return {
    load,
    save,
    remove: async (userId: string) => adapter.removeItem(moneySavedCheckStorageKey(userId)).then(() => undefined),
    setNotificationId: (userId: string, notificationId: string | null, updatedAtIso: string) => (
      mutate(userId, { notificationId, updatedAtIso })
    ),
    setActive: (userId: string, active: boolean, updatedAtIso: string) => (
      mutate(userId, active ? { active, updatedAtIso } : { active, notificationId: null, updatedAtIso })
    ),
    recordOpened: (userId: string, atIso: string) => (
      mutate(userId, { lastRun: { status: 'opened', atIso }, updatedAtIso: atIso })
    ),
  };
}

export const moneySavedCheckStorage = createMoneySavedCheckStorage(AsyncStorage);
