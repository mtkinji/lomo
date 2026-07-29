import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.78.0';
import {
  advanceReveal,
  beginSlanguageReveal,
  beginSlanguageRound,
  nextServerSlanguageRound,
  reconcileSlanguageDeadline,
  resolveServerSlanguageRound,
  slanguagePublicSubmissionIds,
  validateSlanguageAction,
  type ServerSlanguageAction,
  type ServerSlanguageState,
  type SlanguageSubmissionResult,
  type SlanguageVote,
} from '../_shared/games-slanguage.ts';
import {
  SLANGUAGE_PROMPTS,
  buildSlanguageTranslation,
  type SlanguagePlacements,
} from '../../../src/capabilities/games/domain/slanguage.ts';

type Body = {
  sessionId: string;
  actionType: ServerSlanguageAction['type'];
  placements?: SlanguagePlacements;
  submissionParticipantId?: string;
  expectedStateVersion?: number;
  idempotencyKey?: string;
};

type SessionRow = {
  id: string;
  game_key: string;
  host_user_id: string;
  status: 'lobby' | 'active' | 'completed' | 'abandoned';
  state: ServerSlanguageState;
  state_version: number;
  expires_at: string;
};

type ParticipantRow = {
  id: string;
  seat_index: number;
  display_name_snapshot: string;
  user_id: string | null;
  controller_user_id: string;
  role: 'host' | 'player';
  join_status: string;
};

type SubmissionRow = {
  participant_id: string;
  placements: SlanguagePlacements;
  translation_text: string;
  slang_score: number;
};

type VoteRow = {
  voter_participant_id: string;
  submission_participant_id: string;
};

