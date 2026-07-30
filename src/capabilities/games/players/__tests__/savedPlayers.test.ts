import {
  activeSavedPlayers,
  archiveSavedPlayer,
  rememberPlayers,
  preparePlayerSelections,
  renameSavedPlayer,
  updateSavedPlayerIdentity,
  type SavedPlayer,
} from '../savedPlayers';

const at = (id: string, name: string, updatedAt = '2026-07-10T12:00:00.000Z'): SavedPlayer => ({
  id,
  displayName: name,
  linkedUserId: null,
  playCount: 1,
  lastPlayedAt: updatedAt,
  sortOrder: 0,
  archivedAt: null,
  createdAt: updatedAt,
  updatedAt,
});
describe('saved player roster', () => {
  test('remembers a new player with stable identity and usage', () => {
    const players = rememberPlayers([], [{ displayName: '  Blair  ' }], {
      now: '2026-07-11T12:00:00.000Z',
      createId: () => 'player-blair',
    });

    expect(players).toEqual([{ ...at('player-blair', 'Blair', '2026-07-11T12:00:00.000Z'), identity: { colorId: 'turmeric', successSoundId: 'chime', failureSoundId: 'trombone' } }]);
  });

  test('updates a selected saved player by id without merging equal names', () => {
    const current = [at('blair-one', 'Blair'), at('blair-two', 'Blair')];
    const players = rememberPlayers(current, [
      { savedPlayerId: 'blair-two', displayName: 'Blair' },
      { displayName: 'Blair' },
    ], {
      now: '2026-07-11T12:00:00.000Z',
      createId: () => 'blair-three',
    });

    expect(players).toHaveLength(3);
    expect(players.find((player) => player.id === 'blair-one')?.playCount).toBe(1);
    expect(players.find((player) => player.id === 'blair-two')?.playCount).toBe(2);
    expect(players.find((player) => player.id === 'blair-three')?.playCount).toBe(1);
  });

  test('ignores blank typed names and never remembers fallback labels', () => {
    const players = rememberPlayers([], [{ displayName: ' ' }, { displayName: 'Player 1' }], {
      now: '2026-07-11T12:00:00.000Z',
      createId: () => 'unused',
    });

    expect(players).toEqual([]);
  });

  test('renames and archives without replacing identity', () => {
    const current = [at('olive', 'Olive')];
    const renamed = renameSavedPlayer(current, 'olive', '  Liv  ', '2026-07-11T13:00:00.000Z');
    const archived = archiveSavedPlayer(renamed, 'olive', '2026-07-11T14:00:00.000Z');

    expect(renamed[0]).toMatchObject({ id: 'olive', displayName: 'Liv', updatedAt: '2026-07-11T13:00:00.000Z' });
    expect(archived[0]).toMatchObject({ id: 'olive', archivedAt: '2026-07-11T14:00:00.000Z' });
    expect(activeSavedPlayers(archived)).toEqual([]);
  });

  test('updates identity without replacing the saved player', () => {
    const current = [at('olive', 'Olive')];
    const updated = updateSavedPlayerIdentity(current, 'olive', {
      colorId: 'violet', successSoundId: 'sparkle', failureSoundId: 'bonk',
    }, '2026-07-11T15:00:00.000Z');

    expect(updated[0]).toMatchObject({
      id: 'olive', displayName: 'Olive',
      identity: { colorId: 'violet', successSoundId: 'sparkle', failureSoundId: 'bonk' },
      updatedAt: '2026-07-11T15:00:00.000Z',
    });
  });

  test('honors a prepared id when remembering a new player', () => {
    const next = rememberPlayers([], [{ savedPlayerId: 'stable-charlie', displayName: 'Charlie' }], {
      now: '2026-07-19T20:00:00.000Z',
      createId: () => 'unexpected-id',
    });
    expect(next[0].id).toBe('stable-charlie');
  });

  test('prepares stable ids for named new players before a game starts', () => {
    const ids = ['charlie', 'olive'];
    expect(preparePlayerSelections([
      { displayName: 'Charlie' },
      { savedPlayerId: 'blair', displayName: 'Blair' },
      { displayName: 'Player 3' },
    ], () => ids.shift() ?? 'extra')).toEqual([
      { savedPlayerId: 'charlie', displayName: 'Charlie' },
      { savedPlayerId: 'blair', displayName: 'Blair' },
      { displayName: 'Player 3' },
    ]);
  });

  test('orders active players by recent use, then name', () => {
    const players = [
      at('charlie', 'Charlie', '2026-07-10T12:00:00.000Z'),
      at('blair', 'Blair', '2026-07-11T12:00:00.000Z'),
      { ...at('olive', 'Olive', '2026-07-09T12:00:00.000Z'), archivedAt: '2026-07-11T12:00:00.000Z' },
      at('grant', 'Grant', '2026-07-10T12:00:00.000Z'),
    ];

    expect(activeSavedPlayers(players).map((player) => player.displayName)).toEqual(['Blair', 'Charlie', 'Grant']);
  });
});
