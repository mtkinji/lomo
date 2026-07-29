import { archiveSeatSelection, identityForSeats, renameSeatSelection, type SetupSeat } from '../setupSeats';

const seats: SetupSeat[] = [
  { key: 'one', savedPlayerId: 'blair', displayName: 'Blair' },
  { key: 'two', savedPlayerId: 'olive', displayName: 'Olive' },
];

describe('remembered player seat integrity', () => {
  test('renaming updates every seat linked to that saved identity', () => {
    expect(renameSeatSelection(seats, 'blair', 'B')).toEqual([
      { key: 'one', savedPlayerId: 'blair', displayName: 'B' },
      seats[1],
    ]);
  });

  test('archiving clears a selected seat when two seats must remain visible', () => {
    expect(archiveSeatSelection(seats, 'blair')).toEqual([
      { key: 'one', savedPlayerId: undefined, displayName: '' },
      seats[1],
    ]);
  });

  test('archiving removes a selected seat when more than two seats exist', () => {
    const three = [...seats, { key: 'three', displayName: 'Grant' }];
    expect(archiveSeatSelection(three, 'blair')).toEqual([seats[1], three[2]]);
  });

  test('resolves saved identities and deterministic one-off defaults onto live seats', () => {
    expect(identityForSeats(seats, [{
      id: 'olive', displayName: 'Olive', linkedUserId: null, playCount: 1, lastPlayedAt: null,
      sortOrder: 0, archivedAt: null, createdAt: 'now', updatedAt: 'now',
      identity: { colorId: 'violet', successSoundId: 'sparkle', failureSoundId: 'bonk' },
    }])).toEqual([
      { colorId: 'turmeric', successSoundId: 'chime', failureSoundId: 'trombone' },
      { colorId: 'violet', successSoundId: 'sparkle', failureSoundId: 'bonk' },
    ]);
  });
});
