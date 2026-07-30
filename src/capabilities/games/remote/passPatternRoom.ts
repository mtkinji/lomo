import { advancePassPattern, type PassPatternAction, type PassPatternState } from '@/src/capabilities/games/domain/passPattern';

export type PassPatternRoomParticipant = { id: string; userId: string; seatIndex: number };
export type PassPatternRoom = {
  id: string;
  stateVersion: number;
  acceptedIdempotencyKeys: string[];
  readyParticipantIds: string[];
  participants: PassPatternRoomParticipant[];
  game: PassPatternState;
};

export type PassPatternRoomCommand = {
  actorUserId: string;
  participantId: string;
  expectedStateVersion: number;
  idempotencyKey: string;
  action: PassPatternAction | { type: 'observer_ready' };
};

type RoomRejection = 'state_conflict' | 'duplicate_command' | 'missing_idempotency_key' | 'not_a_member' | 'not_your_turn' | 'wrong_phase' | 'invalid_beat';
type RoomResult = { ok: true; room: PassPatternRoom } | { ok: false; reason: RoomRejection };

export function applyPassPatternRoomCommand(room: PassPatternRoom, command: PassPatternRoomCommand): RoomResult {
  if (!command.idempotencyKey.trim()) return { ok: false, reason: 'missing_idempotency_key' };
  if (room.acceptedIdempotencyKeys.includes(command.idempotencyKey)) return { ok: false, reason: 'duplicate_command' };
  if (command.expectedStateVersion !== room.stateVersion) return { ok: false, reason: 'state_conflict' };
  const participant = room.participants.find((item) => item.id === command.participantId && item.userId === command.actorUserId);
  if (!participant) return { ok: false, reason: 'not_a_member' };

  if (command.action.type === 'observer_ready') {
    return { ok: true, room: { ...room, stateVersion: room.stateVersion + 1, acceptedIdempotencyKeys: [...room.acceptedIdempotencyKeys, command.idempotencyKey], readyParticipantIds: [...new Set([...room.readyParticipantIds, participant.id])] } };
  }

  if (participant.seatIndex !== room.game.playerIndex) return { ok: false, reason: 'not_your_turn' };
  const result = advancePassPattern(room.game, command.action);
  if (!result.ok) return { ok: false, reason: result.reason };
  return { ok: true, room: { ...room, game: result.state, stateVersion: room.stateVersion + 1, acceptedIdempotencyKeys: [...room.acceptedIdempotencyKeys, command.idempotencyKey] } };
}
