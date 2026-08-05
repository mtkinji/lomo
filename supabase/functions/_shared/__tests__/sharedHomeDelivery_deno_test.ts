import {
  assertEquals,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  buildGameTurnDelivery,
  buildGoalCheckinDelivery,
  buildGoalInvitationDelivery,
  sharedHomeRecipientEnabled,
  shouldEmitGameTurn,
} from '../sharedHomeDelivery.ts';
import { buildExpoPushMessages } from '../expoPush.ts';

Deno.test('Shared Home allowlist accepts only an exact recipient id', () => {
  assertEquals(sharedHomeRecipientEnabled('user-2', 'user-1,user-2'), true);
  assertEquals(sharedHomeRecipientEnabled('user-20', 'user-1,user-2'), false);
  assertEquals(sharedHomeRecipientEnabled('user-2', ''), false);
});

Deno.test('Goal invitation destination contains only the recipient invite code', () => {
  const delivery = buildGoalInvitationDelivery({
    inviteId: 'invite-1',
    inviteCode: 'CODE1',
    recipientUserId: 'user-2',
    actorUserId: 'user-1',
    actorDisplayName: 'David',
    goalTitle: 'Run together',
    expiresAt: '2026-08-19T00:00:00.000Z',
    nowIso: '2026-08-05T00:00:00.000Z',
  });

  assertEquals(delivery.idempotency_key, 'goal_invitation:invite-1:user-2');
  assertEquals(delivery.destination, { kind: 'goal_invite', inviteCode: 'CODE1' });
  assertEquals(delivery.body, 'David invited you to support Run together.');
  assertEquals(delivery.retain_until, '2026-09-04T00:00:00.000Z');
});

Deno.test('reused Goal invitation inputs preserve the idempotency key', () => {
  const input = {
    inviteId: 'invite-1',
    inviteCode: 'CODE1',
    recipientUserId: 'user-2',
    actorUserId: 'user-1',
    actorDisplayName: null,
    goalTitle: null,
    expiresAt: null,
    nowIso: '2026-08-05T00:00:00.000Z',
  };
  assertEquals(
    buildGoalInvitationDelivery(input).idempotency_key,
    buildGoalInvitationDelivery(input).idempotency_key,
  );
});

Deno.test('game handoff is emitted only for a changed permanent-account player', () => {
  assertEquals(shouldEmitGameTurn({
    duplicate: false,
    actionType: 'next_player',
    previousPlayerIndex: 0,
    nextPlayerIndex: 1,
    recipientIsAnonymous: false,
  }), true);
  assertEquals(shouldEmitGameTurn({
    duplicate: false,
    actionType: 'submit_beat',
    previousPlayerIndex: 0,
    nextPlayerIndex: 0,
    recipientIsAnonymous: false,
  }), false);
  assertEquals(shouldEmitGameTurn({
    duplicate: true,
    actionType: 'next_player',
    previousPlayerIndex: 0,
    nextPlayerIndex: 1,
    recipientIsAnonymous: false,
  }), false);
  assertEquals(shouldEmitGameTurn({
    duplicate: false,
    actionType: 'next_player',
    previousPlayerIndex: 0,
    nextPlayerIndex: 1,
    recipientIsAnonymous: true,
  }), false);
});

Deno.test('game handoff builder uses the committed state version', () => {
  const delivery = buildGameTurnDelivery({
    sessionId: 'room-1',
    committedStateVersion: 7,
    recipientUserId: 'user-2',
    actorUserId: 'user-1',
    actorDisplayName: 'David',
    expiresAt: '2026-08-06T00:00:00.000Z',
    nowIso: '2026-08-05T00:00:00.000Z',
  });
  assertEquals(delivery.idempotency_key, 'game_turn:room-1:7:user-2');
  assertEquals(delivery.destination, { kind: 'game_room', sessionId: 'room-1' });
});

Deno.test('Goal check-in builder creates one available item per exact recipient', () => {
  const delivery = buildGoalCheckinDelivery({
    checkinId: 'checkin-1',
    goalId: 'goal-1',
    recipientUserId: 'user-2',
    actorUserId: 'user-1',
    actorDisplayName: 'David',
    goalTitle: 'Plan our family camping trip',
    preset: 'made_progress',
    text: 'We have a campground shortlist.',
    nowIso: '2026-08-05T00:00:00.000Z',
  });

  assertEquals(delivery.idempotency_key, 'goal_checkin:checkin-1:user-2');
  assertEquals(delivery.state, 'available');
  assertEquals(delivery.destination, { kind: 'goal', goalId: 'goal-1' });
  assertEquals(delivery.title, 'Plan our family camping trip');
  assertEquals(delivery.body, 'We have a campground shortlist.');
  assertEquals(delivery.retain_until, '2026-09-04T00:00:00.000Z');
});

Deno.test('Goal check-in builder falls back to the authored preset without leaking unknown values', () => {
  assertEquals(buildGoalCheckinDelivery({
    checkinId: 'checkin-2',
    goalId: 'goal-1',
    recipientUserId: 'user-2',
    actorUserId: 'user-1',
    actorDisplayName: null,
    goalTitle: null,
    preset: 'need_encouragement',
    text: null,
  }).body, 'Could use some encouragement.');

  assertEquals(buildGoalCheckinDelivery({
    checkinId: 'checkin-3',
    goalId: 'goal-1',
    recipientUserId: 'user-2',
    actorUserId: 'user-1',
    actorDisplayName: null,
    goalTitle: null,
    preset: 'unknown',
    text: ' x '.repeat(300),
  }).body.length, 500);
});

Deno.test('push body never contains private experience presentation', () => {
  const messages = buildExpoPushMessages(['ExponentPushToken[token]'], 'delivery-1');
  assertEquals(messages[0].body, 'Something shared in Kwilt is ready for you.');
  assertEquals(messages[0].data, { type: 'sharedDelivery', deliveryId: 'delivery-1' });
});
