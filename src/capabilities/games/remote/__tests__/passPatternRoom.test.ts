import { createPassPatternGame } from '@/src/capabilities/games/domain/passPattern';
import { applyPassPatternRoomCommand, type PassPatternRoom } from '../passPatternRoom';

const room = (): PassPatternRoom => ({
  id: 'room-1', stateVersion: 4, acceptedIdempotencyKeys: [], readyParticipantIds: [],
  participants: [
    { id: 'p1', userId: 'u1', seatIndex: 0 },
    { id: 'p2', userId: 'u2', seatIndex: 1 },
  ],
  game: createPassPatternGame('classic', 2),
});

describe('remote Pass the Pattern authority', () => {
  it('rejects stale, duplicate, non-member, and wrong-seat commands', () => {
    expect(applyPassPatternRoomCommand(room(), { actorUserId: 'u1', participantId: 'p1', expectedStateVersion: 3, idempotencyKey: 'a', action: { type: 'ready' } })).toEqual({ ok: false, reason: 'state_conflict' });

    expect(applyPassPatternRoomCommand({ ...room(), acceptedIdempotencyKeys: ['a'] }, { actorUserId: 'u1', participantId: 'p1', expectedStateVersion: 4, idempotencyKey: 'a', action: { type: 'ready' } })).toEqual({ ok: false, reason: 'duplicate_command' });

    expect(applyPassPatternRoomCommand(room(), { actorUserId: 'intruder', participantId: 'p1', expectedStateVersion: 4, idempotencyKey: 'b', action: { type: 'ready' } })).toEqual({ ok: false, reason: 'not_a_member' });

    expect(applyPassPatternRoomCommand(room(), { actorUserId: 'u2', participantId: 'p2', expectedStateVersion: 4, idempotencyKey: 'c', action: { type: 'ready' } })).toEqual({ ok: false, reason: 'not_your_turn' });
  });

  it('records observer readiness without advancing canonical gameplay', () => {
    const result = applyPassPatternRoomCommand(room(), { actorUserId: 'u2', participantId: 'p2', expectedStateVersion: 4, idempotencyKey: 'ready-2', action: { type: 'observer_ready' } });
    expect(result).toMatchObject({ ok: true, room: { stateVersion: 5, readyParticipantIds: ['p2'], game: { phase: 'handoff' } } });
  });

  it('accepts active-seat commands and advances the canonical version', () => {
    const result = applyPassPatternRoomCommand(room(), { actorUserId: 'u1', participantId: 'p1', expectedStateVersion: 4, idempotencyKey: 'ready-1', action: { type: 'ready' } });
    expect(result).toMatchObject({ ok: true, room: { stateVersion: 5, acceptedIdempotencyKeys: ['ready-1'], game: { phase: 'watch' } } });
  });

  it('rejects active-seat commands that do not fit the current phase', () => {
    const result = applyPassPatternRoomCommand(room(), { actorUserId: 'u1', participantId: 'p1', expectedStateVersion: 4, idempotencyKey: 'beat-early', action: { type: 'submit_beat', beatId: 'coral' } });
    expect(result).toEqual({ ok: false, reason: 'wrong_phase' });
  });
});
