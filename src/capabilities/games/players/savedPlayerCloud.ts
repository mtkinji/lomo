import { getGamesSupabaseClient } from '@/src/capabilities/games/platform/supabase';
import type { SavedPlayer } from './savedPlayers';
import { normalizePlayerIdentity } from './playerIdentity';

export type SavedPlayerRow = {
  id: string;
  owner_user_id: string;
  display_name: string;
  linked_user_id: string | null;
  play_count: number;
  last_played_at: string | null;
  sort_order: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  color_id: string | null;
  success_sound_id: string | null;
  failure_sound_id: string | null;
};

export const savedPlayerFromRow = (row: SavedPlayerRow): SavedPlayer => ({
  id: row.id,
  displayName: row.display_name,
  linkedUserId: row.linked_user_id,
  playCount: row.play_count,
  lastPlayedAt: row.last_played_at,
  sortOrder: row.sort_order,
  archivedAt: row.archived_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  identity: normalizePlayerIdentity({
    colorId: row.color_id,
    successSoundId: row.success_sound_id,
    failureSoundId: row.failure_sound_id,
  }),
});

export const savedPlayerToRow = (ownerUserId: string, player: SavedPlayer): SavedPlayerRow => {
  const identity = normalizePlayerIdentity(player.identity);
  return {
    id: player.id,
    owner_user_id: ownerUserId,
    display_name: player.displayName,
    linked_user_id: player.linkedUserId,
    play_count: player.playCount,
    last_played_at: player.lastPlayedAt,
    sort_order: player.sortOrder,
    archived_at: player.archivedAt,
    created_at: player.createdAt,
    updated_at: player.updatedAt,
    color_id: identity.colorId,
    success_sound_id: identity.successSoundId,
    failure_sound_id: identity.failureSoundId,
  };
};

export const savedPlayerCloud = {
  async load(userId: string): Promise<SavedPlayer[]> {
    const { data, error } = await getGamesSupabaseClient()
      .from('game_saved_players')
      .select('*')
      .eq('owner_user_id', userId);
    if (error) throw error;
    return (data as SavedPlayerRow[]).map(savedPlayerFromRow);
  },

  async save(userId: string, players: SavedPlayer[]): Promise<void> {
    if (!players.length) return;
    const { error } = await getGamesSupabaseClient()
      .from('game_saved_players')
      .upsert(players.map((player) => savedPlayerToRow(userId, player)), { onConflict: 'id' });
    if (error) throw error;
  },
};
