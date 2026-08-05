export type SharedDeliveryInsert = {
  idempotency_key: string;
  recipient_user_id: string;
  actor_user_id: string | null;
  event_kind: 'goal_invitation' | 'game_turn';
  source_capability: 'goals' | 'games';
  source_entity_type: 'goal_invite' | 'game_session';
  source_entity_id: string;
  actor_display_name: string | null;
  title: string;
  body: string;
  destination:
    | { kind: 'goal_invite'; inviteCode: string }
    | { kind: 'game_room'; sessionId: string };
  state: 'pending';
  expires_at: string | null;
  retain_until: string;
};

type GoalInvitationDeliveryInput = {
  inviteId: string;
  inviteCode: string;
  recipientUserId: string;
  actorUserId: string;
  actorDisplayName: string | null;
  goalTitle: string | null;
  expiresAt: string | null;
  nowIso?: string;
};

type GameTurnDeliveryInput = {
  sessionId: string;
  committedStateVersion: number;
  recipientUserId: string;
  actorUserId: string;
  actorDisplayName: string | null;
  expiresAt: string | null;
  nowIso?: string;
};

type GameTurnDecision = {
  duplicate: boolean;
  actionType: string;
  previousPlayerIndex: number;
  nextPlayerIndex: number;
  recipientIsAnonymous: boolean;
};

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function boundedText(value: string | null | undefined, maxLength: number): string | null {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized ? normalized.slice(0, maxLength) : null;
}

function retainUntil(nowIso?: string): string {
  const parsed = nowIso ? new Date(nowIso) : new Date();
  const now = Number.isFinite(parsed.getTime()) ? parsed : new Date();
  return new Date(now.getTime() + RETENTION_MS).toISOString();
}

export function sharedHomeRecipientEnabled(
  recipientId: string,
  rawAllowlist = Deno.env.get('SHARED_HOME_RECIPIENT_IDS') ?? '',
): boolean {
  const normalizedRecipient = recipientId.trim();
  if (!normalizedRecipient) return false;
  return new Set(
    rawAllowlist
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  ).has(normalizedRecipient);
}

export function buildGoalInvitationDelivery(
  input: GoalInvitationDeliveryInput,
): SharedDeliveryInsert {
  const actorDisplayName = boundedText(input.actorDisplayName, 80);
  const goalTitle = boundedText(input.goalTitle, 120);
  const actor = actorDisplayName ?? 'Someone';
  const subject = goalTitle ?? 'a Goal';

  return {
    idempotency_key: `goal_invitation:${input.inviteId}:${input.recipientUserId}`,
    recipient_user_id: input.recipientUserId,
    actor_user_id: input.actorUserId,
    event_kind: 'goal_invitation',
    source_capability: 'goals',
    source_entity_type: 'goal_invite',
    source_entity_id: input.inviteId,
    actor_display_name: actorDisplayName,
    title: 'Goal invitation',
    body: `${actor} invited you to support ${subject}.`.slice(0, 240),
    destination: { kind: 'goal_invite', inviteCode: input.inviteCode },
    state: 'pending',
    expires_at: input.expiresAt,
    retain_until: retainUntil(input.nowIso),
  };
}

export function shouldEmitGameTurn(input: GameTurnDecision): boolean {
  return !input.duplicate
    && input.actionType === 'next_player'
    && input.previousPlayerIndex !== input.nextPlayerIndex
    && !input.recipientIsAnonymous;
}

export function buildGameTurnDelivery(input: GameTurnDeliveryInput): SharedDeliveryInsert {
  return {
    idempotency_key: `game_turn:${input.sessionId}:${input.committedStateVersion}:${input.recipientUserId}`,
    recipient_user_id: input.recipientUserId,
    actor_user_id: input.actorUserId,
    event_kind: 'game_turn',
    source_capability: 'games',
    source_entity_type: 'game_session',
    source_entity_id: input.sessionId,
    actor_display_name: boundedText(input.actorDisplayName, 80),
    title: 'Your turn',
    body: 'Pass the Pattern is ready for you.',
    destination: { kind: 'game_room', sessionId: input.sessionId },
    state: 'pending',
    expires_at: input.expiresAt,
    retain_until: retainUntil(input.nowIso),
  };
}

export async function insertSharedDelivery(
  admin: SupabaseClient,
  row: SharedDeliveryInsert,
): Promise<{ id: string; created: boolean }> {
  const inserted = await admin
    .from('kwilt_shared_deliveries')
    .insert(row)
    .select('id')
    .maybeSingle();

  if (!inserted.error && typeof inserted.data?.id === 'string') {
    return { id: inserted.data.id, created: true };
  }
  if (inserted.error?.code !== '23505') {
    throw inserted.error ?? new Error('shared_delivery_insert_failed');
  }

  const existing = await admin
    .from('kwilt_shared_deliveries')
    .select('id')
    .eq('idempotency_key', row.idempotency_key)
    .maybeSingle();
  if (existing.error || typeof existing.data?.id !== 'string') {
    throw existing.error ?? new Error('shared_delivery_missing_after_conflict');
  }
  return { id: existing.data.id, created: false };
}

export async function settlePendingSourceDeliveries(
  admin: SupabaseClient,
  sourceCapability: 'goals' | 'games',
  sourceEntityId: string,
  reason: string,
  nowIso = new Date().toISOString(),
): Promise<void> {
  const result = await admin
    .from('kwilt_shared_deliveries')
    .update({
      state: 'settled',
      settled_reason: boundedText(reason, 80),
      settled_at: nowIso,
      updated_at: nowIso,
    })
    .eq('source_capability', sourceCapability)
    .eq('source_entity_id', sourceEntityId)
    .eq('state', 'pending');
  if (result.error) throw result.error;
}
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
