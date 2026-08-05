import type { RealtimeChannel } from '@supabase/supabase-js';
import { getGamesSupabaseClient } from '@/src/capabilities/games/platform/supabase';
import type { BankingRule, BankGame } from '@/src/capabilities/games/domain/bank';
import type { RemoteBankInvite, RemoteBankParticipant, RemoteBankRoom, RemoteBankTableInvite } from './remoteBank';

type SessionRow = {
  id: string;
  host_user_id: string;
  status: RemoteBankRoom['status'];
  state: BankGame;
  state_version: number;
  expires_at: string;
};

type ParticipantRow = {
  id: string;
  seat_index: number;
  display_name_snapshot: string;
  user_id: string | null;
  controller_user_id: string;
  role: RemoteBankParticipant['role'];
  join_status: RemoteBankParticipant['joinStatus'];
};

function mapParticipant(row: ParticipantRow): RemoteBankParticipant {
  return {
    id: row.id,
    seatIndex: row.seat_index,
    displayName: row.display_name_snapshot,
    userId: row.user_id,
    controllerUserId: row.controller_user_id,
    role: row.role,
    joinStatus: row.join_status,
  };
}

export async function createRemoteBankRoom(names: string[], bankingRule: BankingRule) {
  const { data, error } = await getGamesSupabaseClient().rpc('create_remote_bank_room', { p_names: names, p_banking_rule: bankingRule });
  if (error) throw error;
  return data as string;
}

async function ensureGamesIdentity() {
  const client = getGamesSupabaseClient();
  const { data: current, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (current.session) return current.session;
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.session) throw error ?? new Error('Unable to start guest play.');
  return data.session;
}

export async function createRemoteBankTable(names: string[], bankingRule: BankingRule, capacity = 6) {
  const identity = await ensureGamesIdentity();
  const { data, error } = await getGamesSupabaseClient().rpc('create_open_bank_table', {
    p_names: names,
    p_banking_rule: bankingRule,
    p_capacity: capacity,
  });
  if (error) throw new Error(error.message || 'Unable to open a shared table.');
  return { sessionId: data as string, userId: identity.user.id };
}

export async function loadRemoteBankRoom(sessionId: string): Promise<RemoteBankRoom> {
  const client = getGamesSupabaseClient();
  const [{ data: session, error: sessionError }, { data: participants, error: participantError }] = await Promise.all([
    client.from('game_sessions').select('id,host_user_id,status,state,state_version,expires_at').eq('id', sessionId).single(),
    client.from('game_participants').select('id,seat_index,display_name_snapshot,user_id,controller_user_id,role,join_status').eq('session_id', sessionId).order('seat_index'),
  ]);
  if (sessionError) throw sessionError;
  if (participantError) throw participantError;
  const row = session as SessionRow;
  return {
    id: row.id,
    hostUserId: row.host_user_id,
    status: row.status,
    state: row.state,
    stateVersion: row.state_version,
    participants: (participants as ParticipantRow[]).map(mapParticipant),
    expiresAt: row.expires_at,
  };
}

export async function createRemoteBankInvite(sessionId: string, participantId: string): Promise<RemoteBankInvite> {
  const { data, error } = await getGamesSupabaseClient().rpc('create_remote_bank_invite', { p_session_id: sessionId, p_participant_id: participantId });
  if (error) throw error;
  const row = (data as { token: string; short_code: string; expires_at: string }[])[0];
  return { participantId, token: row.token, code: row.short_code, expiresAt: row.expires_at };
}

export async function createRemoteBankTableInvite(sessionId: string): Promise<RemoteBankTableInvite> {
  const { data, error } = await getGamesSupabaseClient().rpc('create_open_game_table_invite', { p_session_id: sessionId });
  if (error) throw error;
  const row = (data as { token: string; short_code: string; expires_at: string }[])[0];
  if (!row) throw new Error('Unable to open this table for joining.');
  return { token: row.token, code: row.short_code, expiresAt: row.expires_at };
}

export type OpenGameTablePreview = {
  gameKey: 'bank' | 'slanguage';
  hostDisplayName: string;
  participantCount: number;
  capacity: number;
  inviteState: 'available' | 'already_joined' | 'full' | 'closed' | 'expired';
  canJoin: boolean;
  alreadyJoined: boolean;
  sessionId: string;
  tableCode: string;
};

