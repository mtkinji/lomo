import { getGamesSupabaseClient } from '@/src/capabilities/games/platform/supabase';
import { gamePlayerProfileFromRow, gamePlayerProfileToRow, type GamePlayerProfile, type GamePlayerProfileRow } from './gamePlayerProfile';

export const gamePlayerProfileCloud = {
  async load(userId: string): Promise<GamePlayerProfile | null> {
    const { data, error } = await getGamesSupabaseClient()
      .from('game_player_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data ? gamePlayerProfileFromRow(data as GamePlayerProfileRow) : null;
  },
  async save(profile: GamePlayerProfile): Promise<void> {
    const { error } = await getGamesSupabaseClient()
      .from('game_player_profiles')
      .upsert(gamePlayerProfileToRow(profile), { onConflict: 'user_id' });
    if (error) throw error;
  },
};
