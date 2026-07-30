import type { RealtimeChannel } from '@supabase/supabase-js';
import type { SlanguagePlacements, SlanguagePrompt, SlanguageTile } from '@/src/capabilities/games/domain/slanguage';
import { getGamesSupabaseClient } from '@/src/capabilities/games/platform/supabase';

export type RemoteSlanguageParticipant = {
  id: string;
  seatIndex: number;
  displayName: string;
  userId: string | null;
  controllerUserId: string;
  role: 'host' | 'player';
  joinStatus: 'local' | 'joined' | 'disconnected' | 'left';
};

export type RemoteSlanguageState = {
  phase: 'lobby' | 'build' | 'reveal' | 'vote' | 'result' | 'finished';
  status: 'playing' | 'finished';
  capacity: number;
  roundIndex: number;
  totalRounds: number;
  promptId: string | null;
  deadline: string | null;
  revealOrder: string[];
  revealIndex: number;
  revealStartedAt: string | null;
  crowns: Record<string, number>;
  crownScores: Record<string, number>;
  roundWinnerIds: string[];
  winnerIds: string[];
};

export type RemoteSlanguageSubmission = {
  participantId: string;
  text: string;
  slangScore: number;
};

export type RemoteSlanguageRoom = {
  id: string;
  hostUserId: string;
  status: 'lobby' | 'active' | 'completed' | 'abandoned';
  state: RemoteSlanguageState;
  stateVersion: number;
  participants: RemoteSlanguageParticipant[];
  currentParticipantId: string;
  prompt: SlanguagePrompt | null;
  hand: SlanguageTile[];
  ownPlacements: SlanguagePlacements | null;
  submittedCount: number;
  hasVoted: boolean;
  revealedSubmissions: RemoteSlanguageSubmission[];
};

export type RemoteSlanguageAction =
  | { type: 'start' | 'advance_reveal' | 'next_round' }
  | { type: 'submit_translation'; placements: SlanguagePlacements }
  | { type: 'submit_vote'; submissionParticipantId: string };

async function ensureGamesIdentity() {
  const client = getGamesSupabaseClient();
  const { data: current, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (current.session) return current.session;
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.session) throw error ?? new Error('Unable to start guest play.');
  return data.session;
}

export async function createOpenSlanguageTable(hostName: string, capacity = 8) {
  const identity = await ensureGamesIdentity();
  const { data, error } = await getGamesSupabaseClient().rpc('create_open_slanguage_table', {
    p_host_name: hostName.trim(),
    p_capacity: capacity,
  });
  if (error) throw error;
  return { sessionId: data as string, userId: identity.user.id };
}

export async function createOpenGameTableInvite(sessionId: string) {
  const { data, error } = await getGamesSupabaseClient().rpc('create_open_game_table_invite', { p_session_id: sessionId });
  if (error) throw error;
  const row = (data as { token: string; short_code: string; expires_at: string }[])[0];
  if (!row) throw new Error('Unable to open this table for joining.');
  return { token: row.token, code: row.short_code, expiresAt: row.expires_at };
}

export async function loadRemoteSlanguageRoom(sessionId: string): Promise<RemoteSlanguageRoom> {
  const { data, error } = await getGamesSupabaseClient().functions.invoke('remote-slanguage-command', {
    body: { sessionId, actionType: 'view' },
  });
  if (error) throw error;
  if (!data?.room) throw new Error(data?.error ?? 'Unable to load Slanguage.');
  return data.room as RemoteSlanguageRoom;
}

export async function submitRemoteSlanguageCommand(input: {
  sessionId: string;
  action: RemoteSlanguageAction;
  expectedStateVersion: number;
  idempotencyKey: string;
}) {
  const { type: actionType, ...payload } = input.action;
  const { data, error } = await getGamesSupabaseClient().functions.invoke('remote-slanguage-command', {
    body: {
      sessionId: input.sessionId,
      actionType,
      ...payload,
      expectedStateVersion: input.expectedStateVersion,
      idempotencyKey: input.idempotencyKey,
    },
  });
  if (error) throw error;
  if (!data?.room) throw new Error(data?.error ?? 'That Slanguage move did not go through.');
  return data.room as RemoteSlanguageRoom;
}

export function subscribeToSlanguageRoom(sessionId: string, onInvalidate: () => void): RealtimeChannel {
  const client = getGamesSupabaseClient();
  const channel = client.channel(`game:${sessionId}`, { config: { private: true, presence: { key: sessionId } } });
  channel.on('broadcast', { event: 'state_changed' }, onInvalidate);
  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') await channel.track({ connectedAt: new Date().toISOString() });
  });
  return channel;
}
