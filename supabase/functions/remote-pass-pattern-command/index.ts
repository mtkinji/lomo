import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.78.0';
import { applyRemotePassPatternCommand, type ServerPassPatternAction, type ServerPassPatternGame } from '../_shared/games-pass-pattern.ts';
import {
  buildGameTurnDelivery,
  insertSharedDelivery,
  settlePendingSourceDeliveries,
  sharedHomeRecipientEnabled,
  shouldEmitGameTurn,
} from '../_shared/sharedHomeDelivery.ts';
import { sendSharedDeliveryPush } from '../_shared/expoPush.ts';

type Body = {
  sessionId: string;
  participantId: string;
  actionType: ServerPassPatternAction['actionType'];
  beatId?: string;
  expectedStateVersion: number;
  idempotencyKey: string;
};

const actionTypes = ['ready', 'replay_watch', 'finish_watch', 'submit_beat', 'next_player', 'restart'];
const beatIds = ['coral', 'pine', 'gold', 'sky', 'violet', 'rose'];
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const authorization = request.headers.get('authorization');
  if (!authorization) return json({ error: 'authentication_required' }, 401);

  const url = Deno.env.get('SUPABASE_URL');
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !publishableKey || !serviceKey) return json({ error: 'server_not_configured' }, 500);

  const caller = createClient(url, publishableKey, { global: { headers: { Authorization: authorization } } });
  const { data: userData, error: userError } = await caller.auth.getUser();
  if (userError || !userData.user) return json({ error: 'authentication_required' }, 401);

  let body: Body;
  try { body = await request.json(); } catch { return json({ error: 'invalid_json' }, 400); }
  if (!body.sessionId || !body.participantId || !actionTypes.includes(body.actionType) || !Number.isInteger(body.expectedStateVersion) || !body.idempotencyKey || (body.actionType === 'submit_beat' && !beatIds.includes(body.beatId ?? ''))) {
    return json({ error: 'invalid_command' }, 400);
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const [{ data: session, error: sessionError }, { data: participant, error: participantError }] = await Promise.all([
    admin.from('game_sessions').select('id,game_key,state,state_version,status,expires_at').eq('id', body.sessionId).maybeSingle(),
    admin.from('game_participants').select('id,session_id,seat_index,controller_user_id,join_status').eq('id', body.participantId).maybeSingle(),
  ]);
  if (sessionError || participantError) return json({ error: 'room_lookup_failed' }, 500);
  if (!session || session.game_key !== 'pass-pattern' || !participant || participant.session_id !== body.sessionId || session.status !== 'active' || new Date(session.expires_at).getTime() <= Date.now()) return json({ error: 'room_unavailable' }, 404);
  if (participant.controller_user_id !== userData.user.id || !['local', 'joined', 'disconnected'].includes(participant.join_status)) return json({ error: 'seat_not_controlled' }, 403);
  if (session.state_version !== body.expectedStateVersion) return json({ error: 'state_conflict', state: session.state, stateVersion: session.state_version }, 409);

  let nextState: ServerPassPatternGame;
  try {
    const action = body.actionType === 'submit_beat'
      ? { actionType: 'submit_beat', beatId: body.beatId as 'coral' | 'pine' | 'gold' | 'sky' | 'violet' | 'rose' } as const
      : { actionType: body.actionType } as Exclude<ServerPassPatternAction, { actionType: 'submit_beat' }>;
    nextState = applyRemotePassPatternCommand(session.state as ServerPassPatternGame, participant.seat_index, action);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'command_rejected' }, 422);
  }

  const { data, error } = await admin.rpc('commit_remote_bank_command', {
    p_session_id: body.sessionId,
    p_actor_user_id: userData.user.id,
    p_participant_id: body.participantId,
    p_action_type: body.actionType,
    p_payload: body.beatId ? { beatId: body.beatId } : {},
    p_idempotency_key: body.idempotencyKey,
    p_expected_state_version: body.expectedStateVersion,
    p_next_state: nextState,
  });
  if (error) {
    if (error.code === '40001' || error.message.includes('state_conflict')) return json({ error: 'state_conflict' }, 409);
    return json({ error: 'command_commit_failed' }, 500);
  }

  const result = Array.isArray(data) ? data[0] : data;

  // A Pass the Pattern handoff is meaningful asynchronous participation. Other
  // beat-level actions stay inside live play and never become Home noise.
  if (result && result.duplicate !== true && (body.actionType === 'next_player' || body.actionType === 'restart')) {
    try {
      await settlePendingSourceDeliveries(
        admin,
        'games',
        body.sessionId,
        body.actionType === 'restart' ? 'game_restarted' : 'turn_advanced',
      );

      if (body.actionType === 'next_player') {
        const { data: nextParticipant, error: nextParticipantError } = await admin
          .from('game_participants')
          .select('controller_user_id')
          .eq('session_id', body.sessionId)
          .eq('seat_index', nextState.playerIndex)
          .maybeSingle();
        if (nextParticipantError) throw nextParticipantError;

        const recipientUserId = typeof nextParticipant?.controller_user_id === 'string'
          ? nextParticipant.controller_user_id
          : '';
        const recipientResult = recipientUserId
          ? await admin.auth.admin.getUserById(recipientUserId)
          : null;
        const recipientIsAnonymous = recipientResult?.data?.user?.is_anonymous !== false;
        const committedStateVersion = Number(result.state_version);
        const emit = Number.isInteger(committedStateVersion) && shouldEmitGameTurn({
          duplicate: false,
          actionType: body.actionType,
          previousPlayerIndex: (session.state as ServerPassPatternGame).playerIndex,
          nextPlayerIndex: nextState.playerIndex,
          recipientIsAnonymous,
        });

        if (emit && recipientUserId && sharedHomeRecipientEnabled(recipientUserId)) {
          const metadata = userData.user.user_metadata ?? {};
          const actorDisplayName = typeof metadata.full_name === 'string'
            ? metadata.full_name
            : typeof metadata.name === 'string'
              ? metadata.name
              : null;
          const delivery = buildGameTurnDelivery({
            sessionId: body.sessionId,
            committedStateVersion,
            recipientUserId,
            actorUserId: userData.user.id,
            actorDisplayName,
            expiresAt: session.expires_at,
          });
          const saved = await insertSharedDelivery(admin, delivery);
          if (saved.created) {
            const push = await sendSharedDeliveryPush(admin, recipientUserId, saved.id);
            if (push.rejected > 0) {
              console.warn('[shared-home] Game handoff push was not accepted by every device', {
                deliveryId: saved.id,
                attempted: push.attempted,
                accepted: push.accepted,
                rejected: push.rejected,
              });
            }
          }
        }
      }
    } catch (deliveryError) {
      console.warn('[shared-home] Game handoff delivery unavailable', {
        actionType: body.actionType,
        errorClass: deliveryError instanceof Error ? deliveryError.name : 'unknown',
      });
    }
  }

  const channel = admin.channel(`game:${body.sessionId}`, { config: { private: true } });
  await channel.send({ type: 'broadcast', event: 'state_changed', payload: { stateVersion: result.state_version } }).catch(() => undefined);
  await admin.removeChannel(channel);
  return json({ state: result.state, stateVersion: result.state_version, duplicate: result.duplicate });
});
