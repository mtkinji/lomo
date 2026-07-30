import {
  mergePersonalBests,
  playerBestKey,
  recordPersonalBests,
  type PersonalBest,
} from '../personalBests';

const at = (playerKey: PersonalBest['playerKey'], gameKey: PersonalBest['gameKey'], score: number, updatedAt: string): PersonalBest => ({
  playerKey,
  gameKey,
  score,
  achievedAt: updatedAt,
  updatedAt,
});

describe('personal bests', () => {
  test('uses stable player identity instead of display name', () => {
    expect(playerBestKey({ savedPlayerId: 'charlie', displayName: 'Charlie' })).toBe('saved:charlie');
    expect(playerBestKey({ profileUserId: 'andrew', displayName: 'Andrew' })).toBe('profile:andrew');
    expect(playerBestKey({ displayName: 'Charlie' })).toBeNull();
  });

  test('records a separate best for every stable player and game', () => {
    const result = recordPersonalBests([], 'bank', [
      { savedPlayerId: 'andrew', displayName: 'Andrew', score: 420 },
      { savedPlayerId: 'charlie', displayName: 'Charlie', score: 275 },
    ], '2026-07-19T20:00:00.000Z');

    expect(result.records).toEqual([
      at('saved:andrew', 'bank', 420, '2026-07-19T20:00:00.000Z'),
      at('saved:charlie', 'bank', 275, '2026-07-19T20:00:00.000Z'),
    ]);
    expect(result.outcomes.map(({ isNewBest, bestScore }) => ({ isNewBest, bestScore }))).toEqual([
      { isNewBest: true, bestScore: 420 },
      { isNewBest: true, bestScore: 275 },
    ]);
  });

  test('never lowers a best and keeps games separate', () => {
    const existing = [
      at('saved:charlie', 'bank', 500, '2026-07-18T20:00:00.000Z'),
      at('saved:charlie', 'farkle', 11200, '2026-07-18T21:00:00.000Z'),
    ];
    const result = recordPersonalBests(existing, 'bank', [
      { savedPlayerId: 'charlie', displayName: 'Charlie', score: 350 },
    ], '2026-07-19T20:00:00.000Z');

    expect(result.records).toEqual(existing);
    expect(result.outcomes[0]).toMatchObject({ previousBest: 500, bestScore: 500, isNewBest: false, matchedBest: false });
  });

  test('merges offline and cloud records by highest score, even when it is older', () => {
    const local = [at('saved:charlie', 'bank', 500, '2026-07-18T20:00:00.000Z')];
    const cloud = [at('saved:charlie', 'bank', 350, '2026-07-19T20:00:00.000Z')];
    expect(mergePersonalBests(local, cloud)).toEqual(local);
  });
});