export async function previewOpenGameTableInvite(input: {
  token?: string;
  shortCode?: string;
}): Promise<OpenGameTablePreview> {
  await ensureGamesIdentity();
  const { data, error } = await getGamesSupabaseClient().rpc('preview_open_game_table', {
    p_token: input.token ?? null,
    p_short_code: input.shortCode ?? null,
  });
  if (error) throw error;
  const row = (data as Array<{
    game_key: OpenGameTablePreview['gameKey'];
    host_display_name: string;
    participant_count: number;
    capacity: number;
    invite_state: OpenGameTablePreview['inviteState'];
    can_join: boolean;
    already_joined: boolean;
    session_id: string;
    table_code: string;
  }>)[0];
  if (!row) throw new Error('That table invitation is unavailable.');
  return {
    gameKey: row.game_key,
    hostDisplayName: row.host_display_name,
    participantCount: row.participant_count,
    capacity: row.capacity,
    inviteState: row.invite_state,
    canJoin: row.can_join,
    alreadyJoined: row.already_joined,
    sessionId: row.session_id,
    tableCode: row.table_code,
  };
}

export async function claimRemoteBankInvite(token?: string, shortCode?: string) {
  const client = getGamesSupabaseClient();
  const { data: current } = await client.auth.getSession();
  if (!current.session) {
    const { error: authError } = await client.auth.signInAnonymously();
    if (authError) throw authError;
  }
  const { data, error } = await client.rpc('claim_remote_bank_invite', { p_token: token ?? null, p_short_code: shortCode ?? null });
  if (error) throw error;
  return data as string;
}

async function broadcastRoomChanged(sessionId: string, reason: string) {
  const client = getGamesSupabaseClient();
  const topic = `realtime:game:${sessionId}`;
  const activeChannel = client.getChannels().find((candidate) => candidate.topic === topic);
  const channel = activeChannel ?? client.channel(`game:${sessionId}`, { config: { private: true } });
  try {
    const result = await channel.send({ type: 'broadcast', event: 'state_changed', payload: { reason } });
    if (result !== 'ok') console.warn('[Games] Room update notification was not delivered.', { reason });
  } catch (error) {
    console.warn('[Games] Room update notification was not delivered.', { reason, error });
  } finally {
    if (!activeChannel) await client.removeChannel(channel).catch(() => undefined);
  }
}

export async function restartOpenGameTable(sessionId: string) {
  const { error } = await getGamesSupabaseClient().rpc('restart_open_game_table', {
    p_session_id: sessionId,
  });
  if (error) throw error;
  await broadcastRoomChanged(sessionId, 'table_restarted');
}

export async function claimRemoteBankTableInvite(input: { token?: string; shortCode?: string; displayName: string }) {
  await ensureGamesIdentity();
  const client = getGamesSupabaseClient();
  const { data, error } = await client.rpc('claim_open_game_table', {
    p_token: input.token ?? null,
    p_short_code: input.shortCode ?? null,
    p_display_name: input.displayName.trim(),
  });
  if (error) throw error;
  const row = (data as { session_id: string; participant_id: string; table_code: string; game_key: string }[])[0];
  if (!row) throw new Error('That table is no longer available.');
  await broadcastRoomChanged(row.session_id, 'participant_joined');
  return { sessionId: row.session_id, participantId: row.participant_id, tableCode: row.table_code, gameKey: row.game_key };
}

export async function startRemoteBankTable(sessionId: string) {
  const { error } = await getGamesSupabaseClient().rpc('start_open_bank_table', { p_session_id: sessionId });
  if (error) throw error;
  await broadcastRoomChanged(sessionId, 'table_started');
}

export async function removeRemoteBankTableParticipant(sessionId: string, participantId: string) {
  const { error } = await getGamesSupabaseClient().rpc('remove_open_game_table_participant', {
    p_session_id: sessionId,
    p_participant_id: participantId,
  });
  if (error) throw error;
  await broadcastRoomChanged(sessionId, 'participant_removed');
}

export async function submitRemoteBankCommand(input: {
  sessionId: string;
  participantId: string;
  actionType: 'roll' | 'bank';
  expectedStateVersion: number;
  idempotencyKey: string;
}) {
  const { data, error } = await getGamesSupabaseClient().functions.invoke('remote-bank-command', { body: input });
  if (error) throw error;
  return data as { state: BankGame; stateVersion: number; duplicate: boolean };
}

export function subscribeToRemoteBankRoom(sessionId: string, onInvalidate: () => void, onPresence?: (state: Record<string, unknown[]>) => void): RealtimeChannel {
  const client = getGamesSupabaseClient();
  const channel = client.channel(`game:${sessionId}`, { config: { private: true, presence: { key: sessionId } } });
  channel.on('broadcast', { event: 'state_changed' }, onInvalidate);
  channel.on('postgres_changes', {
    event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${sessionId}`,
  }, onInvalidate);
  channel.on('postgres_changes', {
    event: 'INSERT', schema: 'public', table: 'game_participants', filter: `session_id=eq.${sessionId}`,
  }, onInvalidate);
  if (onPresence) channel.on('presence', { event: 'sync' }, () => onPresence(channel.presenceState()));
  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') await channel.track({ connectedAt: new Date().toISOString() });
  });
  return channel;
}
