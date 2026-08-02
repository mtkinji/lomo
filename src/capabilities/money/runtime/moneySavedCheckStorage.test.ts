import {
  createMoneySavedCheckStorage,
  moneySavedCheckStorageKey,
} from './moneySavedCheckStorage';
import { createWeeklyMoneySavedCheck } from '../domain/moneySavedCheck';

function memoryAdapter() {
  const rows = new Map<string, string>();
  return {
    rows,
    getItem: jest.fn(async (key: string) => rows.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { rows.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { rows.delete(key); }),
  };
}

describe('moneySavedCheckStorage', () => {
  it('isolates the typed envelope by user and stores no financial answer', async () => {
    const adapter = memoryAdapter();
    const storage = createMoneySavedCheckStorage(adapter);
    const check = createWeeklyMoneySavedCheck({ nowIso: '2026-07-31T12:00:00.000Z', timezone: 'America/Denver' });

    await storage.save('user-a', check);

    await expect(storage.load('user-a')).resolves.toEqual(check);
    await expect(storage.load('user-b')).resolves.toBeNull();
    expect(adapter.rows.get(moneySavedCheckStorageKey('user-a'))).toContain('"schemaVersion":1');
    expect(adapter.rows.get(moneySavedCheckStorageKey('user-a'))).not.toMatch(/cents|amount|percent|answer/i);
  });

  it('treats malformed, unsupported, and invalid documents as absent', async () => {
    const adapter = memoryAdapter();
    const storage = createMoneySavedCheckStorage(adapter);
    adapter.rows.set(moneySavedCheckStorageKey('bad-json'), '{bad');
    adapter.rows.set(moneySavedCheckStorageKey('bad-version'), JSON.stringify({ schemaVersion: 2, checks: [] }));
    adapter.rows.set(moneySavedCheckStorageKey('bad-kind'), JSON.stringify({ schemaVersion: 1, checks: [{ kind: 'query' }] }));

    await expect(storage.load('bad-json')).resolves.toBeNull();
    await expect(storage.load('bad-version')).resolves.toBeNull();
    await expect(storage.load('bad-kind')).resolves.toBeNull();
  });

  it('updates notification state, records an open, pauses, and removes the check', async () => {
    const adapter = memoryAdapter();
    const storage = createMoneySavedCheckStorage(adapter);
    const check = createWeeklyMoneySavedCheck({ nowIso: '2026-07-31T12:00:00.000Z', timezone: 'America/Denver' });
    await storage.save('user-a', check);

    await storage.setNotificationId('user-a', 'notification-1', '2026-07-31T12:01:00.000Z');
    await expect(storage.load('user-a')).resolves.toMatchObject({ notificationId: 'notification-1' });
    await storage.recordOpened('user-a', '2026-08-07T15:00:00.000Z');
    await expect(storage.load('user-a')).resolves.toMatchObject({ lastRun: { status: 'opened' } });
    await storage.setActive('user-a', false, '2026-08-07T15:01:00.000Z');
    await expect(storage.load('user-a')).resolves.toMatchObject({ active: false });
    await storage.remove('user-a');
    await expect(storage.load('user-a')).resolves.toBeNull();
  });
});
