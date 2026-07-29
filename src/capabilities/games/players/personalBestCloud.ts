import { getGamesSupabaseClient } from '@/src/capabilities/games/platform/supabase';
import type { PersonalBest, PersonalBestGameKey, PersonalBestPlayerKey } from './personalBests';

export type PersonalBestRow = {
  owner_user_id: string;
  player_key: PersonalBestPlayerKey;
  game_key: PersonalBestGameKey;
  score: number;
  achieved_at: string;
  updated_at: string;
};

export const personalBestFromRow = (row: PersonalBestRow): PersonalBest => ({
  playerKey: row.player_key,
  gameKey: row.game_key,
  score: row.score,
  achievedAt: row.achieved_at,
  updatedAt: row.updated_at,
});

export const personalBestToRow = (ownerUserId: string, record: PersonalBest): PersonalBestRow => ({
  owner_user_id: ownerUserId,
  player_key: record.playerKey,
  game_key: record.gameKey,
  score: record.score,
  achieved_at: record.achievedAt,
  updated_at: record.updatedAt,
});

export const personalBestCloud = {
  async load(userId: string): Promise<PersonalBest[]> {
    const { data, error } = await getGamesSupabaseClient()
      .from('game_personal_bests')
      .select('*')
      .eq('owner_user_id', userId);
    if (error) throw error;
    return (data as PersonalBestRow[]).map(personalBestFromRow);
  },
  async save(userId: string, records: PersonalBest[]): Promise<void> {
    if (!records.length) return;
    const { error } = await getGamesSupabaseClient()
      .from('game_personal_bests')
      .upsert(records.map((record) => personalBestToRow(userId, record)), { onConflict: 'owner_user_id,player_key,game_key' });
    if (error) throw error;
  },
};