type GamesDatabase = {
  public: {
    Tables: {
      game_sessions: {
        Row: SessionRow;
        Insert: Partial<SessionRow>;
        Update: Partial<SessionRow>;
        Relationships: [];
      };
      game_participants: {
        Row: ParticipantRow;
        Insert: Partial<ParticipantRow>;
        Update: Partial<ParticipantRow>;
        Relationships: [];
      };
      game_invites: {
        Row: { session_id: string; revoked_at: string | null };
        Insert: { session_id: string; revoked_at?: string | null };
        Update: { revoked_at?: string | null };
        Relationships: [];
      };
      slanguage_hands: {
        Row: { session_id: string; round_index: number; participant_id: string; tile_ids: string[] };
        Insert: { session_id: string; round_index: number; participant_id: string; tile_ids: string[] };
        Update: { tile_ids?: string[] };
        Relationships: [];
      };
      slanguage_submissions: {
        Row: SubmissionRow & { session_id: string; round_index: number };
        Insert: SubmissionRow & { session_id: string; round_index: number };
        Update: Partial<SubmissionRow>;
        Relationships: [];
      };
      slanguage_votes: {
        Row: VoteRow & { session_id: string; round_index: number };
        Insert: VoteRow & { session_id: string; round_index: number };
        Update: Partial<VoteRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type AdminClient = SupabaseClient<GamesDatabase>;

const actionTypes = ['view', 'start', 'submit_translation', 'advance_reveal', 'submit_vote', 'next_round'];
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

async function broadcast(admin: AdminClient, sessionId: string) {
  const channel = admin.channel(`game:${sessionId}`, { config: { private: true } });
  await channel.send({ type: 'broadcast', event: 'state_changed', payload: {} }).catch(() => undefined);
  await admin.removeChannel(channel);
}

async function updateState(
  admin: AdminClient,
  session: SessionRow,
  state: ServerSlanguageState,
  status = session.status,
) {
  const { data, error } = await admin.from('game_sessions')
    .update({ state, state_version: session.state_version + 1, status, updated_at: new Date().toISOString() })
    .eq('id', session.id)
    .eq('state_version', session.state_version)
    .select('state,state_version,status')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('state_conflict');
  session.state = data.state as ServerSlanguageState;
  session.state_version = data.state_version;
  session.status = data.status;
}

async function privateRoundData(admin: AdminClient, session: SessionRow) {
  const round = session.state.roundIndex;
  const [{ data: submissions, error: submissionError }, { data: votes, error: voteError }] = await Promise.all([
    admin.from('slanguage_submissions').select('participant_id,placements,translation_text,slang_score').eq('session_id', session.id).eq('round_index', round),
    admin.from('slanguage_votes').select('voter_participant_id,submission_participant_id').eq('session_id', session.id).eq('round_index', round),
  ]);
  if (submissionError || voteError) throw submissionError ?? voteError;
  return { submissions: (submissions ?? []) as SubmissionRow[], votes: (votes ?? []) as VoteRow[] };
}

async function makeView(
  admin: AdminClient,
  session: SessionRow,
  participants: ParticipantRow[],
  participant: ParticipantRow,
) {
  const { submissions, votes } = await privateRoundData(admin, session);
  const publicIds = new Set(slanguagePublicSubmissionIds(session.state));
  const { data: handRow, error: handError } = await admin.from('slanguage_hands')
    .select('tile_ids')
    .eq('session_id', session.id)
    .eq('round_index', session.state.roundIndex)
    .eq('participant_id', participant.id)
    .maybeSingle();
  if (handError) throw handError;
  const prompt = SLANGUAGE_PROMPTS.find((entry) => entry.id === session.state.promptId) ?? null;
  const tiles = prompt ? [...prompt.targets.flatMap((target) => target.options), ...prompt.curveballs] : [];
  const handIds = (handRow?.tile_ids ?? []) as string[];
  const ownSubmission = submissions.find((entry) => entry.participant_id === participant.id);
  return {
    room: {
      id: session.id,
      hostUserId: session.host_user_id,
      status: session.status,
      state: session.state,
      stateVersion: session.state_version,
      participants: participants.map((entry) => ({
        id: entry.id,
        seatIndex: entry.seat_index,
        displayName: entry.display_name_snapshot,
        userId: entry.user_id,
        controllerUserId: entry.controller_user_id,
        role: entry.role,
        joinStatus: entry.join_status,
      })),
      currentParticipantId: participant.id,
      prompt,
      hand: handIds.map((id) => tiles.find((tile) => tile.id === id)).filter(Boolean),
      ownPlacements: ownSubmission?.placements ?? null,
      submittedCount: submissions.length,
      hasVoted: votes.some((vote) => vote.voter_participant_id === participant.id),
      revealedSubmissions: submissions
        .filter((entry) => publicIds.has(entry.participant_id))
        .map((entry) => ({ participantId: entry.participant_id, text: entry.translation_text, slangScore: entry.slang_score })),
    },
  };
}

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
  if (!body.sessionId || !actionTypes.includes(body.actionType)) return json({ error: 'invalid_command' }, 400);
  if (body.actionType !== 'view' && (!Number.isInteger(body.expectedStateVersion) || !body.idempotencyKey)) return json({ error: 'invalid_command' }, 400);
  if (body.actionType === 'submit_translation' && (!body.placements || typeof body.placements !== 'object')) return json({ error: 'invalid_command' }, 400);
  if (body.actionType === 'submit_vote' && !body.submissionParticipantId) return json({ error: 'invalid_command' }, 400);

  const admin = createClient<GamesDatabase>(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const [{ data: rawSession, error: sessionError }, { data: rawParticipants, error: participantError }] = await Promise.all([
    admin.from('game_sessions').select('id,game_key,host_user_id,status,state,state_version,expires_at').eq('id', body.sessionId).maybeSingle(),
    admin.from('game_participants').select('id,seat_index,display_name_snapshot,user_id,controller_user_id,role,join_status').eq('session_id', body.sessionId).neq('join_status', 'left').order('seat_index'),
  ]);
  if (sessionError || participantError) return json({ error: 'room_lookup_failed' }, 500);
  const session = rawSession as SessionRow | null;
  const participants = (rawParticipants ?? []) as ParticipantRow[];
  const participant = participants.find((entry) => entry.controller_user_id === userData.user.id);
  if (!session || session.game_key !== 'slanguage' || !participant || new Date(session.expires_at).getTime() <= Date.now()) return json({ error: 'room_unavailable' }, 404);
  if (body.actionType !== 'view' && session.state_version !== body.expectedStateVersion) return json({ error: 'state_conflict' }, 409);

  const now = new Date();
  try {
    const currentPrivate = await privateRoundData(admin, session);
    const reconciled = reconcileSlanguageDeadline(
      session.state,
      currentPrivate.submissions.map((entry) => ({ participantId: entry.participant_id, slangScore: entry.slang_score })),
      currentPrivate.votes.map((entry) => ({ voterParticipantId: entry.voter_participant_id, submissionParticipantId: entry.submission_participant_id })),
      now,
    );
    if (reconciled !== session.state) {
      await updateState(admin, session, reconciled);
      await broadcast(admin, session.id);
    }

    const action = body.actionType === 'submit_vote'
      ? { type: 'submit_vote', submissionParticipantId: body.submissionParticipantId! } as const
      : { type: body.actionType } as Exclude<ServerSlanguageAction, { type: 'submit_vote' }>;
    validateSlanguageAction(session.state, action, {
      participantId: participant.id,
      isHost: session.host_user_id === userData.user.id,
      participantIds: participants.map((entry) => entry.id),
    }, now);

    if (body.actionType === 'start') {
      const round = beginSlanguageRound(session.state, participants.map((entry) => entry.id), now);
      const { error: handError } = await admin.from('slanguage_hands').upsert(round.hands.map((hand) => ({
        session_id: session.id, round_index: round.state.roundIndex, participant_id: hand.participantId, tile_ids: hand.tileIds,
      })));
      if (handError) throw handError;
      await updateState(admin, session, round.state, 'active');
      await admin.from('game_invites').update({ revoked_at: now.toISOString() }).eq('session_id', session.id).is('revoked_at', null);
      await broadcast(admin, session.id);
    }

    if (body.actionType === 'submit_translation') {
      const placements = body.placements;
      if (!placements) throw new Error('placements_required');
      const prompt = SLANGUAGE_PROMPTS.find((entry) => entry.id === session.state.promptId);
      const { data: handRow, error: handError } = await admin.from('slanguage_hands').select('tile_ids')
        .eq('session_id', session.id).eq('round_index', session.state.roundIndex).eq('participant_id', participant.id).single();
      if (!prompt || handError || !handRow) throw handError ?? new Error('hand_not_found');
      const allTiles = [...prompt.targets.flatMap((target) => target.options), ...prompt.curveballs];
      const hand = (handRow.tile_ids as string[]).map((id) => allTiles.find((tile) => tile.id === id)).filter((tile): tile is NonNullable<typeof tile> => !!tile);
      const built = buildSlanguageTranslation(prompt, hand, placements);
      if (built.usedTiles.length === 0) throw new Error('one_tile_required');
      const { error: submissionError } = await admin.from('slanguage_submissions').upsert({
        session_id: session.id,
        round_index: session.state.roundIndex,
        participant_id: participant.id,
        placements,
        translation_text: built.text,
        slang_score: built.slangScore,
      });
      if (submissionError) throw submissionError;
      const nextPrivate = await privateRoundData(admin, session);
      if (nextPrivate.submissions.length >= participants.length) {
        const reveal = beginSlanguageReveal(session.state, nextPrivate.submissions.map((entry) => ({ participantId: entry.participant_id, slangScore: entry.slang_score })), now);
        await updateState(admin, session, reveal);
      }
      await broadcast(admin, session.id);
    }

    if (body.actionType === 'advance_reveal') {
      await updateState(admin, session, advanceReveal(session.state, now));
      await broadcast(admin, session.id);
    }

    if (body.actionType === 'submit_vote') {
      const submissionParticipantId = body.submissionParticipantId;
      if (!submissionParticipantId) throw new Error('submission_participant_required');
      const { error: voteError } = await admin.from('slanguage_votes').upsert({
        session_id: session.id,
        round_index: session.state.roundIndex,
        voter_participant_id: participant.id,
        submission_participant_id: submissionParticipantId,
      });
      if (voteError) throw voteError;
      const nextPrivate = await privateRoundData(admin, session);
      if (nextPrivate.votes.length >= participants.length) {
        const result = resolveServerSlanguageRound(
          session.state,
          nextPrivate.submissions.map((entry): SlanguageSubmissionResult => ({ participantId: entry.participant_id, slangScore: entry.slang_score })),
          nextPrivate.votes.map((entry): SlanguageVote => ({ voterParticipantId: entry.voter_participant_id, submissionParticipantId: entry.submission_participant_id })),
        );
        await updateState(admin, session, result);
      }
      await broadcast(admin, session.id);
    }

    if (body.actionType === 'next_round') {
      const next = nextServerSlanguageRound(session.state, participants.map((entry) => entry.id), now);
      if (next.hands.length > 0) {
        const { error: handError } = await admin.from('slanguage_hands').upsert(next.hands.map((hand) => ({
          session_id: session.id, round_index: next.state.roundIndex, participant_id: hand.participantId, tile_ids: hand.tileIds,
        })));
        if (handError) throw handError;
      }
      await updateState(admin, session, next.state, next.state.status === 'finished' ? 'completed' : 'active');
      await broadcast(admin, session.id);
    }

    return json(await makeView(admin, session, participants, participant));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'command_rejected';
    if (message.includes('state_conflict')) return json({ error: 'state_conflict' }, 409);
    return json({ error: message }, 422);
  }
});
