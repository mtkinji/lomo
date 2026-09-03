import { assertEquals, assertRejects } from 'jsr:@std/assert@1';
import { chooseSafetyFollowup, submitUgcReport, UgcReportError } from './report.ts';

function repository(overrides: Partial<Parameters<typeof submitUgcReport>[2]> = {}) {
  return {
    resolveTarget: async () => ({
      reportedUserId: '10000000-0000-0000-0000-000000000002',
      reportedPersonId: null,
      snapshot: { type: 'checkin_reply', text: 'unwelcome message' },
      followup: { kind: 'peer_block' as const },
    }),
    insert: async () => ({ id: '30000000-0000-0000-0000-000000000001' }),
    alert: async () => undefined,
    ...overrides,
  };
}

Deno.test('report submission captures server target and returns a non-sensitive receipt', async () => {
  const result = await submitUgcReport(
    '10000000-0000-0000-0000-000000000001',
    {
      targetKind: 'goal_feed_event',
      targetId: '20000000-0000-0000-0000-000000000001',
      reason: 'harassment',
      note: null,
      appVersion: null,
      buildNumber: null,
    },
    repository(),
    () => '2026-09-03T12:00:00.000Z',
  );

  assertEquals(result, {
    reportId: '30000000-0000-0000-0000-000000000001',
    status: 'submitted',
    followup: { kind: 'peer_block' },
  });
});

Deno.test('report submission preserves a managed child help boundary', async () => {
  const result = await submitUgcReport(
    '10000000-0000-0000-0000-000000000001',
    {
      targetKind: 'goal_feed_event',
      targetId: '20000000-0000-0000-0000-000000000001',
      reason: 'harassment',
      note: null,
      appVersion: null,
      buildNumber: null,
    },
    repository({
      resolveTarget: async () => ({
        reportedUserId: '10000000-0000-0000-0000-000000000002',
        reportedPersonId: null,
        snapshot: { type: 'checkin_reply', relationshipBoundary: 'same_household' },
        followup: { kind: 'household_help', reporterRole: 'child' },
      }),
    }),
  );

  assertEquals(result.followup, { kind: 'household_help', reporterRole: 'child' });
});

Deno.test('report submission accepts an accountless Household person resolved by the server', async () => {
  const result = await submitUgcReport(
    '10000000-0000-0000-0000-000000000001',
    {
      targetKind: 'household_member',
      targetId: '20000000-0000-0000-0000-000000000001',
      reason: 'privacy',
      note: null,
      appVersion: null,
      buildNumber: null,
    },
    repository({
      resolveTarget: async () => ({
        reportedUserId: null,
        reportedPersonId: '40000000-0000-0000-0000-000000000002',
        snapshot: { relationshipBoundary: 'same_household', reportedRole: 'child' },
        followup: { kind: 'manage_household', reporterRole: 'owner' },
      }),
    }),
  );
  assertEquals(result.followup, { kind: 'manage_household', reporterRole: 'owner' });
});

Deno.test('report submission preserves an authorized guest Meal response without inventing an account', async () => {
  let inserted: Record<string, unknown> | null = null;
  const receipt = await submitUgcReport('reporter-user', {
    targetKind: 'guest_meal_feedback',
    targetId: '20000000-0000-0000-0000-000000000001',
    reason: 'harassment',
    note: null,
    appVersion: null,
    buildNumber: null,
  }, {
    async resolveTarget() {
      return {
        reportedUserId: null,
        reportedPersonId: null,
        snapshot: { relationshipBoundary: 'guest_invite', suggestion: 'Nobody wants you here.' },
        followup: { kind: 'guest_scope' },
      };
    },
    async insert(row) { inserted = row; return { id: 'report-guest' }; },
    async alert() {},
  }, () => '2026-09-03T12:00:00.000Z');

  assertEquals(receipt.followup, { kind: 'guest_scope' });
  const stored = inserted as Record<string, unknown> | null;
  assertEquals(stored && stored.reported_user_id, null);
  assertEquals(stored && stored.reported_person_id, null);
});

Deno.test('safety follow-up distinguishes peers, managed children, and caregivers', () => {
  assertEquals(chooseSafetyFollowup([], []), {
    followup: { kind: 'peer_block' },
    relationshipBoundary: 'peer',
  });
  assertEquals(
    chooseSafetyFollowup(
      [{ householdId: 'household-1', role: 'child' }],
      [{ householdId: 'household-1', role: 'owner' }],
    ),
    {
      followup: { kind: 'household_help', reporterRole: 'child' },
      relationshipBoundary: 'same_household',
    },
  );
  assertEquals(
    chooseSafetyFollowup(
      [{ householdId: 'household-1', role: 'caregiver' }],
      [{ householdId: 'household-1', role: 'child' }],
    ),
    {
      followup: { kind: 'manage_household', reporterRole: 'caregiver' },
      relationshipBoundary: 'same_household',
    },
  );
});

Deno.test('report submission rejects self and inaccessible targets', async () => {
  await assertRejects(
    () => submitUgcReport(
      '10000000-0000-0000-0000-000000000001',
      {
        targetKind: 'user',
        targetId: '10000000-0000-0000-0000-000000000001',
        reason: 'other',
        note: null,
        appVersion: null,
        buildNumber: null,
      },
      repository({ resolveTarget: async () => null }),
    ),
    UgcReportError,
    'report_target_unavailable',
  );
});

Deno.test('operator alert failure does not lose persisted intake', async () => {
  const result = await submitUgcReport(
    '10000000-0000-0000-0000-000000000001',
    {
      targetKind: 'shared_delivery',
      targetId: '20000000-0000-0000-0000-000000000001',
      reason: 'spam_or_scam',
      note: null,
      appVersion: null,
      buildNumber: null,
    },
    repository({ alert: async () => { throw new Error('mail unavailable'); } }),
  );
  assertEquals(result.status, 'submitted');
});
