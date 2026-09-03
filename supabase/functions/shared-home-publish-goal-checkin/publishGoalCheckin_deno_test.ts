import { assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  publishGoalCheckin,
  PublishGoalCheckinError,
  type GoalCheckinPublisherRepository,
} from './publishGoalCheckin.ts';

function repository(overrides: Partial<GoalCheckinPublisherRepository> = {}) {
  const inserts: Array<{ recipient_user_id: string; idempotency_key: string }> = [];
  const pushes: Array<{ recipientUserId: string; deliveryId: string }> = [];
  const value: GoalCheckinPublisherRepository = {
    getCheckin: async () => ({
      id: 'checkin-1', goalId: 'goal-1', userId: 'user-1',
      preset: 'made_progress', text: 'We have a campground shortlist.',
    }),
    isActiveGoalMember: async () => true,
    listActiveGoalMemberIds: async () => ['user-1', 'user-2', 'user-3'],
    isBlockedRelationship: async () => false,
    getActorDisplayName: async () => 'David',
    getGoalTitle: async () => 'Plan our family camping trip',
    insert: async (row) => {
      inserts.push({ recipient_user_id: row.recipient_user_id, idempotency_key: row.idempotency_key });
      return { id: `delivery-${row.recipient_user_id}`, created: true };
    },
    push: async (recipientUserId, deliveryId) => {
      pushes.push({ recipientUserId, deliveryId });
    },
    ...overrides,
  };
  return { value, inserts, pushes };
}

Deno.test('publisher rejects a missing or mismatched authoritative check-in', async () => {
  const missing = repository({ getCheckin: async () => null });
  await assertRejects(
    () => publishGoalCheckin({ callerUserId: 'user-1', checkinId: 'missing' }, missing.value, () => true),
    PublishGoalCheckinError,
    'checkin_not_found',
  );

  const mismatch = repository();
  await assertRejects(
    () => publishGoalCheckin({ callerUserId: 'user-9', checkinId: 'checkin-1' }, mismatch.value, () => true),
    PublishGoalCheckinError,
    'checkin_author_required',
  );
});

Deno.test('publisher requires the author to remain an active Goal member', async () => {
  const repo = repository({ isActiveGoalMember: async () => false });
  await assertRejects(
    () => publishGoalCheckin({ callerUserId: 'user-1', checkinId: 'checkin-1' }, repo.value, () => true),
    PublishGoalCheckinError,
    'active_goal_membership_required',
  );
});

Deno.test('publisher excludes the actor and filters exact recipients through the release allowlist', async () => {
  const repo = repository();
  const result = await publishGoalCheckin(
    { callerUserId: 'user-1', checkinId: 'checkin-1' },
    repo.value,
    (recipientId) => recipientId === 'user-2',
  );

  assertEquals(repo.inserts, [{
    recipient_user_id: 'user-2',
    idempotency_key: 'goal_checkin:checkin-1:user-2',
  }]);
  assertEquals(repo.pushes, [{ recipientUserId: 'user-2', deliveryId: 'delivery-user-2' }]);
  assertEquals(result, { eligibleRecipients: 2, enabledRecipients: 1, created: 1 });
});

Deno.test('publisher does not push an idempotently reused item', async () => {
  const repo = repository({ insert: async () => ({ id: 'delivery-existing', created: false }) });
  const result = await publishGoalCheckin(
    { callerUserId: 'user-1', checkinId: 'checkin-1' },
    repo.value,
    () => true,
  );
  assertEquals(repo.pushes, []);
  assertEquals(result.created, 0);
});

Deno.test('publisher excludes blocked recipients before delivery creation', async () => {
  const repo = repository({ isBlockedRelationship: async (_actor, recipient) => recipient === 'user-2' });
  const result = await publishGoalCheckin(
    { callerUserId: 'user-1', checkinId: 'checkin-1' },
    repo.value,
    () => true,
  );
  assertEquals(repo.inserts.map((row) => row.recipient_user_id), ['user-3']);
  assertEquals(result, { eligibleRecipients: 2, enabledRecipients: 1, created: 1 });
});
