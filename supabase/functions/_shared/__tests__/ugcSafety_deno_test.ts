import { assertEquals, assertThrows } from 'jsr:@std/assert@1';
import {
  buildModerationIntake,
  moderateSharedText,
  parseUgcReportRequest,
} from '../ugcSafety.ts';

Deno.test('report intake accepts a bounded contextual report', () => {
  const parsed = parseUgcReportRequest({
    targetKind: 'shared_delivery',
    targetId: '20000000-0000-0000-0000-000000000001',
    reason: 'harassment',
    note: 'This message keeps targeting me.',
    appVersion: '1.0.78',
    buildNumber: '120',
  });

  assertEquals(parsed, {
    targetKind: 'shared_delivery',
    targetId: '20000000-0000-0000-0000-000000000001',
    reason: 'harassment',
    note: 'This message keeps targeting me.',
    appVersion: '1.0.78',
    buildNumber: '120',
  });
});

Deno.test('report intake accepts a canonical Household member target', () => {
  assertEquals(parseUgcReportRequest({
    targetKind: 'household_member',
    targetId: '20000000-0000-0000-0000-000000000001',
    reason: 'privacy',
  }).targetKind, 'household_member');
});

Deno.test('report intake accepts Meal Plan reaction and guest response targets', () => {
  for (const targetKind of ['meal_reaction', 'guest_meal_feedback'] as const) {
    const parsed = parseUgcReportRequest({
      targetKind,
      targetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      reason: 'harassment',
    });
    assertEquals(parsed.targetKind, targetKind);
  }
});

Deno.test('report intake rejects invented kinds, self reports, and unbounded notes', () => {
  assertThrows(() => parseUgcReportRequest({ targetKind: 'chat', targetId: 'x', reason: 'other' }));
  assertThrows(() => parseUgcReportRequest({ targetKind: 'user', targetId: 'not-a-uuid', reason: 'other' }));
  assertThrows(() => parseUgcReportRequest({
    targetKind: 'user',
    targetId: '20000000-0000-0000-0000-000000000001',
    reason: 'other',
    note: 'x'.repeat(501),
  }));
});

Deno.test('shared text filter blocks high confidence abuse and allows ordinary hard-life language', () => {
  assertEquals(moderateSharedText('You should kill yourself.'), {
    allowed: false,
    code: 'targeted_self_harm_abuse',
  });
  assertEquals(moderateSharedText('I struggled today and could use some encouragement.'), {
    allowed: true,
    normalizedText: 'I struggled today and could use some encouragement.',
  });
  assertEquals(moderateSharedText('My depression has been difficult this week.'), {
    allowed: true,
    normalizedText: 'My depression has been difficult this week.',
  });
});

Deno.test('moderation intake assigns urgent response windows without trusting client priority', () => {
  const intake = buildModerationIntake({
    reporterUserId: '10000000-0000-0000-0000-000000000001',
    reportedUserId: '10000000-0000-0000-0000-000000000002',
    reportedPersonId: null,
    targetKind: 'goal_feed_event',
    targetId: '20000000-0000-0000-0000-000000000001',
    reason: 'violence_or_threat',
    note: null,
    snapshot: { type: 'checkin_reply', text: 'I will hurt you.' },
    submittedAt: '2026-09-03T12:00:00.000Z',
    appVersion: null,
    buildNumber: null,
  });

  assertEquals(intake.priority, 'urgent');
  assertEquals(intake.response_due_at, '2026-09-03T16:00:00.000Z');
  assertEquals(intake.snapshot, { type: 'checkin_reply', text: 'I will hurt you.' });
});
