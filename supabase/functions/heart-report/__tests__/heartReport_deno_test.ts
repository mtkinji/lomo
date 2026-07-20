import {
  buildHeartReport,
  renderHeartReportHtml,
  renderHeartReportText,
  resolveHeartReportExclusions,
  type HeartReportMetrics,
} from '../../_shared/heartReport.ts';

function assertEquals<T>(actual: T, expected: T) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(actual: string, expected: string) {
  if (!actual.includes(expected)) {
    throw new Error(`Expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}`);
  }
}

const sparseMetrics: HeartReportMetrics = {
  asOf: '2026-07-19T15:00:00.000Z',
  periodStart: '2026-07-12T15:00:00.000Z',
  excludedAccounts: 5,
  excludedInstalls: 31,
  externalAccountsTotal: 39,
  happiness: { responses28d: 2, positive28d: 2 },
  engagement: {
    activeUsers7d: 1,
    previousActiveUsers7d: 3,
    activitiesCreated7d: 25,
    activitiesCompleted7d: 18,
    aiActors7d: 1,
    aiRequests7d: 22,
  },
  adoption: {
    newAccounts7d: 0,
    previousNewAccounts7d: 1,
    activatedNewAccounts28d: 2,
    newAccounts28d: 7,
  },
  retention: { eligibleUsers28d: 3, returnedUsers7d: 1 },
  taskSuccess: {
    activitiesCreated28d: 10,
    activitiesCompletedWithin7d: 7,
    aiRequests28d: 100,
    aiSuccessfulRequests28d: 95,
  },
};

Deno.test('HEART report refuses to overclaim success for a sparse external cohort', () => {
  const report = buildHeartReport(sparseMetrics);

  assertEquals(report.overall.status, 'too_early');
  assertEquals(report.dimensions.happiness.status, 'insufficient_data');
  assertEquals(report.dimensions.engagement.status, 'watch');
  assertEquals(report.dimensions.adoption.status, 'concern');
  assertEquals(report.dimensions.retention.status, 'watch');
  assertEquals(report.dimensions.taskSuccess.status, 'healthy');
});

Deno.test('HEART report handles zero denominators without inventing percentages', () => {
  const report = buildHeartReport({
    ...sparseMetrics,
    happiness: { responses28d: 0, positive28d: 0 },
    adoption: {
      ...sparseMetrics.adoption,
      activatedNewAccounts28d: 0,
      newAccounts28d: 0,
    },
    retention: { eligibleUsers28d: 0, returnedUsers7d: 0 },
    taskSuccess: {
      activitiesCreated28d: 0,
      activitiesCompletedWithin7d: 0,
      aiRequests28d: 0,
      aiSuccessfulRequests28d: 0,
    },
  });

  assertEquals(report.dimensions.happiness.primaryValue, null);
  assertEquals(report.dimensions.adoption.primaryValue, null);
  assertEquals(report.dimensions.retention.primaryValue, null);
  assertEquals(report.dimensions.taskSuccess.primaryValue, null);
});

Deno.test('HEART email makes founder exclusion and measurement gaps explicit', () => {
  const report = buildHeartReport(sparseMetrics);
  const text = renderHeartReportText(report);
  const html = renderHeartReportHtml(report);

  assertIncludes(text, 'Founder/test data excluded: 5 accounts, 31 installs');
  assertIncludes(text, 'Happiness: Not measurable yet');
  assertIncludes(text, 'Too early to declare product success');
  assertIncludes(html, 'Google HEART');
  assertIncludes(html, 'Founder/test data excluded');
});

Deno.test('HEART cohort excludes founder accounts, linked test identities, and automated accounts', () => {
  const exclusions = resolveHeartReportExclusions({
    users: [
      { id: 'founder', email: 'founder@example.com' },
      { id: 'linked-test', email: 'temporary@example.com' },
      { id: 'automated', email: 'kwilt-budget-e2e-123@kwilt.app' },
      { id: 'customer', email: 'customer@example.com' },
    ],
    identities: [
      { userId: 'founder', installId: 'founder-device' },
      { userId: 'linked-test', installId: 'founder-device' },
      { userId: 'customer', installId: 'customer-device' },
    ],
    founderEmails: ['FOUNDER@example.com'],
  });

  assertEquals(exclusions.userIds.sort(), ['automated', 'founder', 'linked-test']);
  assertEquals(exclusions.installIds, ['founder-device']);
});
