jest.mock('@/src/capabilities/games/platform/supabase', () => ({ getGamesSupabaseClient: jest.fn() }));

import { savedPlayerFromRow, savedPlayerToRow } from '../savedPlayerCloud';

const row = {
  id: 'olive', owner_user_id: 'owner', display_name: 'Olive', linked_user_id: null,
  play_count: 3, last_played_at: null, sort_order: 1, archived_at: null,
  created_at: '2026-07-12T00:00:00.000Z', updated_at: '2026-07-12T01:00:00.000Z',
  color_id: 'violet', success_sound_id: 'sparkle', failure_sound_id: 'bonk',
};

describe('saved player cloud identity mapping', () => {
  test('maps identity in both directions', () => {
    const player = savedPlayerFromRow(row);
    expect(player.identity).toEqual({ colorId: 'violet', successSoundId: 'sparkle', failureSoundId: 'bonk' });
    expect(savedPlayerToRow('owner', player)).toMatchObject({
      color_id: 'violet', success_sound_id: 'sparkle', failure_sound_id: 'bonk',
    });
  });

  test('normalizes legacy cloud rows with missing identity', () => {
    expect(savedPlayerFromRow({ ...row, color_id: null, success_sound_id: null, failure_sound_id: null }).identity).toEqual({
      colorId: 'turmeric', successSoundId: 'chime', failureSoundId: 'trombone',
    });
  });
});
