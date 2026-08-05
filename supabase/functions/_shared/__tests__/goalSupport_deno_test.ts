import {
  assertEquals,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  buildWebGoalSupportPayload,
  webGoalSupportInviteIsEligible,
} from '../goalSupport.ts';

Deno.test('generic Goal invitations can receive a support note before the first check-in', () => {
  assertEquals(webGoalSupportInviteIsEligible({ intendedRecipientUserId: null }), true);
  assertEquals(
    buildWebGoalSupportPayload({
      targetEventId: null,
      text: 'I am in your corner.',
      senderName: 'Ruth',
    }),
    {
      targetEventId: null,
      text: 'I am in your corner.',
      webReply: true,
      goalSupport: true,
      senderName: 'Ruth',
    },
  );
});

Deno.test('recipient-bound Goal invitations cannot be used for anonymous web support', () => {
  assertEquals(
    webGoalSupportInviteIsEligible({ intendedRecipientUserId: 'user-2' }),
    false,
  );
});

Deno.test('a reply to an existing check-in remains attached to that check-in', () => {
  assertEquals(
    buildWebGoalSupportPayload({
      targetEventId: 'event-1',
      text: 'That is real progress.',
      senderName: '',
    }),
    {
      targetEventId: 'event-1',
      text: 'That is real progress.',
      webReply: true,
      goalSupport: false,
      senderName: null,
    },
  );
});
