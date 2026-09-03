import type {
  SharedHomeDelivery,
  SharedHomeDestination,
  SharedHomeGroups,
  SharedHomeState,
} from './sharedHomeTypes';

const eventKinds = new Set(['goal_invitation', 'game_turn', 'goal_checkin', 'meal_choice_round']);
const capabilities = new Set(['goals', 'games', 'meal-planning']);
const sourceTypes = new Set(['goal_invite', 'game_session', 'goal_checkin', 'meal_choice_round']);
const states = new Set(['pending', 'available', 'settled', 'expired', 'unavailable']);

function nonEmpty(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function nullableString(value: unknown): string | null {
  return value == null ? null : nonEmpty(value);
}

function validIso(value: unknown): string | null {
  const text = nonEmpty(value);
  if (!text || !Number.isFinite(new Date(text).getTime())) return null;
  return text;
}

function parseDestination(value: unknown): SharedHomeDestination | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.kind === 'goal_invite') {
    const inviteCode = nonEmpty(record.inviteCode);
    return inviteCode ? { kind: 'goal_invite', inviteCode } : null;
  }
  if (record.kind === 'game_room') {
    const sessionId = nonEmpty(record.sessionId);
    return sessionId ? { kind: 'game_room', sessionId } : null;
  }
  if (record.kind === 'goal') {
    const goalId = nonEmpty(record.goalId);
    return goalId ? { kind: 'goal', goalId } : null;
  }
  if (record.kind === 'meal_choice') {
    const roundId = nonEmpty(record.roundId);
    return roundId ? { kind: 'meal_choice', roundId } : null;
  }
  return null;
}

export function effectiveSharedHomeState(
  delivery: SharedHomeDelivery,
  now = new Date(),
): SharedHomeState {
  if (delivery.state !== 'pending') return delivery.state;
  if (!delivery.expiresAt) return 'pending';
  return new Date(delivery.expiresAt).getTime() <= now.getTime() ? 'expired' : 'pending';
}

export function parseSharedHomeRow(
  value: unknown,
  now = new Date(),
): SharedHomeDelivery | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const id = nonEmpty(row.id);
  const eventKind = nonEmpty(row.event_kind);
  const sourceCapability = nonEmpty(row.source_capability);
  const sourceEntityType = nonEmpty(row.source_entity_type);
  const sourceEntityId = nonEmpty(row.source_entity_id);
  const title = nonEmpty(row.title);
  const body = nonEmpty(row.body);
  const destination = parseDestination(row.destination);
  const state = nonEmpty(row.state);
  const createdAt = validIso(row.created_at);
  const updatedAt = validIso(row.updated_at);
  const retainUntil = validIso(row.retain_until);
  const expiresAt = row.expires_at == null ? null : validIso(row.expires_at);
  const settledAt = row.settled_at == null ? null : validIso(row.settled_at);

  if (
    !id
    || !eventKind
    || !eventKinds.has(eventKind)
    || !sourceCapability
    || !capabilities.has(sourceCapability)
    || !sourceEntityType
    || !sourceTypes.has(sourceEntityType)
    || !sourceEntityId
    || !title
    || !body
    || !destination
    || !state
    || !states.has(state)
    || !createdAt
    || !updatedAt
    || !retainUntil
    || (row.expires_at != null && !expiresAt)
    || (row.settled_at != null && !settledAt)
  ) return null;

  if (
    (eventKind === 'goal_invitation' && (
      sourceCapability !== 'goals'
      || sourceEntityType !== 'goal_invite'
      || destination.kind !== 'goal_invite'
    ))
    || (eventKind === 'game_turn' && (
      sourceCapability !== 'games'
      || sourceEntityType !== 'game_session'
      || destination.kind !== 'game_room'
    ))
    || (eventKind === 'goal_checkin' && (
      sourceCapability !== 'goals'
      || sourceEntityType !== 'goal_checkin'
      || destination.kind !== 'goal'
      || state !== 'available'
    ))
    || (eventKind === 'meal_choice_round' && (
      sourceCapability !== 'meal-planning'
      || sourceEntityType !== 'meal_choice_round'
      || destination.kind !== 'meal_choice'
    ))
  ) return null;

  const delivery: SharedHomeDelivery = {
    id,
    eventKind: eventKind as SharedHomeDelivery['eventKind'],
    sourceCapability: sourceCapability as SharedHomeDelivery['sourceCapability'],
    sourceEntityType: sourceEntityType as SharedHomeDelivery['sourceEntityType'],
    sourceEntityId,
    actorUserId: nullableString(row.actor_user_id),
    actorDisplayName: nullableString(row.actor_display_name),
    title,
    body,
    destination,
    state: state as SharedHomeState,
    settledReason: nullableString(row.settled_reason),
    createdAt,
    updatedAt,
    settledAt,
    expiresAt,
    retainUntil,
  };

  const effectiveState = effectiveSharedHomeState(delivery, now);
  if (effectiveState === 'unavailable') {
    return {
      ...delivery,
      actorUserId: null,
      actorDisplayName: null,
      title: 'No longer available',
      body: 'This shared item is no longer available.',
      state: effectiveState,
    };
  }
  return { ...delivery, state: effectiveState };
}

export function groupSharedHomeDeliveries(
  deliveries: SharedHomeDelivery[],
  now = new Date(),
): SharedHomeGroups {
  const sorted = deliveries
    .map((delivery) => ({ ...delivery, state: effectiveSharedHomeState(delivery, now) }))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  return {
    needsYou: sorted.filter((delivery) => delivery.state === 'pending'),
    sharedWithYou: sorted.filter((delivery) => delivery.state !== 'pending'),
  };
}
