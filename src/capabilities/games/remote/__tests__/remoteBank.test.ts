import { canControlSeat, createInviteUrl, normalizeJoinCode, tableMarkForCode, validateRemoteCommand } from '../remoteBank';

const participants = [
  { id: 'host-seat', seatIndex: 0, displayName: 'Andrew', userId: null, controllerUserId: 'host-user', role: 'host' as const, joinStatus: 'local' as const },
  { id: 'remote-seat', seatIndex: 1, displayName: 'Grandma', userId: 'grandma-user', controllerUserId: 'grandma-user', role: 'player' as const, joinStatus: 'joined' as const },
];

describe('remote Bank seat control', () => {
  test('host controls seats that remain on the host device', () => {
    expect(canControlSeat(participants[0], 'host-user', 'host-user')).toBe(true);
    expect(canControlSeat(participants[0], 'grandma-user', 'host-user')).toBe(false);
  });

  test('an invited seat stays usable on the host until it is claimed', () => {
    expect(canControlSeat({ ...participants[0], joinStatus: 'invited' }, 'host-user', 'host-user')).toBe(true);
  });

  test('a joined player controls only their claimed seat', () => {
    expect(canControlSeat(participants[1], 'grandma-user', 'host-user')).toBe(true);
    expect(canControlSeat(participants[1], 'host-user', 'host-user')).toBe(false);
  });

  test('rejects stale commands before network submission', () => {
    expect(validateRemoteCommand({ expectedStateVersion: 3, currentStateVersion: 4, idempotencyKey: 'action-1' })).toEqual({
      ok: false,
      reason: 'state_conflict',
    });
  });

  test('requires an idempotency key', () => {
    expect(validateRemoteCommand({ expectedStateVersion: 4, currentStateVersion: 4, idempotencyKey: '  ' })).toEqual({
      ok: false,
      reason: 'missing_idempotency_key',
    });
  });

  test('builds one opaque link for QR and sharing', () => {
    expect(createInviteUrl('https://games.kwilt.app', 'opaque/token value')).toBe('https://games.kwilt.app/join/opaque%2Ftoken%20value');
  });

  test('falls back to the installed app deep link before the universal-link domain is live', () => {
    expect(createInviteUrl('kwiltgames://', 'private-token')).toBe('kwiltgames://join/private-token');
  });

  test('normalizes a human-entered short code', () => {
    expect(normalizeJoinCode(' w7k - 4jp ')).toBe('W7K4JP');
  });

  test('derives a stable, non-identifying table mark from the shared code', () => {
    expect(tableMarkForCode('W7K4JP')).toEqual(tableMarkForCode('w7k-4jp'));
    expect(tableMarkForCode('W7K4JP')).toMatch(/^[A-Z][a-z]+ [1-9]$/);
    expect(tableMarkForCode('W7K4JP')).not.toContain('W7K4JP');
  });
});
