jest.mock('@/src/capabilities/games/platform/supabase', () => ({ getGamesSupabaseClient: jest.fn() }));

import { personalBestFromRow, personalBestToRow } from '../personalBestCloud';

describe('personal best cloud mapping', () => {
  test('maps private roster records without changing identity or score', () => {
    const record = {
      playerKey: 'profile:andrew' as const,
      gameKey: 'bank' as const,
      score: 640,
      achievedAt: '2026-07-19T20:00:00.000Z',
      updatedAt: '2026-07-19T20:00:00.000Z',
    };
    const row = personalBestToRow('owner-1', record);
    expect(row).toEqual({
      owner_user_id: 'owner-1', player_key: 'profile:andrew', game_key: 'bank', score: 640,
      achieved_at: record.achievedAt, updated_at: record.updatedAt,
    });
    expect(personalBestFromRow(row)).toEqual(record);
  });
});
