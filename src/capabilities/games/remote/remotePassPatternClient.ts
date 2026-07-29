import type { RealtimeChannel } from '@supabase/supabase-js';
import type { PassPatternAction, PassPatternState, PatternDifficulty } from '@/src/capabilities/games/domain/passPattern';
import { getGamesSupabaseClient } from '@/src/capabilities/games/platform/supabase';

export type RemotePassPatternParticipant = {
  id: string;
  seatIndex: number;
  displayName: string;
  userId: string | null;
  controllerUserId: string;
  joinStatus: 'local' | 'invited' | 'joined' | 'disconnected' | 'left';
};

export type RemotePassPatternRoom = {
  id: string;
  hostUserId: string;
  status: 'lobby' | 'active' | 'completed' | 'abandoned';
  state: PassPatternState;
  stateVersion: number;
  participants: RemotePassPatternParticipant[];
  expiresAt: string;
};

export async function createRemotePassPatternRoom(names: string[], difficulty: PatternDifficulty) {
  const { data, error } = await getGamesSupabaseClient().rpc('create_remote_pass_pattern_room', { p_names: names, p_difficulty: difficulty });
  if (error) throw error;
  return data as string;
}

export async function loadRemotePassPatternRoom(sessionId: string): Promise<RemotePassPatternRoom> {
  const client = getGamesSupabaseClient();
  const [{ data: session, error: sessionError }, { data: participants, error: participantError }] = await Promise.all([
    client.from('game_sessions').select('id,host_user_id,status,state,state_version,expires_at').eq('id', sessionId).eq('game_key', 'pass-pattern').single(),
    client.from('game_participants').select('id,seat_index,display_name_snapshot,user_id,controller_user_id,join_status').eq('session_id', sessionId).order('seat_index'),
  ]);
  if (sessionError) throw sessionError;
  if (participantError) throw participantError;
  return {
    id: session.id,
    hostUserId: session.host_user_id,
    status: session.status,
    state: session.state as PassPatternState,
    stateVersion: session.state_version,
    participants: participants.map((row) => ({
      id: row.id,
      seatIndex: row.seat_index,
      displayName: row.display_name_snapshot,
      userId: row.user_id,
      controllerUserId: row.controller_user_id,
      joinStatus: row.join_status,
    })),
    expiresAt: session.expires_at,
  };
}

export async function submitRemotePassPatternCommand(input: {
  sessionId: string;
  participantId: string;
  action: PassPatternAction;
  expectedStateVersion: number;
  idempotencyKey: string;
}) {
  const { type: actionType, ...payload } = input.action;
  const { data, error } = await getGamesSupabaseClient().functions.invoke('remote-pass-pattern-command', { body: { sessionId: input.sessionId, participantId: input.participantId, actionType, ...payload, expectedStateVersion: input.expectedStateVersion, idempotencyKey: input.idempotencyKey } });
  if (error) throw error;
  return data as { state: PassPatternState; stateVersion: number; duplicate: boolean };
}

export function subscribeToRemotePassPatternRoom(sessionId: string, onInvalidate: () => void): RealtimeChannel {
  const client = getGamesSupabaseClient();
  const channel = client.channel(`game:${sessionId}`, { config: { private: true, presence: { key: sessionId } } });
  channel.on('broadcast', { event: 'state_changed' }, onInvalidate);
  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') await channel.track({ connectedAt: new Date().toISOString() });
  });
  return channel;
}
