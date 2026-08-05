import {
  effectiveSharedHomeState,
  groupSharedHomeDeliveries,
  parseSharedHomeRow,
} from './sharedHomePresentation';

const now = new Date('2026-08-05T12:00:00.000Z');

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'delivery-1',
    event_kind: 'goal_invitation',
    source_capability: 'goals',
    source_entity_type: 'goal_invite',
    source_entity_id: 'invite-1',
    actor_display_name: 'David',
    title: 'Goal invitation',
    body: 'David invited you to support Run together.',
    destination: { kind: 'goal_invite', inviteCode: 'CODE1' },
    state: 'pending',
    settled_reason: null,
    created_at: '2026-08-05T10:00:00.000Z',
    updated_at: '2026-08-05T10:00:00.000Z',
    settled_at: null,
    expires_at: '2026-08-19T10:00:00.000Z',
    retain_until: '2026-09-04T10:00:00.000Z',
    ...overrides,
  };
}

describe('Shared Home presentation', () => {
  it('parses the closed Goal destination contract', () => {
    expect(parseSharedHomeRow(row(), now)).toMatchObject({
      id: 'delivery-1',
      eventKind: 'goal_invitation',
      destination: { kind: 'goal_invite', inviteCode: 'CODE1' },
      state: 'pending',
    });
  });

  it('parses the closed Game destination contract', () => {
    expect(parseSharedHomeRow(row({
      event_kind: 'game_turn',
      source_capability: 'games',
      source_entity_type: 'game_session',
      source_entity_id: 'room-1',
      destination: { kind: 'game_room', sessionId: 'room-1' },
    }), now)).toMatchObject({
      eventKind: 'game_turn',
      destination: { kind: 'game_room', sessionId: 'room-1' },
    });
  });

  it('parses an available Goal check-in as shared content', () => {
    expect(parseSharedHomeRow(row({
      event_kind: 'goal_checkin',
      source_capability: 'goals',
      source_entity_type: 'goal_checkin',
      source_entity_id: 'checkin-1',
      title: 'Plan our family camping trip',
      body: 'Made progress on the campground shortlist.',
      destination: { kind: 'goal', goalId: 'goal-1' },
      state: 'available',
      expires_at: null,
    }), now)).toMatchObject({
      eventKind: 'goal_checkin',
      sourceEntityType: 'goal_checkin',
      destination: { kind: 'goal', goalId: 'goal-1' },
      state: 'available',
    });
  });

  it('rejects unknown event and destination kinds', () => {
    expect(parseSharedHomeRow(row({ event_kind: 'marketing' }), now)).toBeNull();
    expect(parseSharedHomeRow(row({ destination: { kind: 'arbitrary_route', name: 'Settings' } }), now)).toBeNull();
  });

  it('derives expiry without mutating source authority', () => {
    const delivery = parseSharedHomeRow(row({ expires_at: '2026-08-05T11:00:00.000Z' }), now)!;
    expect(effectiveSharedHomeState(delivery, now)).toBe('expired');
  });

  it('redacts unavailable presentation', () => {
    expect(parseSharedHomeRow(row({ state: 'unavailable' }), now)).toMatchObject({
      actorDisplayName: null,
      title: 'No longer available',
      body: 'This shared item is no longer available.',
      state: 'unavailable',
    });
  });

  it('groups pending separately from shared content and sorts newest first', () => {
    const pendingOlder = parseSharedHomeRow(row({ id: 'pending-old', created_at: '2026-08-05T09:00:00.000Z' }), now)!;
    const pendingNewer = parseSharedHomeRow(row({ id: 'pending-new', created_at: '2026-08-05T11:00:00.000Z' }), now)!;
    const settled = parseSharedHomeRow(row({ id: 'settled', state: 'settled', created_at: '2026-08-05T08:00:00.000Z' }), now)!;
    const available = parseSharedHomeRow(row({
      id: 'checkin',
      event_kind: 'goal_checkin',
      source_entity_type: 'goal_checkin',
      source_entity_id: 'checkin-1',
      destination: { kind: 'goal', goalId: 'goal-1' },
      state: 'available',
      expires_at: null,
      created_at: '2026-08-05T10:30:00.000Z',
    }), now)!;

    const groups = groupSharedHomeDeliveries([pendingOlder, settled, available, pendingNewer], now);
    expect(groups.needsYou.map((item) => item.id)).toEqual(['pending-new', 'pending-old']);
    expect(groups.sharedWithYou.map((item) => item.id)).toEqual(['checkin', 'settled']);
  });
});
