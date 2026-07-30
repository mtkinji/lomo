import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PersonalBest, PersonalBestGameKey, PersonalBestPlayerKey } from './personalBests';

export const PERSONAL_BEST_STORAGE_KEY = 'kwilt-games.personal-bests.v1';

type Adapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
};

type Document = { schemaVersion: 1; records: PersonalBest[]; updatedAt: string };

function isPersonalBest(value: unknown): value is PersonalBest {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<PersonalBest>;
  return typeof record.playerKey === 'string'
    && (/^(saved|profile):.+$/).test(record.playerKey)
    && (record.gameKey === 'bank' || record.gameKey === 'farkle')
    && typeof record.score === 'number'
    && Number.isFinite(record.score)
    && record.score >= 0
    && typeof record.achievedAt === 'string'
    && typeof record.updatedAt === 'string';
}

export function createPersonalBestStorage(adapter: Adapter) {
  return {
    async load(): Promise<PersonalBest[]> {
      try {
        const raw = await adapter.getItem(PERSONAL_BEST_STORAGE_KEY);
        if (!raw) return [];
        const document = JSON.parse(raw) as Partial<Document>;
        if (document.schemaVersion !== 1 || !Array.isArray(document.records)) return [];
        return document.records.filter(isPersonalBest);
      } catch {
        return [];
      }
    },
    async save(records: PersonalBest[]) {
      const document: Document = { schemaVersion: 1, records, updatedAt: new Date().toISOString() };
      await adapter.setItem(PERSONAL_BEST_STORAGE_KEY, JSON.stringify(document));
    },
  };
}

export const personalBestStorage = createPersonalBestStorage(AsyncStorage);

export type { PersonalBestGameKey, PersonalBestPlayerKey };
