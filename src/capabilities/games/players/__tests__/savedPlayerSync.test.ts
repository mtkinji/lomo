import { mergeSavedPlayers } from '../savedPlayerSync';
import type { SavedPlayer } from '../savedPlayers';

const player = (overrides: Partial<SavedPlayer>): SavedPlayer => ({
  id: 'blair',
  displayName: 'Blair',
  linkedUserId: null,
  playCount: 1,
  lastPlayedAt: '2026-07-10T12:00:00.000Z',
  sortOrder: 0,
  archivedAt: null,
  createdAt: '2026-07-10T12:00:00.000Z',
  updatedAt: '2026-07-10T12:00:00.000Z',
  ...overrides,
});

describe('mergeSavedPlayers', () => {
  test('keeps the newest version of each stable player id', () => {
    const local = [player({ displayName: 'B', updatedAt: '2026-07-12T10:00:00.000Z' })];
    const cloud = [player({ displayName: 'Blair', updatedAt: '2026-07-11T10:00:00.000Z' })];

    expect(mergeSavedPlayers(local, cloud)).toEqual(local);
    expect(mergeSavedPlayers(cloud, local)).toEqual(local);
  });

  test('preserves distinct ids even when display names match', () => {
    const local = [player({ id: 'one' })];
    const cloud = [player({ id: 'two' })];

    expect(mergeSavedPlayers(local, cloud).map(({ id }) => id)).toEqual(['one', 'two']);
  });

  test('lets a newer archive tombstone win', () => {
    const local = [player({ updatedAt: '2026-07-11T10:00:00.000Z' })];
    const cloud = [player({ archivedAt: '2026-07-12T10:00:00.000Z', updatedAt: '2026-07-12T10:00:00.000Z' })];

    expect(mergeSavedPlayers(local, cloud)[0].archivedAt).toBe('2026-07-12T10:00:00.000Z');
  });
});
