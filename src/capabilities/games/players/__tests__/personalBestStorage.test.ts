jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined) },
}));

import { createPersonalBestStorage, PERSONAL_BEST_STORAGE_KEY } from '../personalBestStorage';

describe('personal best storage', () => {
  test('round trips valid records and ignores malformed records', async () => {
    let value: string | null = null;
    const adapter = {
      getItem: jest.fn(async () => value),
      setItem: jest.fn(async (_key: string, next: string) => { value = next; }),
    };
    const storage = createPersonalBestStorage(adapter);
    const record = {
      playerKey: 'saved:charlie' as const,
      gameKey: 'bank' as const,
      score: 420,
      achievedAt: '2026-07-19T20:00:00.000Z',
      updatedAt: '2026-07-19T20:00:00.000Z',
    };

    await storage.save([record]);
    expect(adapter.setItem).toHaveBeenCalledWith(PERSONAL_BEST_STORAGE_KEY, expect.any(String));
    expect(await storage.load()).toEqual([record]);

    value = JSON.stringify({ schemaVersion: 1, records: [{ playerKey: 'name:Charlie', gameKey: 'bank', score: 999 }] });
    expect(await storage.load()).toEqual([]);
  });
});
