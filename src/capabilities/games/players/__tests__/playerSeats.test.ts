import { toggleProfileSeat, toggleSavedPlayerSeat, type PlayerSeat } from '../playerSeats';
import type { GamePlayerProfile } from '../gamePlayerProfile';
import type { SavedPlayer } from '../savedPlayers';

const alden: SavedPlayer = {
  id: 'alden', displayName: 'Alden', linkedUserId: null, playCount: 2,
  lastPlayedAt: '2026-07-11', sortOrder: 0, archivedAt: null,
  createdAt: '2026-07-01', updatedAt: '2026-07-11',
};
const seats: PlayerSeat[] = [
  { key: 'one', displayName: 'Player 1' },
  { key: 'two', displayName: 'Player 2' },
];

describe('common saved-player seat selection', () => {
  it('adds a familiar player to a full table', () => {
    expect(toggleSavedPlayerSeat(seats, alden, () => ({ key: 'three', displayName: '' }))).toEqual([
      ...seats,
      { key: 'three', savedPlayerId: 'alden', displayName: 'Alden' },
    ]);
  });

  it('fills an empty seat before adding another one', () => {
    expect(toggleSavedPlayerSeat([{ ...seats[0], displayName: '' }, seats[1]], alden, jest.fn())).toEqual([
      { key: 'one', savedPlayerId: 'alden', displayName: 'Alden' },
      seats[1],
    ]);
  });

  it('removes a selected familiar player while preserving two seats', () => {
    const selected = [{ ...seats[0], savedPlayerId: 'alden', displayName: 'Alden' }, seats[1]];
    expect(toggleSavedPlayerSeat(selected, alden, jest.fn())).toEqual([
      { key: 'one', savedPlayerId: undefined, displayName: '' },
      seats[1],
    ]);
  });

  it('can replace the only host seat for a remote-only game', () => {
    expect(toggleSavedPlayerSeat(
      [{ key: 'host', displayName: 'Andrew' }],
      alden,
      jest.fn(),
      undefined,
      { minSeats: 1, maxSeats: 1 },
    )).toEqual([{ key: 'host', savedPlayerId: 'alden', profileUserId: undefined, displayName: 'Alden' }]);
  });

  it('seats a self-owned profile without turning it into a saved-player alias', () => {
    const profile: GamePlayerProfile = {
      userId: 'user-1', displayName: 'Olive',
      identity: { colorId: 'rose', successSoundId: 'sparkle', failureSoundId: 'bonk' },
      createdAt: '2026-07-12', updatedAt: '2026-07-12',
    };
    expect(toggleProfileSeat(seats, profile, () => ({ key: 'three', displayName: '' }))).toEqual([
      ...seats,
      { key: 'three', profileUserId: 'user-1', displayName: 'Olive', identity: profile.identity },
    ]);
  });
});
